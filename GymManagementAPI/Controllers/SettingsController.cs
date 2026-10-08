using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.DTOs.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>Gym settings shown on the public website (admins only). The website reads them from GET /api/public/gym.</summary>
    [Route("api/settings")]
    [Authorize(Policy = AppPolicies.AdminAccess)]
    public sealed class SettingsController(IGymSettingsService gymSettingsService) : ApiControllerBase
    {
        /// <summary>Gets the gym's details for the "Gym settings" page.</summary>
        [HttpGet("gym")]
        [ProducesResponseType<GymSettingsResponse>(StatusCodes.Status200OK)]
        public async Task<ActionResult<GymSettingsResponse>> GetGym(CancellationToken ct)
            => Ok(await gymSettingsService.GetAsync(ct));

        /// <summary>
        /// Replaces the gym's details. Texts are trimmed and empty optional texts are saved as null.
        /// Links must be https; closing time must be after opening time; send both Friday times or neither (closed).
        /// </summary>
        [HttpPut("gym")]
        [ProducesResponseType<GymSettingsResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<GymSettingsResponse>> UpdateGym(UpdateGymSettingsRequest request, CancellationToken ct)
        {
            var result = await gymSettingsService.UpdateAsync(request, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }
    }
}
