using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Trainers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>Gym trainers (admins only).</summary>
    [Route("api/trainers")]
    [Authorize(Policy = AppPolicies.AdminAccess)]
    public sealed class TrainersController(ITrainerService trainerService) : ApiControllerBase
    {
        /// <summary>Lists trainers by name. Search by name/email/phone and filter by category.</summary>
        [HttpGet]
        [ProducesResponseType<PagedResult<TrainerResponse>>(StatusCodes.Status200OK)]
        public async Task<ActionResult<PagedResult<TrainerResponse>>> GetAll([FromQuery] TrainerQuery query, CancellationToken ct)
            => Ok(await trainerService.GetAllAsync(query, ct));

        /// <summary>Gets one trainer.</summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType<TrainerResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<TrainerResponse>> GetById(int id, CancellationToken ct)
        {
            var result = await trainerService.GetByIdAsync(id, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Creates a trainer and their login account. The temporary password is shown only in this response.</summary>
        [HttpPost]
        [ProducesResponseType<TrainerWithAccountResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<TrainerWithAccountResponse>> Create(SaveTrainerRequest request, CancellationToken ct)
        {
            var result = await trainerService.CreateAsync(request, ct);

            return result.IsSuccess
                ? CreatedAtAction(nameof(GetById), new { id = result.Value.Trainer.Id }, result.Value)
                : Problem(result.Error);
        }

        /// <summary>Updates a trainer. If they have an account, its email/name are updated too.</summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType<TrainerResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<TrainerResponse>> Update(int id, SaveTrainerRequest request, CancellationToken ct)
        {
            var result = await trainerService.UpdateAsync(id, request, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Soft-deletes a trainer and disables their account. Blocked (409) while they have upcoming sessions.</summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var result = await trainerService.DeleteAsync(id, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }

        /// <summary>Creates a login account for an existing trainer who doesn't have one.</summary>
        [HttpPost("{id:int}/account")]
        [ProducesResponseType<TrainerWithAccountResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<TrainerWithAccountResponse>> CreateAccount(int id, CancellationToken ct)
        {
            var result = await trainerService.CreateAccountAsync(id, ct);

            return result.IsSuccess
                ? CreatedAtAction(nameof(GetById), new { id }, result.Value)
                : Problem(result.Error);
        }
    }
}
