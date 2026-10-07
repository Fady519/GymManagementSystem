using GymManagement.Tests.Infrastructure;
using GymManagementBLL.Common;
using GymManagementBLL.DTOs.Payments;
using GymManagementDAL.Entities.Enums;
using System.Net;
using System.Net.Http.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Memberships
{
    [Collection(ApiCollection.Name)]
    public sealed class PaymentsEndpointsTests(ApiFactory factory) : MembershipTestBase(factory)
    {
        [Fact]
        public async Task MemberPayments_ListsPurchaseRenewalAndRefund_NewestFirst()
        {
            var current = await NewRunningMembershipAsync(price: 300);
            var renewal = await (await RenewAsync(current.Id)).ReadAsAsync<GymManagementBLL.DTOs.Memberships.MembershipResponse>();
            Assert.Equal(HttpStatusCode.OK, (await CancelAsync(renewal.Id, refund: 300, method: PaymentMethod.Cash)).StatusCode);

            var payments = (await Admin.GetFromJsonAsync<List<PaymentResponse>>($"/api/members/{current.MemberId}/payments", Json))!;

            Assert.Equal([PaymentType.Refund, PaymentType.Renewal, PaymentType.Purchase], payments.Select(p => p.Type));
            Assert.All(payments, p => Assert.Equal(current.MemberId, p.MemberId));
        }

        [Fact]
        public async Task MemberPayments_UnknownMember_Returns404()
            => await AssertProblemAsync(await Admin.GetAsync("/api/members/999999/payments"), HttpStatusCode.NotFound, "Member.NotFound");

        [Fact]
        public async Task GetAll_FiltersByMethodTypeAndDate()
        {
            var cash = await NewRunningMembershipAsync();
            var card = await BuyAsync(await NewMemberAsync(), (await NewPlanAsync()).Id, PaymentMethod.Card);

            var from = Uri.EscapeDataString(DateTime.UtcNow.AddMinutes(-5).ToString("O"));
            var page = (await Admin.GetFromJsonAsync<PagedResult<PaymentResponse>>(
                $"/api/payments?method=Card&type=Purchase&from={from}&pageSize=100", Json))!;

            Assert.Contains(page.Items, p => p.MembershipId == card.Id);
            Assert.DoesNotContain(page.Items, p => p.MembershipId == cash.Id);
            Assert.All(page.Items, p => Assert.Equal(PaymentMethod.Card, p.Method));

            var future = Uri.EscapeDataString(DateTime.UtcNow.AddDays(1).ToString("O"));
            var empty = (await Admin.GetFromJsonAsync<PagedResult<PaymentResponse>>($"/api/payments?from={future}", Json))!;
            Assert.Empty(empty.Items);
        }

        [Fact]
        public async Task GetAll_ToBeforeFrom_Returns400()
        {
            var response = await Admin.GetAsync("/api/payments?from=2026-10-10T00:00:00Z&to=2026-10-01T00:00:00Z");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }
}
