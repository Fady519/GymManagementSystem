using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Bookings;
using GymManagementBLL.DTOs.CheckIns;
using GymManagementBLL.DTOs.Common;
using GymManagementBLL.DTOs.Members;
using GymManagementBLL.DTOs.Memberships;
using GymManagementBLL.DTOs.Payments;
using GymManagementBLL.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>
    /// Member portal ("my data"). There is no id in any URL here: the member id always comes from
    /// the access token, so a member can't ask for someone else's data, even by changing the URL.
    /// </summary>
    [Route("api/me")]
    [Authorize(Policy = AppPolicies.MemberAccess)]
    public sealed class MeController(IMemberService memberService) : ApiControllerBase
    {
        /// <summary>My profile (address, health record, photo, membership state).</summary>
        [HttpGet]
        [ProducesResponseType<MemberResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<ActionResult<MemberResponse>> GetProfile(CancellationToken ct)
        {
            if (CurrentUser.MemberId is not int memberId)
                return Problem(AuthErrors.NotAMember);

            var result = await memberService.GetByIdAsync(memberId, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Updates my phone and address. Name, email and date of birth are changed by the reception.</summary>
        [HttpPut]
        [ProducesResponseType<MemberResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<MemberResponse>> UpdateProfile(UpdateMyProfileRequest request, CancellationToken ct)
        {
            if (CurrentUser.MemberId is not int memberId)
                return Problem(AuthErrors.NotAMember);

            var result = await memberService.UpdateMyProfileAsync(memberId, request, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Adds or replaces my health record.</summary>
        [HttpPut("health-record")]
        [ProducesResponseType<HealthRecordDto>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<ActionResult<HealthRecordDto>> SaveHealthRecord(HealthRecordDto request, CancellationToken ct)
        {
            if (CurrentUser.MemberId is not int memberId)
                return Problem(AuthErrors.NotAMember);

            var result = await memberService.SaveHealthRecordAsync(memberId, request, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Uploads / replaces my photo (JPG, PNG or WEBP, max 2 MB).</summary>
        [HttpPut("photo")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(3 * 1024 * 1024)] // a bit more than 2 MB for the multipart overhead
        [ProducesResponseType<MemberResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<ActionResult<MemberResponse>> SetPhoto(IFormFile photo, CancellationToken ct)
        {
            if (CurrentUser.MemberId is not int memberId)
                return Problem(AuthErrors.NotAMember);

            await using var stream = photo.OpenReadStream();
            var result = await memberService.SetPhotoAsync(memberId, stream, photo.Length, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Removes my photo.</summary>
        [HttpDelete("photo")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<IActionResult> DeletePhoto(CancellationToken ct)
        {
            if (CurrentUser.MemberId is not int memberId)
                return Problem(AuthErrors.NotAMember);

            var result = await memberService.DeletePhotoAsync(memberId, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }

        /// <summary>My memberships (current and past), newest first.</summary>
        [HttpGet("memberships")]
        [ProducesResponseType<IReadOnlyList<MembershipResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<ActionResult<IReadOnlyList<MembershipResponse>>> GetMemberships(
            [FromServices] IMembershipService membershipService, CancellationToken ct)
        {
            if (CurrentUser.MemberId is not int memberId)
                return Problem(AuthErrors.NotAMember);

            // A member has only a few memberships, so one big page is enough.
            var page = await membershipService.GetAllAsync(
                new MembershipQuery { MemberId = memberId, PageSize = PaginationExtensions.MaxPageSize }, ct);
            return Ok(page.Items);
        }

        /// <summary>My payments (purchases, renewals, refunds), newest first.</summary>
        [HttpGet("payments")]
        [ProducesResponseType<IReadOnlyList<PaymentResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<ActionResult<IReadOnlyList<PaymentResponse>>> GetPayments(
            [FromServices] IPaymentService paymentService, CancellationToken ct)
        {
            if (CurrentUser.MemberId is not int memberId)
                return Problem(AuthErrors.NotAMember);

            var result = await paymentService.GetByMemberAsync(memberId, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>My bookings. upcoming=true: only active bookings of sessions that haven't started.</summary>
        [HttpGet("bookings")]
        [ProducesResponseType<PagedResult<MyBookingItem>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<ActionResult<PagedResult<MyBookingItem>>> GetBookings([FromQuery] MyBookingsQuery query,
            [FromServices] IBookingService bookingService, CancellationToken ct)
        {
            if (CurrentUser.MemberId is not int memberId)
                return Problem(AuthErrors.NotAMember);

            return Ok(await bookingService.GetMemberBookingsAsync(memberId, query, ct));
        }

        /// <summary>Books a session for me (needs a valid membership for the session's time).</summary>
        [HttpPost("bookings")]
        [ProducesResponseType<BookingResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<BookingResponse>> Book(BookSessionRequest request,
            [FromServices] IBookingService bookingService, CancellationToken ct)
        {
            if (CurrentUser.MemberId is null)
                return Problem(AuthErrors.NotAMember);

            // Same business rules as the reception's booking; the member id is taken from the token.
            var result = await bookingService.CreateAsync(new CreateBookingRequest(request.SessionId, null), CurrentUser, ct);
            return result.IsSuccess ? StatusCode(StatusCodes.Status201Created, result.Value) : Problem(result.Error);
        }

        /// <summary>Cancels one of my bookings (only before the cancellation deadline).</summary>
        [HttpPost("bookings/{id:int}/cancel")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<IActionResult> CancelBooking(int id, [FromServices] IBookingService bookingService, CancellationToken ct)
        {
            if (CurrentUser.MemberId is null)
                return Problem(AuthErrors.NotAMember);

            // The service checks that the booking belongs to this member (else 403).
            var result = await bookingService.CancelAsync(id, CurrentUser, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }

        /// <summary>My QR check-in code (text). The app draws it as a QR image for the reception scanner.</summary>
        [HttpGet("qr")]
        [ProducesResponseType<CheckInCodeResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<ActionResult<CheckInCodeResponse>> GetQrCode([FromServices] ICheckInService checkInService, CancellationToken ct)
        {
            if (CurrentUser.MemberId is not int memberId)
                return Problem(AuthErrors.NotAMember);

            var result = await checkInService.GetCodeAsync(memberId, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Makes a new QR code (e.g. a screenshot of the old one was shared). The old code stops working at once.</summary>
        [HttpPost("qr/regenerate")]
        [ProducesResponseType<CheckInCodeResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<ActionResult<CheckInCodeResponse>> RegenerateQrCode([FromServices] ICheckInService checkInService, CancellationToken ct)
        {
            if (CurrentUser.MemberId is not int memberId)
                return Problem(AuthErrors.NotAMember);

            var result = await checkInService.RegenerateCodeAsync(memberId, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }
    }
}
