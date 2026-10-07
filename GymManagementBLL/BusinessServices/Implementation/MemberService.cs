using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Common;
using GymManagementBLL.DTOs.Members;
using GymManagementBLL.Errors;
using GymManagementBLL.Mapping;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.EntityFrameworkCore;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class MemberService : IMemberService
    {
        /// <summary>Sub-folder of the uploads folder where member photos are stored.</summary>
        public const string PhotoFolder = "members";

        private readonly IUnitOfWork _unitOfWork;
        private readonly IUserService _userService;
        private readonly IFileStorage _fileStorage;
        private readonly IClock _clock;

        public MemberService(IUnitOfWork unitOfWork, IUserService userService, IFileStorage fileStorage, IClock clock)
        {
            _unitOfWork = unitOfWork;
            _userService = userService;
            _fileStorage = fileStorage;
            _clock = clock;
        }

        public async Task<PagedResult<MemberListItem>> GetAllAsync(MemberQuery query, CancellationToken ct = default)
        {
            var now = _clock.UtcNow;
            var members = _unitOfWork.GetRepository<Member>().Query();

            // ---- Search & filters (all translated to SQL WHERE) ----
            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var term = query.Search.Trim();
                members = members.Where(m => m.Name.Contains(term) || m.Email.Contains(term) || m.Phone.Contains(term));
            }

            if (query.Gender is not null)
                members = members.Where(m => m.Gender == query.Gender);

            // The state is not a column, so each filter describes it with the member's memberships.
            // A "running" membership = not cancelled and not ended yet.
            // "Frozen now" = Status is Frozen and FrozenUntil is still in the future (a freeze ends by itself).
            members = query.MembershipState switch
            {
                MemberMembershipState.Active => members.Where(m =>
                    m.Memberships.Any(x => x.Status != MembershipStatus.Cancelled && x.StartDate <= now && x.EndDate > now
                                           && !(x.Status == MembershipStatus.Frozen && x.FrozenUntil > now))),

                MemberMembershipState.Frozen => members.Where(m =>
                    !m.Memberships.Any(x => x.Status != MembershipStatus.Cancelled && x.StartDate <= now && x.EndDate > now
                                            && !(x.Status == MembershipStatus.Frozen && x.FrozenUntil > now)) &&
                    m.Memberships.Any(x => x.Status == MembershipStatus.Frozen && x.FrozenUntil > now && x.EndDate > now)),

                MemberMembershipState.Expired => members.Where(m =>
                    !m.Memberships.Any(x => x.Status != MembershipStatus.Cancelled && x.EndDate > now) &&
                    m.Memberships.Any(x => x.Status != MembershipStatus.Cancelled)),

                MemberMembershipState.None => members.Where(m =>
                    !m.Memberships.Any(x => x.Status != MembershipStatus.Cancelled)),

                _ => members
            };

            // ---- Sorting (Id is a tie-breaker so pages are stable) ----
            members = (query.SortBy, query.Descending) switch
            {
                (MemberSortBy.Name, false) => members.OrderBy(m => m.Name).ThenBy(m => m.Id),
                (MemberSortBy.Name, true) => members.OrderByDescending(m => m.Name).ThenByDescending(m => m.Id),
                (_, false) => members.OrderBy(m => m.CreatedAt).ThenBy(m => m.Id),
                _ => members.OrderByDescending(m => m.CreatedAt).ThenByDescending(m => m.Id),
            };

            var page = await members
                .Select(m => new MemberListItem(
                    m.Id, m.Name, m.Email, m.Phone, m.Gender,
                    m.Photo, // file name for now; turned into a URL below
                    m.Memberships.Any(x => x.Status != MembershipStatus.Cancelled && x.StartDate <= now && x.EndDate > now
                                           && !(x.Status == MembershipStatus.Frozen && x.FrozenUntil > now)) ? MemberMembershipState.Active
                    : m.Memberships.Any(x => x.Status == MembershipStatus.Frozen && x.FrozenUntil > now && x.EndDate > now) ? MemberMembershipState.Frozen
                    : m.Memberships.Any(x => x.Status != MembershipStatus.Cancelled) ? MemberMembershipState.Expired
                    : MemberMembershipState.None,
                    m.CreatedAt))
                .ToPagedResultAsync(query.Page, query.PageSize, ct);

            var items = page.Items.Select(i => i with { PhotoUrl = PhotoUrl(i.PhotoUrl) }).ToList();
            return page with { Items = items };
        }

        public async Task<Result<MemberResponse>> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var member = await _unitOfWork.GetRepository<Member>().Query()
                .Include(m => m.HealthRecord)
                .FirstOrDefaultAsync(m => m.Id == id, ct);

            if (member is null)
                return MemberErrors.NotFound(id);

            return member.ToResponse(PhotoUrl(member.Photo), await GetStateAsync(id, ct));
        }

        public async Task<Result<MemberResponse>> CreateAsync(CreateMemberRequest request, CancellationToken ct = default)
        {
            var email = NormalizeEmail(request.Email);
            var phone = request.Phone.Trim();

            var unique = await CheckUniqueAsync(null, email, phone, ct);
            if (unique.IsFailure)
                return unique.Error;

            var member = new Member
            {
                Name = request.Name.Trim(),
                Email = email,
                Phone = phone,
                DateOfBirth = request.DateOfBirth,
                Gender = request.Gender,
                Address = request.Address.ToEntity(),
            };

            if (request.HealthRecord is not null)
            {
                member.HealthRecord = new HealthRecord();
                request.HealthRecord.CopyTo(member.HealthRecord);
            }

            _unitOfWork.GetRepository<Member>().Add(member);
            await _unitOfWork.SaveChangesAsync(ct);

            return member.ToResponse(photoUrl: null, MemberMembershipState.None);
        }

        public async Task<Result<MemberResponse>> UpdateAsync(int id, UpdateMemberRequest request, CancellationToken ct = default)
        {
            var member = await _unitOfWork.GetRepository<Member>().GetByIdAsync(id, ct);
            if (member is null)
                return MemberErrors.NotFound(id);

            var email = NormalizeEmail(request.Email);
            var phone = request.Phone.Trim();

            // H6 fix: the old MVC code returned "false" for a duplicate; now it's a clear 409.
            var unique = await CheckUniqueAsync(id, email, phone, ct);
            if (unique.IsFailure)
                return unique.Error;

            await using var transaction = await _unitOfWork.BeginTransactionAsync(ct);

            // A member who registered online logs in with this email, so keep the account in sync.
            if (member.UserId is not null)
            {
                var synced = await _userService.UpdateAccountProfileAsync(member.UserId.Value, email, request.Name, ct);
                if (synced.IsFailure)
                    return synced.Error == UserErrors.EmailTaken ? MemberErrors.EmailTaken : synced.Error;
            }

            member.Name = request.Name.Trim();
            member.Email = email;
            member.Phone = phone;
            member.DateOfBirth = request.DateOfBirth;
            member.Gender = request.Gender;
            member.Address = request.Address.ToEntity();

            await _unitOfWork.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            return await GetByIdAsync(id, ct);
        }

        public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
        {
            var repo = _unitOfWork.GetRepository<Member>();
            var member = await repo.GetByIdAsync(id, ct);

            if (member is null)
                return MemberErrors.NotFound(id);

            var now = _clock.UtcNow;

            if (await _unitOfWork.GetRepository<Membership>()
                    .AnyAsync(x => x.MemberId == id && x.Status != MembershipStatus.Cancelled && x.EndDate > now, ct))
                return MemberErrors.HasActiveMembership;

            if (await _unitOfWork.GetRepository<Booking>()
                    .AnyAsync(b => b.MemberId == id
                                   && b.Status == BookingStatus.Booked
                                   && b.Session.Status == SessionStatus.Scheduled
                                   && b.Session.StartDate > now, ct))
                return MemberErrors.HasUpcomingBookings;

            // Soft delete: history (memberships, payments, attendance) stays for reports.
            // The photo is kept too, in case the member is restored.
            repo.Remove(member);
            await _unitOfWork.SaveChangesAsync(ct);

            if (member.UserId is not null)
                await _userService.DeactivateAccountAsync(member.UserId.Value, ct);

            return Result.Success();
        }

        public async Task<Result<HealthRecordDto>> SaveHealthRecordAsync(int id, HealthRecordDto request, CancellationToken ct = default)
        {
            var member = await _unitOfWork.GetRepository<Member>().Query(asTracking: true)
                .Include(m => m.HealthRecord)
                .FirstOrDefaultAsync(m => m.Id == id, ct);

            if (member is null)
                return MemberErrors.NotFound(id);

            member.HealthRecord ??= new HealthRecord();
            request.CopyTo(member.HealthRecord);

            await _unitOfWork.SaveChangesAsync(ct);

            return member.HealthRecord.ToDto()!;
        }

        public async Task<Result<MemberResponse>> SetPhotoAsync(int id, Stream content, long length, CancellationToken ct = default)
        {
            if (length == 0)
                return FileErrors.Empty;

            if (length > ImageFile.MaxSizeBytes)
                return FileErrors.TooLarge(ImageFile.MaxSizeMb);

            var member = await _unitOfWork.GetRepository<Member>().GetByIdAsync(id, ct);
            if (member is null)
                return MemberErrors.NotFound(id);

            // Max 2 MB, so reading it into memory is fine. We need the first bytes to detect the type.
            using var buffer = new MemoryStream();
            await content.CopyToAsync(buffer, ct);

            var extension = ImageFile.DetectExtension(buffer.GetBuffer().AsSpan(0, (int)Math.Min(buffer.Length, 16)));
            if (extension is null)
                return FileErrors.NotAnImage;

            buffer.Position = 0;
            var fileName = await _fileStorage.SaveAsync(buffer, PhotoFolder, extension, ct);

            var oldPhoto = member.Photo;
            member.Photo = fileName;
            await _unitOfWork.SaveChangesAsync(ct);

            // Delete the old file only after the database points to the new one.
            if (oldPhoto is not null)
                await _fileStorage.DeleteAsync(PhotoFolder, oldPhoto, ct);

            return await GetByIdAsync(id, ct);
        }

        public async Task<Result> DeletePhotoAsync(int id, CancellationToken ct = default)
        {
            var member = await _unitOfWork.GetRepository<Member>().GetByIdAsync(id, ct);
            if (member is null)
                return MemberErrors.NotFound(id);

            if (member.Photo is not null)
            {
                var oldPhoto = member.Photo;
                member.Photo = null;
                await _unitOfWork.SaveChangesAsync(ct);
                await _fileStorage.DeleteAsync(PhotoFolder, oldPhoto, ct);
            }

            return Result.Success();
        }

        #region Helper Methods

        private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

        private string? PhotoUrl(string? fileName)
            => fileName is null ? null : _fileStorage.GetPublicUrl(PhotoFolder, fileName);

        private async Task<MemberMembershipState> GetStateAsync(int memberId, CancellationToken ct)
        {
            var now = _clock.UtcNow;
            var memberships = await _unitOfWork.GetRepository<Membership>()
                .ListAsync(x => x.MemberId == memberId && x.Status != MembershipStatus.Cancelled, ct);

            // In C# (not SQL) here: the member's memberships are already loaded.
            bool IsFrozenNow(Membership x) => x.Status == MembershipStatus.Frozen && x.FrozenUntil > now;

            if (memberships.Any(x => x.StartDate <= now && x.EndDate > now && !IsFrozenNow(x)))
                return MemberMembershipState.Active;

            if (memberships.Any(x => x.EndDate > now && IsFrozenNow(x)))
                return MemberMembershipState.Frozen;

            return memberships.Count > 0 ? MemberMembershipState.Expired : MemberMembershipState.None;
        }

        /// <param name="memberId">null when creating; the member's own id when updating.</param>
        private async Task<Result> CheckUniqueAsync(int? memberId, string email, string phone, CancellationToken ct)
        {
            var members = _unitOfWork.GetRepository<Member>();

            if (await members.AnyAsync(m => m.Id != memberId && m.Email == email, ct))
                return MemberErrors.EmailTaken;

            if (await members.AnyAsync(m => m.Id != memberId && m.Phone == phone, ct))
                return MemberErrors.PhoneTaken;

            return Result.Success();
        }

        #endregion
    }
}
