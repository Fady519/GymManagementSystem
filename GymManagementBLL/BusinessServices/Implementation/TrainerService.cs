using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Trainers;
using GymManagementBLL.Errors;
using GymManagementBLL.Mapping;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using GymManagementDAL.UnitOfWorkPattern;
using Microsoft.EntityFrameworkCore;

namespace GymManagementBLL.BusinessServices.Implementation
{
    public class TrainerService : ITrainerService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IUserService _userService;
        private readonly IClock _clock;

        public TrainerService(IUnitOfWork unitOfWork, IUserService userService, IClock clock)
        {
            _unitOfWork = unitOfWork;
            _userService = userService;
            _clock = clock;
        }

        public async Task<PagedResult<TrainerResponse>> GetAllAsync(TrainerQuery query, CancellationToken ct = default)
        {
            var trainers = _unitOfWork.GetRepository<Trainer>().Query();

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var term = query.Search.Trim();
                trainers = trainers.Where(t => t.Name.Contains(term) || t.Email.Contains(term) || t.Phone.Contains(term));
            }

            if (query.CategoryId is not null)
                trainers = trainers.Where(t => t.CategoryId == query.CategoryId);

            // Select runs in SQL (JOIN to Categories); only the needed columns are read.
            return await trainers
                .OrderBy(t => t.Name)
                .Select(t => new TrainerResponse(
                    t.Id, t.Name, t.Email, t.Phone, t.DateOfBirth, t.Gender,
                    t.Address == null ? null : new DTOs.Common.AddressDto(t.Address.BuildingNumber, t.Address.Street, t.Address.City),
                    t.CategoryId, t.Category.Name, t.UserId != null, t.CreatedAt, t.UpdatedAt))
                .ToPagedResultAsync(query.Page, query.PageSize, ct);
        }

        public async Task<Result<TrainerResponse>> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var trainer = await LoadAsync(id, ct);
            return trainer is null ? TrainerErrors.NotFound(id) : trainer.ToResponse();
        }

        public async Task<Result<TrainerWithAccountResponse>> CreateAsync(SaveTrainerRequest request, CancellationToken ct = default)
        {
            var email = NormalizeEmail(request.Email);
            var phone = request.Phone.Trim();

            var check = await CheckUniqueAndCategoryAsync(null, email, phone, request.CategoryId, ct);
            if (check.IsFailure)
                return check.Error;

            // Trainer row + login account must be saved together (all or nothing).
            await using var transaction = await _unitOfWork.BeginTransactionAsync(ct);

            var account = await _userService.CreateAccountAsync(email, request.Name, AppRoles.Trainer, ct);
            if (account.IsFailure)
                return account.Error == UserErrors.EmailTaken ? TrainerErrors.EmailTaken : account.Error;

            var trainer = new Trainer
            {
                Name = request.Name.Trim(),
                Email = email,
                Phone = phone,
                DateOfBirth = request.DateOfBirth,
                Gender = request.Gender,
                CategoryId = request.CategoryId,
                Address = request.Address.ToEntity(),
                UserId = account.Value,
            };

            _unitOfWork.GetRepository<Trainer>().Add(trainer);
            await _unitOfWork.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            // After the commit: a failed email never undoes the trainer (the admin can resend it).
            var invite = await _userService.SendInviteAsync(account.Value, ct);

            var created = (await LoadAsync(trainer.Id, ct))!;
            return new TrainerWithAccountResponse(created.ToResponse(), invite.IsSuccess && invite.Value);
        }

        public async Task<Result<TrainerResponse>> UpdateAsync(int id, SaveTrainerRequest request, CancellationToken ct = default)
        {
            var trainer = await _unitOfWork.GetRepository<Trainer>().GetByIdAsync(id, ct);
            if (trainer is null)
                return TrainerErrors.NotFound(id);

            var email = NormalizeEmail(request.Email);
            var phone = request.Phone.Trim();

            var check = await CheckUniqueAndCategoryAsync(id, email, phone, request.CategoryId, ct);
            if (check.IsFailure)
                return check.Error;

            await using var transaction = await _unitOfWork.BeginTransactionAsync(ct);

            // Keep the login account (email = username) in sync with the profile.
            if (trainer.UserId is not null)
            {
                var synced = await _userService.UpdateAccountProfileAsync(trainer.UserId.Value, email, request.Name, ct);
                if (synced.IsFailure)
                    return synced.Error == UserErrors.EmailTaken ? TrainerErrors.EmailTaken : synced.Error;
            }

            trainer.Name = request.Name.Trim();
            trainer.Email = email;
            trainer.Phone = phone;
            trainer.DateOfBirth = request.DateOfBirth;
            trainer.Gender = request.Gender;
            trainer.CategoryId = request.CategoryId;
            trainer.Address = request.Address.ToEntity();

            await _unitOfWork.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            return (await LoadAsync(id, ct))!.ToResponse();
        }

        public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
        {
            var repo = _unitOfWork.GetRepository<Trainer>();
            var trainer = await repo.GetByIdAsync(id, ct);

            if (trainer is null)
                return TrainerErrors.NotFound(id);

            var now = _clock.UtcNow;
            if (await _unitOfWork.GetRepository<Session>()
                    .AnyAsync(s => s.TrainerId == id && s.Status == SessionStatus.Scheduled && s.StartDate > now, ct))
                return TrainerErrors.HasUpcomingSessions;

            // Soft delete (past sessions keep their trainer), and the trainer can't log in anymore.
            repo.Remove(trainer);
            await _unitOfWork.SaveChangesAsync(ct);

            if (trainer.UserId is not null)
                await _userService.DeactivateAccountAsync(trainer.UserId.Value, ct);

            return Result.Success();
        }

        public async Task<Result<TrainerWithAccountResponse>> CreateAccountAsync(int id, CancellationToken ct = default)
        {
            var trainer = await _unitOfWork.GetRepository<Trainer>().GetByIdAsync(id, ct);
            if (trainer is null)
                return TrainerErrors.NotFound(id);

            int userId;

            if (trainer.UserId is not null)
            {
                // Already has an account: only a pending invite can be resent.
                userId = trainer.UserId.Value;
            }
            else
            {
                await using var transaction = await _unitOfWork.BeginTransactionAsync(ct);

                var account = await _userService.CreateAccountAsync(trainer.Email, trainer.Name, AppRoles.Trainer, ct);
                if (account.IsFailure)
                    return account.Error == UserErrors.EmailTaken ? TrainerErrors.EmailTaken : account.Error;

                trainer.UserId = userId = account.Value;
                await _unitOfWork.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }

            var invite = await _userService.SendInviteAsync(userId, ct);
            if (invite.IsFailure)
                return invite.Error == UserErrors.AlreadyActivated ? TrainerErrors.AlreadyHasAccount : invite.Error;

            var updated = (await LoadAsync(id, ct))!;
            return new TrainerWithAccountResponse(updated.ToResponse(), invite.Value);
        }

        #region Helper Methods

        private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

        /// <summary>Trainer + its category, read-only.</summary>
        private Task<Trainer?> LoadAsync(int id, CancellationToken ct)
            => _unitOfWork.GetRepository<Trainer>().Query()
                .Include(t => t.Category)
                .FirstOrDefaultAsync(t => t.Id == id, ct);

        /// <param name="trainerId">null when creating; the trainer's own id when updating (so it doesn't conflict with itself).</param>
        private async Task<Result> CheckUniqueAndCategoryAsync(int? trainerId, string email, string phone, int categoryId, CancellationToken ct)
        {
            var trainers = _unitOfWork.GetRepository<Trainer>();

            if (await trainers.AnyAsync(t => t.Id != trainerId && t.Email == email, ct))
                return TrainerErrors.EmailTaken;

            if (await trainers.AnyAsync(t => t.Id != trainerId && t.Phone == phone, ct))
                return TrainerErrors.PhoneTaken;

            if (!await _unitOfWork.GetRepository<Category>().AnyAsync(c => c.Id == categoryId, ct))
                return TrainerErrors.CategoryNotFound(categoryId);

            return Result.Success();
        }

        #endregion
    }
}
