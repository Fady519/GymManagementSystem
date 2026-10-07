using GymManagementAPI.Infrastructure;
using GymManagementAPI.Infrastructure.Exports;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.CheckIns;
using GymManagementBLL.DTOs.Members;
using GymManagementBLL.DTOs.Memberships;
using GymManagementBLL.DTOs.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>
    /// Excel / CSV downloads (admins only). Each export takes the same filters as its list page
    /// (paging is ignored) plus format=xlsx (default) or format=csv.
    /// </summary>
    [Route("api/exports")]
    [Authorize(Policy = AppPolicies.AdminAccess)]
    public sealed class ExportsController(ExportService exportService) : ApiControllerBase
    {
        [HttpGet("members")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK, TableExporter.XlsxContentType, "text/csv")]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<IActionResult> Members([FromQuery] MemberQuery query, CancellationToken ct, [FromQuery] ExportFormat format = ExportFormat.Xlsx)
            => ToFile(await exportService.MembersAsync(query, format, ct));

        [HttpGet("memberships")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK, TableExporter.XlsxContentType, "text/csv")]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<IActionResult> Memberships([FromQuery] MembershipQuery query, CancellationToken ct, [FromQuery] ExportFormat format = ExportFormat.Xlsx)
            => ToFile(await exportService.MembershipsAsync(query, format, ct));

        [HttpGet("payments")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK, TableExporter.XlsxContentType, "text/csv")]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<IActionResult> Payments([FromQuery] PaymentQuery query, CancellationToken ct, [FromQuery] ExportFormat format = ExportFormat.Xlsx)
            => ToFile(await exportService.PaymentsAsync(query, format, ct));

        [HttpGet("check-ins")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK, TableExporter.XlsxContentType, "text/csv")]
        [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
        public async Task<IActionResult> CheckIns([FromQuery] CheckInQuery query, CancellationToken ct, [FromQuery] ExportFormat format = ExportFormat.Xlsx)
            => ToFile(await exportService.CheckInsAsync(query, format, ct));

        /// <summary>The file as a download (Content-Disposition: attachment), or a ProblemDetails error.</summary>
        private IActionResult ToFile(Result<ExportFile> result)
            => result.IsSuccess
                ? File(result.Value.Content, result.Value.ContentType, result.Value.FileName)
                : Problem(result.Error);
    }
}
