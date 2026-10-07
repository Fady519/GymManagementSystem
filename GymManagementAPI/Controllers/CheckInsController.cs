using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.CheckIns;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>QR check-in at the reception (admins only) and the check-ins log.</summary>
    [Route("api/check-ins")]
    [Authorize(Policy = AppPolicies.AdminAccess)]
    public sealed class CheckInsController(ICheckInService checkInService) : ApiControllerBase
    {
        /// <summary>
        /// Scans a member's QR code. Always 200 for a known code: check "result" (Allowed / Denied) and
        /// "denyReason". Only one allowed check-in per member per day. Unknown code = 404 CheckIn.UnknownCode.
        /// </summary>
        [HttpPost]
        [ProducesResponseType<CheckInResultResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<CheckInResultResponse>> CheckIn(CheckInRequest request, CancellationToken ct)
        {
            var result = await checkInService.CheckInAsync(request, CurrentUserId, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>The check-ins log, newest first. from/to are gym-local days (inclusive).</summary>
        [HttpGet]
        [ProducesResponseType<PagedResult<CheckInResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<PagedResult<CheckInResponse>>> GetAll([FromQuery] CheckInQuery query, CancellationToken ct)
            => Ok(await checkInService.GetAllAsync(query, ct));
    }
}
