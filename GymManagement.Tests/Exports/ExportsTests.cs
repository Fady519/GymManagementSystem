using ClosedXML.Excel;
using GymManagement.Tests.Infrastructure;
using GymManagement.Tests.Memberships;
using GymManagementAPI.Infrastructure.Exports;
using GymManagementBLL.DTOs.CheckIns;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Exports
{
    [Collection(ApiCollection.Name)]
    public sealed class ExportsTests(ApiFactory factory) : MembershipTestBase(factory)
    {
        #region Excel

        [Fact]
        public async Task Members_Xlsx_IsARealExcelFile_WithArabicNames()
        {
            var name = "كابتن " + TestData.UniquePersonName("Fady");
            var memberId = await NewMemberWithNameAsync(name);

            var response = await Admin.GetAsync("/api/exports/members?search=" + Uri.EscapeDataString(name));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(TableExporter.XlsxContentType, response.Content.Headers.ContentType?.MediaType);
            Assert.Equal("attachment", response.Content.Headers.ContentDisposition?.DispositionType);
            Assert.Matches(@"^members-\d{4}-\d{2}-\d{2}\.xlsx$", response.Content.Headers.ContentDisposition?.FileName?.Trim('"'));

            using var workbook = new XLWorkbook(await response.Content.ReadAsStreamAsync());
            var sheet = workbook.Worksheet("Members");
            Assert.Equal("Id", sheet.Cell(1, 1).GetString());
            Assert.Equal("Name", sheet.Cell(1, 2).GetString());
            Assert.Equal(memberId, (int)sheet.Cell(2, 1).GetDouble());   // numbers stay numbers
            Assert.Equal(name, sheet.Cell(2, 2).GetString());
            Assert.True(sheet.Cell(3, 1).IsEmpty());                     // only the searched member
        }

        [Fact]
        public async Task Xlsx_TextThatLooksLikeAFormula_StaysText()
        {
            var name = "=HYPERLINK(\"http://evil\") " + Guid.NewGuid().ToString("N")[..8];
            await NewMemberWithNameAsync(name);

            var response = await Admin.GetAsync("/api/exports/members?search=" + Uri.EscapeDataString(name));

            using var workbook = new XLWorkbook(await response.Content.ReadAsStreamAsync());
            var cell = workbook.Worksheet("Members").Cell(2, 2);
            Assert.False(cell.HasFormula);
            Assert.Equal(name, cell.GetString());
        }

        #endregion

        #region CSV

        [Fact]
        public async Task Payments_Csv_HasUtf8Bom_ArabicText_AndNegativeRefunds()
        {
            var name = "مها " + TestData.UniquePersonName("Test");
            var memberId = await NewMemberWithNameAsync(name);
            var membership = await BuyAsync(memberId, (await NewPlanAsync(price: 400)).Id);
            Assert.Equal(HttpStatusCode.OK, (await CancelAsync(membership.Id, refund: 100, method: PaymentMethod.Cash)).StatusCode);

            var response = await Admin.GetAsync($"/api/exports/payments?memberId={memberId}&format=csv");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
            var bytes = await response.Content.ReadAsByteArrayAsync();
            Assert.Equal(new byte[] { 0xEF, 0xBB, 0xBF }, bytes[..3]);   // the BOM that makes Excel read UTF-8

            var lines = Encoding.UTF8.GetString(bytes[3..]).Split("\r\n", StringSplitOptions.RemoveEmptyEntries);
            Assert.StartsWith("Id,Paid At,Member Id,Member,Plan,Type,Method,Amount", lines[0]);
            Assert.Equal(3, lines.Length);                                // header + purchase + refund
            Assert.All(lines[1..], l => Assert.Contains(name, l));
            Assert.Contains(lines, l => l.Contains(",Refund,") && l.Contains(",-100.00,"));
            Assert.Contains(lines, l => l.Contains(",Purchase,") && l.Contains(",400.00,"));
        }

        [Fact]
        public async Task CheckIns_Csv_UsesTheSameFiltersAsTheLog()
        {
            var membership = await NewRunningMembershipAsync();
            var code = "";
            await Factory.WithDbAsync(async db => code = await db.Members.Where(m => m.Id == membership.MemberId).Select(m => m.CheckInToken).FirstAsync());
            await Admin.PostAsJsonAsync("/api/check-ins", new CheckInRequest(code));
            await Admin.PostAsJsonAsync("/api/check-ins", new CheckInRequest(code)); // denied

            var csv = await Admin.GetStringAsync($"/api/exports/check-ins?memberId={membership.MemberId}&result=Denied&format=csv");

            var lines = csv.TrimStart('\uFEFF').Split("\r\n", StringSplitOptions.RemoveEmptyEntries);
            Assert.Equal(2, lines.Length);
            Assert.Contains(",Denied,AlreadyCheckedInToday,", lines[1]);
        }

        [Theory]
        [InlineData("Ahmed", "Ahmed")]
        [InlineData("=1+1", "'=1+1")]                 // CSV injection: shown as text, not run as a formula
        [InlineData("+201001234567", "'+201001234567")]
        [InlineData("@SUM(A1)", "'@SUM(A1)")]
        [InlineData("Cairo, Egypt", "\"Cairo, Egypt\"")]
        [InlineData("He said \"hi\"", "\"He said \"\"hi\"\"\"")]
        [InlineData("line1\nline2", "\"line1\nline2\"")]
        public void CsvCell_EscapesText(string value, string expected)
            => Assert.Equal(expected, TableExporter.CsvCell(value));

        [Fact]
        public void CsvCell_KeepsNumbersAndDatesReadable()
        {
            Assert.Equal("-50.00", TableExporter.CsvCell(-50m));             // a negative number is not "injection"
            Assert.Equal("7", TableExporter.CsvCell(7));
            Assert.Equal("2026-10-07 14:05", TableExporter.CsvCell(new DateTime(2026, 10, 7, 14, 5, 0)));
            Assert.Equal("2026-10-07", TableExporter.CsvCell(new DateOnly(2026, 10, 7)));
            Assert.Equal("", TableExporter.CsvCell(null));
        }

        #endregion

        #region Limits and access

        [Fact]
        public async Task TooManyRows_Returns400_AskingForNarrowerFilters()
        {
            await NewMemberAsync();
            await NewMemberAsync();

            // A copy of the API where an export may have only 1 row.
            await using var smallLimit = Factory.WithWebHostBuilder(builder =>
                builder.ConfigureAppConfiguration((_, config) =>
                    config.AddInMemoryCollection(new Dictionary<string, string?> { ["Exports:MaxRows"] = "1" })));
            var client = smallLimit.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
            client.DefaultRequestHeaders.Authorization = Admin.DefaultRequestHeaders.Authorization;

            var response = await client.GetAsync("/api/exports/members");

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "Export.TooManyRows");
        }

        [Fact]
        public async Task UnknownFormat_Returns400()
            => Assert.Equal(HttpStatusCode.BadRequest, (await Admin.GetAsync("/api/exports/members?format=pdf")).StatusCode);

        [Theory]
        [InlineData(AppRoles.Trainer)]
        [InlineData(AppRoles.Member)]
        public async Task OnlyAdmins_CanExport(string role)
        {
            var client = await Factory.CreateClientForRoleAsync(role);

            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/exports/payments")).StatusCode);
        }

        #endregion

        private async Task<int> NewMemberWithNameAsync(string name)
        {
            var id = 0;
            await Factory.WithDbAsync(async db => id = (await TestData.AddMemberAsync(db, name)).Id);
            return id;
        }
    }
}
