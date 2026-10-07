using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Common;
using GymManagementBLL.DTOs.Members;
using GymManagementBLL.DTOs.Payments;
using GymManagementBLL.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>Gym members (admins only).</summary>
    [Route("api/members")]
    [Authorize(Policy = AppPolicies.AdminAccess)]
    public sealed class MembersController(IMemberService memberService) : ApiControllerBase
    {
        /// <summary>
        /// Lists members with search (name/email/phone), filters (gender, membership state),
        /// sorting and paging. Everything runs in SQL, so it stays fast with thousands of members.
        /// </summary>
        [HttpGet]
        [ProducesResponseType<PagedResult<MemberListItem>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<PagedResult<MemberListItem>>> GetAll([FromQuery] MemberQuery query, CancellationToken ct)
            => Ok(await memberService.GetAllAsync(query, ct));

        /// <summary>Gets one member with address, health record and membership state.</summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType<MemberResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<MemberResponse>> GetById(int id, CancellationToken ct)
        {
            var result = await memberService.GetByIdAsync(id, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Adds a member (reception). The photo is uploaded afterwards with PUT /{id}/photo.</summary>
        [HttpPost]
        [ProducesResponseType<MemberResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<MemberResponse>> Create(CreateMemberRequest request, CancellationToken ct)
        {
            var result = await memberService.CreateAsync(request, ct);

            return result.IsSuccess
                ? CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value)
                : Problem(result.Error);
        }

        /// <summary>Updates a member's personal data. Duplicate email/phone returns 409.</summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType<MemberResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<MemberResponse>> Update(int id, UpdateMemberRequest request, CancellationToken ct)
        {
            var result = await memberService.UpdateAsync(id, request, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Soft-deletes a member. Blocked (409) while they have an active membership or upcoming bookings.</summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var result = await memberService.DeleteAsync(id, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }

        /// <summary>Adds or replaces the member's health record.</summary>
        [HttpPut("{id:int}/health-record")]
        [ProducesResponseType<HealthRecordDto>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<HealthRecordDto>> SaveHealthRecord(int id, HealthRecordDto request, CancellationToken ct)
        {
            var result = await memberService.SaveHealthRecordAsync(id, request, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Uploads / replaces the member's photo (JPG, PNG or WEBP, max 2 MB).</summary>
        /// <remarks>The real type is checked from the file's bytes, not its name.</remarks>
        [HttpPut("{id:int}/photo")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(3 * 1024 * 1024)] // a bit more than 2 MB for the multipart overhead
        [ProducesResponseType<MemberResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<MemberResponse>> SetPhoto(int id, IFormFile? photo, CancellationToken ct)
        {
            // B9 fix: a request without the "photo" form field used to crash with a 500.
            if (photo is null)
                return Problem(FileErrors.Empty);

            await using var stream = photo.OpenReadStream();
            var result = await memberService.SetPhotoAsync(id, stream, photo.Length, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>Removes the member's photo.</summary>
        [HttpDelete("{id:int}/photo")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<IActionResult> DeletePhoto(int id, CancellationToken ct)
        {
            var result = await memberService.DeletePhotoAsync(id, ct);
            return result.IsSuccess ? NoContent() : Problem(result.Error);
        }

        /// <summary>All payments of the member (purchases, renewals, refunds), newest first.</summary>
        [HttpGet("{id:int}/payments")]
        [ProducesResponseType<IReadOnlyList<PaymentResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        public async Task<ActionResult<IReadOnlyList<PaymentResponse>>> GetPayments(int id,
            [FromServices] IPaymentService paymentService, CancellationToken ct)
        {
            var result = await paymentService.GetByMemberAsync(id, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }

        /// <summary>
        /// Gives the member an online account: an invite email is sent so they choose their own password.
        /// Call it again to resend the invite while it's still pending (409 once the password is set).
        /// </summary>
        [HttpPost("{id:int}/account")]
        [ProducesResponseType<MemberWithAccountResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
        public async Task<ActionResult<MemberWithAccountResponse>> CreateAccount(int id, CancellationToken ct)
        {
            var result = await memberService.CreateAccountAsync(id, ct);
            return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
        }
    }
}
