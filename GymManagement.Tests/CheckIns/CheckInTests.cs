using GymManagement.Tests.Infrastructure;
using GymManagement.Tests.Memberships;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.CheckIns;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Enums;
using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.CheckIns
{
    [Collection(ApiCollection.Name)]
    public sealed class CheckInTests(ApiFactory factory) : MembershipTestBase(factory)
    {
        private static readonly TimeZoneInfo Cairo = TimeZoneInfo.FindSystemTimeZoneById("Africa/Cairo");

        private static DateOnly CairoDate(DateTime utc) => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(utc, Cairo));

        #region Allowed

        [Fact]
        public async Task ValidCode_RunningMembership_IsAllowed_WithNamePhotoPlanAndDaysLeft()
        {
            var plan = await NewPlanAsync();
            var memberId = await NewMemberAsync();
            var now = DateTime.UtcNow;
            var end = now.AddDays(10);
            await InsertMembershipAsync(memberId, plan, now.AddDays(-20), end);
            await Factory.WithDbAsync(async db =>
            {
                (await db.Members.FindAsync(memberId))!.Photo = "face.jpg";
                await db.SaveChangesAsync();
            });

            var result = await CheckInAsync(await GetCodeAsync(memberId));

            Assert.Equal(CheckInResult.Allowed, result.Result);
            Assert.Null(result.DenyReason);
            Assert.Equal(memberId, result.MemberId);
            Assert.Equal(plan.Name, result.PlanName);
            Assert.EndsWith("face.jpg", result.PhotoUrl);
            Assert.Equal(CairoDate(end).DayNumber - CairoDate(now).DayNumber, result.DaysLeft);
            Assert.StartsWith("Welcome, ", result.Message);
        }

        [Fact]
        public async Task Code_IsCaseInsensitive_AndTrimmed()
        {
            var membership = await NewRunningMembershipAsync();
            var code = await GetCodeAsync(membership.MemberId);

            var result = await CheckInAsync("  " + code.ToUpperInvariant() + " ");

            Assert.Equal(CheckInResult.Allowed, result.Result);
        }

        [Fact]
        public async Task QueuedRenewal_CountsInDaysLeft()
        {
            var plan = await NewPlanAsync();
            var memberId = await NewMemberAsync();
            var now = DateTime.UtcNow;
            var currentEnd = now.AddDays(5);
            var renewalEnd = currentEnd.AddDays(30);
            await InsertMembershipAsync(memberId, plan, now.AddDays(-25), currentEnd);
            await InsertMembershipAsync(memberId, plan, currentEnd, renewalEnd);

            var result = await CheckInAsync(await GetCodeAsync(memberId));

            Assert.Equal(CheckInResult.Allowed, result.Result);
            AssertCloseTo(renewalEnd, result.CoveredUntil!.Value, 1);
            Assert.Equal(CairoDate(renewalEnd).DayNumber - CairoDate(now).DayNumber, result.DaysLeft);
        }

        #endregion

        #region Denied

        [Fact]
        public async Task SameCodeTwiceInOneDay_SecondIsDenied_AlreadyCheckedInToday()
        {
            var membership = await NewRunningMembershipAsync();
            var code = await GetCodeAsync(membership.MemberId);

            var first = await CheckInAsync(code);
            var second = await CheckInAsync(code);

            Assert.Equal(CheckInResult.Allowed, first.Result);
            Assert.Equal(CheckInResult.Denied, second.Result);
            Assert.Equal(CheckInDenyReason.AlreadyCheckedInToday, second.DenyReason);
            Assert.StartsWith("Already checked in today at ", second.Message);
        }

        [Fact]
        public async Task TwoScansAtTheSameMoment_OnlyOneIsAllowed()
        {
            var membership = await NewRunningMembershipAsync();
            var code = await GetCodeAsync(membership.MemberId);

            // Two reception devices scan the same QR at once. The unique index decides.
            var responses = await Task.WhenAll(
                Admin.PostAsJsonAsync("/api/check-ins", new CheckInRequest(code)),
                Admin.PostAsJsonAsync("/api/check-ins", new CheckInRequest(code)));

            var results = new List<CheckInResultResponse>();
            foreach (var response in responses)
            {
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                results.Add(await response.ReadAsAsync<CheckInResultResponse>());
            }

            Assert.Single(results, r => r.Result == CheckInResult.Allowed);
            Assert.Single(results, r => r.DenyReason == CheckInDenyReason.AlreadyCheckedInToday);
        }

        [Fact]
        public async Task FrozenMembership_IsDenied_WithTheReason()
        {
            var plan = await NewPlanAsync();
            var memberId = await NewMemberAsync();
            var now = DateTime.UtcNow;
            await InsertMembershipAsync(memberId, plan, now.AddDays(-10), now.AddDays(20),
                MembershipStatus.Frozen, frozenUntil: now.AddDays(5), totalFrozenDays: 5);

            var result = await CheckInAsync(await GetCodeAsync(memberId));

            Assert.Equal(CheckInResult.Denied, result.Result);
            Assert.Equal(CheckInDenyReason.MembershipFrozen, result.DenyReason);
            Assert.StartsWith("The membership is frozen until ", result.Message);
            Assert.Null(result.DaysLeft);
        }

        [Fact]
        public async Task FreezeThatEnded_IsAllowedAgain()
        {
            var plan = await NewPlanAsync();
            var memberId = await NewMemberAsync();
            var now = DateTime.UtcNow;
            await InsertMembershipAsync(memberId, plan, now.AddDays(-10), now.AddDays(20),
                MembershipStatus.Frozen, frozenUntil: now.AddDays(-1), totalFrozenDays: 3);

            var result = await CheckInAsync(await GetCodeAsync(memberId));

            Assert.Equal(CheckInResult.Allowed, result.Result);
        }

        [Fact]
        public async Task ExpiredMembership_IsDenied()
        {
            var plan = await NewPlanAsync();
            var memberId = await NewMemberAsync();
            await InsertMembershipAsync(memberId, plan, DateTime.UtcNow.AddDays(-40), DateTime.UtcNow.AddDays(-10));

            var result = await CheckInAsync(await GetCodeAsync(memberId));

            Assert.Equal(CheckInDenyReason.MembershipExpired, result.DenyReason);
        }

        [Fact]
        public async Task OnlyARenewalThatStartsLater_IsDenied_NotStarted()
        {
            var plan = await NewPlanAsync();
            var memberId = await NewMemberAsync();
            await InsertMembershipAsync(memberId, plan, DateTime.UtcNow.AddDays(3), DateTime.UtcNow.AddDays(33));

            var result = await CheckInAsync(await GetCodeAsync(memberId));

            Assert.Equal(CheckInDenyReason.MembershipNotStarted, result.DenyReason);
        }

        [Fact]
        public async Task NoMembership_OrOnlyCancelled_IsDenied_NoMembership()
        {
            var plan = await NewPlanAsync();
            var memberId = await NewMemberAsync();
            await InsertMembershipAsync(memberId, plan, DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(29), MembershipStatus.Cancelled);

            var result = await CheckInAsync(await GetCodeAsync(memberId));

            Assert.Equal(CheckInDenyReason.NoMembership, result.DenyReason);
        }

        [Fact]
        public async Task UnknownCode_Returns404_AndIsNotSaved()
        {
            var before = await CountCheckInsAsync();

            var response = await Admin.PostAsJsonAsync("/api/check-ins", new CheckInRequest("not-a-real-code"));

            await AssertProblemAsync(response, HttpStatusCode.NotFound, "CheckIn.UnknownCode");
            Assert.Equal(before, await CountCheckInsAsync());
        }

        [Fact]
        public async Task DeletedMember_CodeNoLongerWorks()
        {
            var membership = await NewRunningMembershipAsync();
            var code = await GetCodeAsync(membership.MemberId);
            await Factory.WithDbAsync(async db =>
            {
                db.Members.Remove((await db.Members.FindAsync(membership.MemberId))!);
                await db.SaveChangesAsync();
            });

            var response = await Admin.PostAsJsonAsync("/api/check-ins", new CheckInRequest(code));

            await AssertProblemAsync(response, HttpStatusCode.NotFound, "CheckIn.UnknownCode");
        }

        [Fact]
        public async Task EmptyCode_Returns400()
        {
            var response = await Admin.PostAsJsonAsync("/api/check-ins", new CheckInRequest(""));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        #endregion

        #region Log

        [Fact]
        public async Task AllowedAndDeniedScans_AreSaved_AndTheLogFilters()
        {
            var membership = await NewRunningMembershipAsync();
            var code = await GetCodeAsync(membership.MemberId);
            await CheckInAsync(code);
            await CheckInAsync(code); // denied: already checked in

            var all = (await Admin.GetFromJsonAsync<PagedResult<CheckInResponse>>(
                $"/api/check-ins?memberId={membership.MemberId}", Json))!;
            var denied = (await Admin.GetFromJsonAsync<PagedResult<CheckInResponse>>(
                $"/api/check-ins?memberId={membership.MemberId}&result=Denied", Json))!;

            Assert.Equal(2, all.TotalCount);
            Assert.Equal(CheckInResult.Denied, all.Items[0].Result); // newest first
            Assert.All(all.Items, c => Assert.Equal("Test Admin", c.CheckedBy));
            Assert.Equal(CairoDate(DateTime.UtcNow), all.Items[0].Day);

            var only = Assert.Single(denied.Items);
            Assert.Equal(CheckInDenyReason.AlreadyCheckedInToday, only.DenyReason);
        }

        [Fact]
        public async Task Log_FiltersByDay()
        {
            var membership = await NewRunningMembershipAsync();
            await CheckInAsync(await GetCodeAsync(membership.MemberId));
            var tomorrow = CairoDate(DateTime.UtcNow).AddDays(1).ToString("yyyy-MM-dd");

            var page = (await Admin.GetFromJsonAsync<PagedResult<CheckInResponse>>(
                $"/api/check-ins?memberId={membership.MemberId}&from={tomorrow}", Json))!;

            Assert.Empty(page.Items);
        }

        [Fact]
        public async Task Log_ToBeforeFrom_Returns400()
        {
            var response = await Admin.GetAsync("/api/check-ins?from=2026-10-10&to=2026-10-01");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        #endregion

        #region QR code (member portal)

        [Fact]
        public async Task EveryMember_GetsADifferentCode_FromTheDatabase()
        {
            var first = await GetCodeAsync(await NewMemberAsync());
            var second = await GetCodeAsync(await NewMemberAsync());

            Assert.Matches("^[0-9a-f]{32}$", first);
            Assert.Matches("^[0-9a-f]{32}$", second);
            Assert.NotEqual(first, second);
        }

        [Fact]
        public async Task Member_SeesTheirCode_AndRegenerate_KillsTheOldOne()
        {
            var membership = await NewRunningMembershipAsync();
            var member = await Factory.CreateClientForMemberAsync(membership.MemberId);

            var current = (await member.GetFromJsonAsync<CheckInCodeResponse>("/api/me/qr", Json))!;
            Assert.Equal(await GetCodeAsync(membership.MemberId), current.Code);

            var response = await member.PostAsync("/api/me/qr/regenerate", null);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var fresh = await response.ReadAsAsync<CheckInCodeResponse>();

            Assert.NotEqual(current.Code, fresh.Code);
            Assert.Matches("^[0-9a-f]{32}$", fresh.Code);
            await AssertProblemAsync(await Admin.PostAsJsonAsync("/api/check-ins", new CheckInRequest(current.Code)),
                HttpStatusCode.NotFound, "CheckIn.UnknownCode");
            Assert.Equal(CheckInResult.Allowed, (await CheckInAsync(fresh.Code)).Result);
        }

        [Fact]
        public async Task StaffWithoutMemberProfile_CannotGetAQrCode()
        {
            var admin = await Factory.CreateClientForRoleAsync(AppRoles.Admin);

            Assert.Equal(HttpStatusCode.Forbidden, (await admin.GetAsync("/api/me/qr")).StatusCode);
        }

        #endregion

        #region Who may scan

        [Theory]
        [InlineData(AppRoles.Trainer)]
        [InlineData(AppRoles.Member)]
        public async Task OnlyAdmins_CanScanOrSeeTheLog(string role)
        {
            var client = await Factory.CreateClientForRoleAsync(role);

            Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/check-ins", new CheckInRequest("x"))).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/check-ins")).StatusCode);
        }

        #endregion

        #region Helpers

        private async Task<string> GetCodeAsync(int memberId)
        {
            var code = "";
            await Factory.WithDbAsync(async db => code = await db.Members.IgnoreQueryFilters()
                .Where(m => m.Id == memberId).Select(m => m.CheckInToken).FirstAsync());
            return code;
        }

        private async Task<CheckInResultResponse> CheckInAsync(string code)
        {
            var response = await Admin.PostAsJsonAsync("/api/check-ins", new CheckInRequest(code));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            return await response.ReadAsAsync<CheckInResultResponse>();
        }

        private async Task<int> CountCheckInsAsync()
        {
            var count = 0;
            await Factory.WithDbAsync(async db => count = await db.Set<CheckIn>().CountAsync());
            return count;
        }

        #endregion
    }
}
