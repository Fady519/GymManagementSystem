using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.DTOs.Public;
using GymManagementBLL.DTOs.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>Data for the public website (landing page). No login needed.</summary>
    /// <remarks>Only public information: trainer cards have no email, phone, birth date or address.</remarks>
    [Route("api/public")]
    [AllowAnonymous]
    public sealed class PublicController(IGymSettingsService gymSettingsService, IPublicSiteService publicSiteService) : ApiControllerBase
    {
        /// <summary>The gym's name, contact details, bilingual address, links and opening hours.</summary>
        [HttpGet("gym")]
        [ProducesResponseType<GymSettingsResponse>(StatusCodes.Status200OK)]
        public async Task<ActionResult<GymSettingsResponse>> GetGym(CancellationToken ct)
            => Ok(await gymSettingsService.GetAsync(ct));

        /// <summary>The numbers on the landing page: active members, trainers, programs, classes in the next 7 days and the "from" monthly price.</summary>
        [HttpGet("stats")]
        [ProducesResponseType<PublicStatsResponse>(StatusCodes.Status200OK)]
        public async Task<ActionResult<PublicStatsResponse>> GetStats(CancellationToken ct)
            => Ok(await publicSiteService.GetStatsAsync(ct));

        /// <summary>Trainer cards (name, speciality, upcoming classes), busiest trainers first.</summary>
        [HttpGet("trainers")]
        [ProducesResponseType<IReadOnlyList<PublicTrainerResponse>>(StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<PublicTrainerResponse>>> GetTrainers(CancellationToken ct)
            => Ok(await publicSiteService.GetTrainersAsync(ct));
    }
}
