using GymManagementAPI.Infrastructure;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>The gym's cash book (admins only). Payments are created by memberships and never edited.</summary>
    [Route("api/payments")]
    [Authorize(Policy = AppPolicies.AdminAccess)]
    public sealed class PaymentsController(IPaymentService paymentService) : ApiControllerBase
    {
        /// <summary>Lists payments, newest first, filtered by date range (UTC, "to" is exclusive), method, type or member.</summary>
        [HttpGet]
        [ProducesResponseType<PagedResult<PaymentResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<PagedResult<PaymentResponse>>> GetAll([FromQuery] PaymentQuery query, CancellationToken ct)
            => Ok(await paymentService.GetAllAsync(query, ct));

        /// <summary>
        /// Totals for the same filters as the list: how many payments, income, refunds and net.
        /// Covers every matching payment, not only one page (page and pageSize are ignored).
        /// </summary>
        [HttpGet("summary")]
        [ProducesResponseType<PaymentSummaryResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<ActionResult<PaymentSummaryResponse>> GetSummary([FromQuery] PaymentQuery query, CancellationToken ct)
            => Ok(await paymentService.GetSummaryAsync(query, ct));
    }
}
