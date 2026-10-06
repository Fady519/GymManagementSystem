using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>Login accounts management (SuperAdmin only).</summary>
    [Route("api/users")]
    [Authorize(Policy = AppPolicies.SuperAdminOnly)]
    public sealed class UsersController(IUserService userService) : ApiControllerBase
    {
        /// <summary>Lists accounts, ordered by email.</summary>
        /// <param name="search">Part of the email or name.</param>
        /// <param name="role">SuperAdmin, Admin, Trainer or Member.</param>
        /// <param name="page">Page number (starts at 1).</param>
        /// <param name="pageSize">Items per page (max 100).</param>
        /// <param name="ct">Cancellation token.</param>
        [HttpGet]
        [ProducesResponseType<PagedResult<UserResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<PagedResult<UserResponse>>> GetAll(
            [FromQuery] string? search, [FromQuery] string? role,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        {
            var result = await userService.GetAllAsync(search, role, page, pageSize, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Gets one account.</summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<UserResponse>> GetById(int id, CancellationToken ct)
        {
            var result = await userService.GetByIdAsync(id, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Creates an Admin account with a temporary password (shown only in this response).</summary>
        [HttpPost("admins")]
        [ProducesResponseType<CreatedUserResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<CreatedUserResponse>> CreateAdmin(CreateAdminRequest request, CancellationToken ct)
        {
            var result = await userService.CreateAdminAsync(request, ct);

            return result.IsSuccess
                ? CreatedAtAction(nameof(GetById), new { id = result.Value.User.Id }, result.Value)
                : Problem(result.Error);
        }

        /// <summary>Enables or disables an account. Disabling signs the user out of all devices.</summary>
        [HttpPatch("{id:int}/status")]
        [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<UserResponse>> SetStatus(int id, SetUserStatusRequest request, CancellationToken ct)
        {
            var result = await userService.SetStatusAsync(id, request.IsActive, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }
    }
}
