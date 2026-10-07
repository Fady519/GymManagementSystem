using GymManagementBLL.Abstractions;
using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.CheckIns;
using GymManagementBLL.DTOs.Members;
using GymManagementBLL.DTOs.Memberships;
using GymManagementBLL.DTOs.Payments;
using GymManagementDAL.Entities.Enums;
using Microsoft.Extensions.Options;
using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace GymManagementAPI.Infrastructure.Exports
{
    /// <summary>"Exports" config section.</summary>
    public sealed class ExportOptions
    {
        public const string SectionName = "Exports";

        /// <summary>Bigger exports are refused (Export.TooManyRows) so one click can't load the whole database into memory.</summary>
        [Range(1, 100_000)]
        public int MaxRows { get; set; } = 10_000;
    }

    /// <summary>
    /// Excel / CSV downloads. The rows come from the same service methods (same filters) as the list pages;
    /// this class only decides the columns and the file format. Times are written in the gym's local time,
    /// because people read these files, not programs.
    /// </summary>
    public sealed class ExportService(
        IMemberService memberService,
        IMembershipService membershipService,
        IPaymentService paymentService,
        ICheckInService checkInService,
        GymTimeZone gymTime,
        IClock clock,
        IOptions<ExportOptions> options)
    {
        private int MaxRows => options.Value.MaxRows;

        public async Task<Result<ExportFile>> MembersAsync(MemberQuery query, ExportFormat format, CancellationToken ct)
        {
            var rows = await memberService.GetForExportAsync(query, MaxRows, ct);
            if (rows.IsFailure)
                return rows.Error;

            return Build("Members", format, rows.Value,
            [
                new("Id", m => m.Id),
                new("Name", m => m.Name),
                new("Email", m => m.Email),
                new("Phone", m => m.Phone),
                new("Gender", m => m.Gender.ToString()),
                new("Membership", m => m.MembershipState.ToString()),
                new("Joined", m => gymTime.ToLocal(m.CreatedAt)),
            ]);
        }

        public async Task<Result<ExportFile>> MembershipsAsync(MembershipQuery query, ExportFormat format, CancellationToken ct)
        {
            var rows = await membershipService.GetForExportAsync(query, MaxRows, ct);
            if (rows.IsFailure)
                return rows.Error;

            return Build("Memberships", format, rows.Value,
            [
                new("Id", m => m.Id),
                new("Member Id", m => m.MemberId),
                new("Member", m => m.MemberName),
                new("Plan", m => m.PlanName),
                new("Price Paid", m => m.PricePaid),
                new("Start", m => gymTime.ToLocal(m.StartDate)),
                new("End", m => gymTime.ToLocal(m.EndDate)),
                new("State", m => m.State.ToString()),
                new("Frozen Days", m => m.TotalFrozenDays),
                new("Cancelled At", m => m.CancelledAt is DateTime c ? gymTime.ToLocal(c) : null),
                new("Cancellation Reason", m => m.CancellationReason),
            ]);
        }

        public async Task<Result<ExportFile>> PaymentsAsync(PaymentQuery query, ExportFormat format, CancellationToken ct)
        {
            var rows = await paymentService.GetForExportAsync(query, MaxRows, ct);
            if (rows.IsFailure)
                return rows.Error;

            return Build("Payments", format, rows.Value,
            [
                new("Id", p => p.Id),
                new("Paid At", p => gymTime.ToLocal(p.PaidAt)),
                new("Member Id", p => p.MemberId),
                new("Member", p => p.MemberName),
                new("Plan", p => p.PlanName),
                new("Type", p => p.Type.ToString()),
                new("Method", p => p.Method.ToString()),
                // Refunds are negative here, so a SUM in Excel gives the net revenue directly.
                new("Amount", p => p.Type == PaymentType.Refund ? -p.Amount : p.Amount),
                new("Received By", p => p.ReceivedBy),
                new("Notes", p => p.Notes),
            ]);
        }

        public async Task<Result<ExportFile>> CheckInsAsync(CheckInQuery query, ExportFormat format, CancellationToken ct)
        {
            var rows = await checkInService.GetForExportAsync(query, MaxRows, ct);
            if (rows.IsFailure)
                return rows.Error;

            return Build("Check-ins", format, rows.Value,
            [
                new("Id", c => c.Id),
                new("Time", c => gymTime.ToLocal(c.CheckedInAt)),
                new("Day", c => c.Day),
                new("Member Id", c => c.MemberId),
                new("Member", c => c.MemberName),
                new("Result", c => c.Result.ToString()),
                new("Reason", c => c.DenyReason?.ToString()),
                new("Checked By", c => c.CheckedBy),
            ]);
        }

        /// <summary>File name like "payments-2026-10-07.xlsx" (the gym's local date).</summary>
        private ExportFile Build<T>(string title, ExportFormat format, IReadOnlyList<T> rows, IReadOnlyList<ExportColumn<T>> columns)
        {
            var fileName = title.ToLowerInvariant() + "-"
                + gymTime.LocalDate(clock.UtcNow).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                + (format == ExportFormat.Csv ? ".csv" : ".xlsx");

            return format == ExportFormat.Csv
                ? new ExportFile(TableExporter.ToCsv(rows, columns), TableExporter.CsvContentType, fileName)
                : new ExportFile(TableExporter.ToXlsx(title, rows, columns), TableExporter.XlsxContentType, fileName);
        }
    }
}
