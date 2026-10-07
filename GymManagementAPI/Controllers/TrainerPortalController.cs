using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Sessions;
using GymManagementBLL.DTOs.Trainers;
using GymManagementBLL.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>
    /// Trainer portal ("my sessions"). The trainer id always comes from the access token,
    /// so a trainer only ever sees and manages their own sessions.
    /// </summary>
    [Route("api/trainer")]
    [Authorize(Policy = AppPolicies.TrainerOnly)]
    public sealed class TrainerPortalController : ApiControllerBase
    {
        /// <summary>My trainer profile.</summary>
        [HttpGet("me")]
        [ProducesResponseType<TrainerResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<ActionResult<TrainerResponse>> GetProfile([FromServices] ITrainerService trainerService, CancellationToken ct)
        {
            if (CurrentUser.TrainerId is not int trainerId)
                return Problem(AuthErrors.NotATrainer);

            var result = await trainerService.GetByIdAsync(trainerId, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>My sessions, with the same filters as /api/sessions (state, from, to, category, paging).</summary>
        [HttpGet("sessions")]
        [ProducesResponseType<PagedResult<SessionResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        public async Task<ActionResult<PagedResult<SessionResponse>>> GetSessions([FromQuery] SessionQuery query,
            [FromServices] ISessionService sessionService, CancellationToken ct)
        {
            if (CurrentUser.TrainerId is not int trainerId)
                return Problem(AuthErrors.NotATrainer);

            // Whatever trainerId was sent in the URL is replaced by the one from the token.
            query.TrainerId = trainerId;
            return Ok(await sessionService.GetAllAsync(query, ct));
        }

        /// <summary>The members booked in one of my sessions (403 for another trainer's session).</summary>
        [HttpGet("sessions/{id:int}/bookings")]
        [ProducesResponseType<IReadOnlyList<SessionBookingItem>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<IReadOnlyList<SessionBookingItem>>> GetSessionBookings(int id,
            [FromServices] ISessionService sessionService, CancellationToken ct)
        {
            if (CurrentUser.TrainerId is null)
                return Problem(AuthErrors.NotATrainer);

            var result = await sessionService.GetBookingsAsync(id, CurrentUser, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Marks a member as attended, only while my session is running.</summary>
        [HttpPost("bookings/{id:int}/attend")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<IActionResult> MarkAttended(int id, [FromServices] IBookingService bookingService, CancellationToken ct)
        {
            if (CurrentUser.TrainerId is null)
                return Problem(AuthErrors.NotATrainer);

            var result = await bookingService.MarkAttendedAsync(id, CurrentUser, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }
    }
}
