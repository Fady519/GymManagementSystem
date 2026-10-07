using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Memberships;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>Memberships: buy, renew, cancel, freeze (admins only, at the reception).</summary>
    /// <remarks>Every action that changes state is a POST (H12 fix: the old app cancelled with a GET link).</remarks>
    [Route("api/memberships")]
    [Authorize(Policy = AppPolicies.AdminAccess)]
    public sealed class MembershipsController(IMembershipService membershipService) : ApiControllerBase
    {
        /// <summary>Lists memberships, newest first. Filter by state (Upcoming/Active/Frozen/Expired/Cancelled), member, or member name/phone.</summary>
        [HttpGet]
        [ProducesResponseType<PagedResult<MembershipResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<PagedResult<MembershipResponse>>> GetAll([FromQuery] MembershipQuery query, CancellationToken ct)
            => Ok(await membershipService.GetAllAsync(query, ct));

        /// <summary>Running memberships that end within N days (default from settings) and were not renewed yet.</summary>
        [HttpGet("expiring-soon")]
        [ProducesResponseType<IReadOnlyList<MembershipResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<IReadOnlyList<MembershipResponse>>> GetExpiringSoon([FromQuery] ExpiringSoonQuery query, CancellationToken ct)
            => Ok(await membershipService.GetExpiringSoonAsync(query, ct));

        /// <summary>One membership with its payments and freezes.</summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType<MembershipDetailsResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<MembershipDetailsResponse>> GetById(int id, CancellationToken ct)
        {
            var result = await membershipService.GetByIdAsync(id, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Sells a membership that starts now. The payment is saved together with it.</summary>
        [HttpPost]
        [ProducesResponseType<MembershipResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<MembershipResponse>> Create(CreateMembershipRequest request, CancellationToken ct)
        {
            var result = await membershipService.CreateAsync(request, CurrentUserId, ct);
            return result.IsSuccess
                ? CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value)
                : Problem(result.Error);
        }

        /// <summary>
        /// Renews (same plan, or another plan if planId is sent). Still running = the new one starts when this one ends;
        /// already ended = it starts now.
        /// </summary>
        [HttpPost("{id:int}/renew")]
        [ProducesResponseType<MembershipResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<MembershipResponse>> Renew(int id, RenewMembershipRequest request, CancellationToken ct)
        {
            var result = await membershipService.RenewAsync(id, request, CurrentUserId, ct);
            return result.IsSuccess
                ? CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value)
                : Problem(result.Error);
        }

        /// <summary>Cancels (the row is kept). Optional refund, saved as a Refund payment.</summary>
        [HttpPost("{id:int}/cancel")]
        [ProducesResponseType<MembershipResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<MembershipResponse>> Cancel(int id, CancelMembershipRequest request, CancellationToken ct)
        {
            var result = await membershipService.CancelAsync(id, request, CurrentUserId, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Freezes from now for N days. The end date moves by N days; bookings during the freeze are cancelled.</summary>
        [HttpPost("{id:int}/freeze")]
        [ProducesResponseType<MembershipResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<MembershipResponse>> Freeze(int id, FreezeMembershipRequest request, CancellationToken ct)
        {
            var result = await membershipService.FreezeAsync(id, request, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Ends the freeze early. The unused days are taken back from the end date.</summary>
        [HttpPost("{id:int}/unfreeze")]
        [ProducesResponseType<MembershipResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<MembershipResponse>> Unfreeze(int id, CancellationToken ct)
        {
            var result = await membershipService.UnfreezeAsync(id, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }
    }
}
