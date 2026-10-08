using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>Gym sessions (classes). The schedule is public; only admins change it.</summary>
    /// <remarks>Policies are set per action: an action-level [Authorize] is ADDED to a controller-level one (both must pass).</remarks>
    [Route("api/sessions")]
    public sealed class SessionsController(ISessionService sessionService) : ApiControllerBase
    {
        /// <summary>
        /// The schedule, with filters (state, date range, trainer, category) and paging.
        /// Each session includes how many places are booked / left.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType<PagedResult<SessionResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<PagedResult<SessionResponse>>> GetAll([FromQuery] SessionQuery query, CancellationToken ct)
            => Ok(await sessionService.GetAllAsync(query, ct));

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType<SessionResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<SessionResponse>> GetById(int id, CancellationToken ct)
        {
            var result = await sessionService.GetByIdAsync(id, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Creates a session. Times are UTC; the trainer must be free and teach this category.</summary>
        [HttpPost]
        [Authorize(Policy = AppPolicies.AdminAccess)]
        [ProducesResponseType<SessionResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<SessionResponse>> Create(SaveSessionRequest request, CancellationToken ct)
        {
            var result = await sessionService.CreateAsync(request, ct);

            return result.IsSuccess
                ? CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value)
                : Problem(result.Error);
        }

        /// <summary>Updates an upcoming session. The capacity can't go below the current bookings.</summary>
        [HttpPut("{id:int}")]
        [Authorize(Policy = AppPolicies.AdminAccess)]
        [ProducesResponseType<SessionResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<SessionResponse>> Update(int id, SaveSessionRequest request, CancellationToken ct)
        {
            var result = await sessionService.UpdateAsync(id, request, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>
        /// Cancels an upcoming session and all its bookings (nothing is deleted).
        /// The reason is saved on the session and emailed to every booked member.
        /// </summary>
        [HttpPost("{id:int}/cancel")]
        [Authorize(Policy = AppPolicies.AdminAccess)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<IActionResult> Cancel(int id, CancelSessionRequest request, CancellationToken ct)
        {
            var result = await sessionService.CancelAsync(id, request, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }

        /// <summary>Deletes an upcoming session that has no bookings (otherwise cancel it).</summary>
        [HttpDelete("{id:int}")]
        [Authorize(Policy = AppPolicies.AdminAccess)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var result = await sessionService.DeleteAsync(id, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }

        /// <summary>The session's bookings (attendance list). Admins, or the session's own trainer.</summary>
        [HttpGet("{id:int}/bookings")]
        [Authorize(Policy = AppPolicies.TrainerAccess)]
        [ProducesResponseType<IReadOnlyList<SessionBookingItem>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<IReadOnlyList<SessionBookingItem>>> GetBookings(int id, CancellationToken ct)
        {
            var result = await sessionService.GetBookingsAsync(id, CurrentUser, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Members who can be booked into this session (for the reception's dropdown, max 50).</summary>
        [HttpGet("{id:int}/available-members")]
        [Authorize(Policy = AppPolicies.AdminAccess)]
        [ProducesResponseType<IReadOnlyList<AvailableMemberItem>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<IReadOnlyList<AvailableMemberItem>>> GetAvailableMembers(int id, [FromQuery] string? search, CancellationToken ct)
        {
            var result = await sessionService.GetAvailableMembersAsync(id, search, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }
    }
}
