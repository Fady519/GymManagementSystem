using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.DTOs.Bookings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>Booking members into sessions, cancelling and marking attendance.</summary>
    /// <remarks>Policies are set per action because each action allows different roles.</remarks>
    [Route("api/bookings")]
    public sealed class BookingsController(IBookingService bookingService) : ApiControllerBase
    {
        /// <summary>
        /// Books a session. Admins send the memberId; a member is always booked himself
        /// (from the token). Returns 409 with a code when a rule blocks it (full, no membership...).
        /// </summary>
        [HttpPost]
        [Authorize(Policy = AppPolicies.BookingAccess)]
        [ProducesResponseType<BookingResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<BookingResponse>> Create(CreateBookingRequest request, CancellationToken ct)
        {
            var result = await bookingService.CreateAsync(request, CurrentUser, ct);

            // No GET /api/bookings/{id} yet, so point to the session the booking belongs to.
            return result.IsSuccess
                ? Created($"/api/sessions/{result.Value.SessionId}", result.Value)
                : Problem(result.Error);
        }

        /// <summary>Cancels a booking. Members: until the deadline before the session. Admins: until it starts.</summary>
        [HttpPost("{id:int}/cancel")]
        [Authorize(Policy = AppPolicies.BookingAccess)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<IActionResult> Cancel(int id, CancellationToken ct)
        {
            var result = await bookingService.CancelAsync(id, CurrentUser, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }

        /// <summary>Marks the member as attended. Only while the session is running, by an admin or its trainer.</summary>
        [HttpPost("{id:int}/attend")]
        [Authorize(Policy = AppPolicies.TrainerAccess)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<IActionResult> Attend(int id, CancellationToken ct)
        {
            var result = await bookingService.MarkAttendedAsync(id, CurrentUser, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }
    }
}
