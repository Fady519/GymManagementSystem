using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.DTOs.Plans;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>Membership plans (e.g. Basic, Premium) that members can subscribe to.</summary>
    [Route("api/plans")]
    public sealed class PlansController(IPlanService planService) : ApiControllerBase
    {
        /// <summary>Lists plans, cheapest first.</summary>
        /// <param name="isActive">Optional filter: true = active only, false = inactive only.</param>
        /// <param name="ct">Cancellation token.</param>
        [HttpGet]
        [ProducesResponseType<IReadOnlyList<PlanResponse>>(StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<PlanResponse>>> GetAll([FromQuery] bool? isActive, CancellationToken ct)
            => Ok(await planService.GetAllAsync(isActive, ct));

        /// <summary>Gets a single plan.</summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType<PlanResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<PlanResponse>> GetById(int id, CancellationToken ct)
        {
            var result = await planService.GetByIdAsync(id, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Creates a new plan. New plans are active by default.</summary>
        [HttpPost]
        [ProducesResponseType<PlanResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<PlanResponse>> Create(CreatePlanRequest request, CancellationToken ct)
        {
            var result = await planService.CreateAsync(request, ct);

            return result.IsSuccess
                ? CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value)
                : Problem(result.Error);
        }

        /// <summary>Updates a plan. Existing memberships keep the price/duration they were bought with.</summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType<PlanResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<PlanResponse>> Update(int id, UpdatePlanRequest request, CancellationToken ct)
        {
            var result = await planService.UpdateAsync(id, request, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Activates or deactivates a plan. Inactive plans can't be used for new memberships.</summary>
        [HttpPatch("{id:int}/status")]
        [ProducesResponseType<PlanResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<PlanResponse>> SetStatus(int id, SetPlanStatusRequest request, CancellationToken ct)
        {
            var result = await planService.SetStatusAsync(id, request.IsActive, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Soft-deletes a plan. Blocked (409) while the plan has active memberships; deactivate it instead.</summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var result = await planService.DeleteAsync(id, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }
    }
}
