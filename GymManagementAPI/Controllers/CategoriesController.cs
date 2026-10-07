using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.DTOs.Categories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>Session categories / trainer specialities (e.g. Yoga, Boxing).</summary>
    /// <remarks>Anyone can read them (public website); only admins can change them.</remarks>
    [Route("api/categories")]
    [Authorize(Policy = AppPolicies.AdminAccess)]
    public sealed class CategoriesController(ICategoryService categoryService) : ApiControllerBase
    {
        /// <summary>Lists categories by name, with how many trainers each has.</summary>
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType<IReadOnlyList<CategoryResponse>>(StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<CategoryResponse>>> GetAll(CancellationToken ct)
            => Ok(await categoryService.GetAllAsync(ct));

        /// <summary>Gets one category.</summary>
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType<CategoryResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<CategoryResponse>> GetById(int id, CancellationToken ct)
        {
            var result = await categoryService.GetByIdAsync(id, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Creates a category. The name must be unique.</summary>
        [HttpPost]
        [ProducesResponseType<CategoryResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<CategoryResponse>> Create(SaveCategoryRequest request, CancellationToken ct)
        {
            var result = await categoryService.CreateAsync(request, ct);

            return result.IsSuccess
                ? CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value)
                : Problem(result.Error);
        }

        /// <summary>Renames a category.</summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType<CategoryResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<CategoryResponse>> Update(int id, SaveCategoryRequest request, CancellationToken ct)
        {
            var result = await categoryService.UpdateAsync(id, request, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Soft-deletes a category. Blocked (409) while trainers or upcoming sessions use it.</summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var result = await categoryService.DeleteAsync(id, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }
    }
}
