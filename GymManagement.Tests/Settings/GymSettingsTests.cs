using GymManagement.Tests.Infrastructure;
using GymManagementBLL.DTOs.Settings;
using GymManagementDAL.Entities;
using GymManagementDAL.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using static GymManagement.Tests.Infrastructure.HttpTestHelpers;

namespace GymManagement.Tests.Settings
{
    /// <summary>
    /// The admin "Gym settings" page (GET/PUT /api/settings/gym). There is only one settings row,
    /// so every test puts the seeded values back at the end (other tests read them too).
    /// </summary>
    [Collection(ApiCollection.Name)]
    public sealed class GymSettingsTests(ApiFactory factory) : IAsyncLifetime
    {
        private const string Url = "/api/settings/gym";

        /// <summary>The values the AddGymSettings migration inserts.</summary>
        private static readonly UpdateGymSettingsRequest Seed = new(
            GymName: "Power Fitness",
            Phone: "+20 100 555 0199",
            WhatsApp: "+20 100 555 0199",
            Email: "hello@powerfitness.eg",
            Address: "12 Abbas El Akkad St, Nasr City, Cairo",
            MapUrl: "https://maps.google.com/?q=Abbas+El+Akkad+Nasr+City+Cairo",
            FacebookUrl: null,
            InstagramUrl: null,
            WeekdayOpensAt: new TimeOnly(6, 0),
            WeekdayClosesAt: new TimeOnly(23, 0),
            FridayOpensAt: new TimeOnly(14, 0),
            FridayClosesAt: new TimeOnly(22, 0));

        private HttpClient _admin = null!;

        public async Task InitializeAsync() => _admin = await factory.CreateClientForRoleAsync(AppRoles.Admin);

        public async Task DisposeAsync()
        {
            var response = await _admin.PutAsJsonAsync(Url, Seed, Json);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        private Task<HttpResponseMessage> PutAsync(UpdateGymSettingsRequest request) => _admin.PutAsJsonAsync(Url, request, Json);

        /// <summary>Asserts a 400 "Validation.Failed" whose errors mention <paramref name="field"/>.</summary>
        private static async Task AssertFieldErrorAsync(HttpResponseMessage response, string field)
        {
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("Validation.Failed", problem.GetProperty("code").GetString());
            Assert.True(problem.GetProperty("errors").TryGetProperty(field, out _), $"Expected an error for '{field}': {problem}");
        }

        #region Read

        /// <summary>The values the AddGymSettings migration inserts (UnifyGymAddress kept the English address).</summary>
        [Fact]
        public async Task Migration_SeedsTheSingleRow()
        {
            await factory.WithDbAsync(async db =>
            {
                var rows = await db.GymSettings.ToListAsync();

                var settings = Assert.Single(rows);
                Assert.Equal(GymSettings.SingletonId, settings.Id);
                Assert.Equal("Power Fitness", settings.GymName);
                Assert.Equal(Seed.Address, settings.Address);
            });
        }

        [Fact]
        public async Task SecondRow_IsRejectedByTheDatabase()
        {
            // CK_GymSettings_SingleRow: only Id = 1 is allowed.
            await factory.WithDbAsync(async db =>
            {
                db.GymSettings.Add(new GymSettings
                {
                    Id = 2,
                    GymName = "Another gym",
                    Phone = "0225551234",
                    Email = "other@gym.com",
                    Address = "Somewhere",
                    WeekdayOpensAt = new TimeOnly(8, 0),
                    WeekdayClosesAt = new TimeOnly(20, 0),
                });

                await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
            });
        }

        [Fact]
        public async Task Get_AsAdmin_ReturnsTheSettings()
        {
            var response = await _admin.GetAsync(Url);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var settings = await response.ReadAsAsync<GymSettingsResponse>();
            Assert.Equal(Seed.GymName, settings.GymName);
            Assert.Equal(Seed.Address, settings.Address);
            Assert.Equal(new TimeOnly(6, 0), settings.WeekdayOpensAt);
            Assert.Equal(new TimeOnly(22, 0), settings.FridayClosesAt);
        }

        #endregion

        #region Update

        [Fact]
        public async Task Put_AsAdmin_SavesEverything_AndSetsUpdatedAt()
        {
            var request = Seed with
            {
                GymName = TestData.UniqueName("Gym"),
                Phone = "02-2555-1234",
                WhatsApp = "+201005550100",
                Email = "info@newgym.eg",
                Address = "5 Tahrir Sq, Cairo",
                FacebookUrl = "https://facebook.com/newgym",
                InstagramUrl = "https://instagram.com/newgym",
                WeekdayOpensAt = new TimeOnly(7, 30),
                WeekdayClosesAt = new TimeOnly(22, 0),
                FridayOpensAt = new TimeOnly(15, 0),
                FridayClosesAt = new TimeOnly(21, 0),
            };

            var response = await PutAsync(request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var saved = await response.ReadAsAsync<GymSettingsResponse>();
            Assert.Equal(request.GymName, saved.GymName);
            Assert.Equal(request.Phone, saved.Phone);
            Assert.Equal(request.WhatsApp, saved.WhatsApp);
            Assert.Equal(request.Email, saved.Email);
            Assert.Equal(request.Address, saved.Address);
            Assert.Equal(request.FacebookUrl, saved.FacebookUrl);
            Assert.Equal(request.InstagramUrl, saved.InstagramUrl);
            Assert.Equal(request.WeekdayOpensAt, saved.WeekdayOpensAt);
            Assert.Equal(request.FridayClosesAt, saved.FridayClosesAt);

            // UpdatedAt is filled by the DbContext (UTC, now).
            Assert.NotNull(saved.UpdatedAt);
            Assert.Equal(DateTimeKind.Utc, saved.UpdatedAt.Value.Kind);
            Assert.True(Math.Abs((DateTime.UtcNow - saved.UpdatedAt.Value).TotalMinutes) < 1);

            // The public website shows the new values at once.
            var publicGym = await factory.CreateHttpsClient().GetFromJsonAsync<GymSettingsResponse>("/api/public/gym", Json);
            Assert.Equal(saved, publicGym);
        }

        [Fact]
        public async Task Put_ArabicAddress_IsStoredExactlyAsTyped()
        {
            // One address in any language (here Arabic mixed with a number), never translated or duplicated.
            const string arabic = "5 ميدان التحرير، القاهرة";

            var response = await PutAsync(Seed with { Address = arabic });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(arabic, (await response.ReadAsAsync<GymSettingsResponse>()).Address);

            // nvarchar column: the Arabic letters are not saved as "????".
            await factory.WithDbAsync(async db =>
                Assert.Equal(arabic, (await db.GymSettings.SingleAsync()).Address));
        }

        [Fact]
        public async Task Put_TrimsTexts_AndEmptyOptionalTextsBecomeNull()
        {
            var request = Seed with
            {
                GymName = "  Power Fitness Plus  ",
                Email = " hello@powerfitness.eg ",
                WhatsApp = "   ",
                MapUrl = "",
                FacebookUrl = "  ",
                InstagramUrl = "  https://instagram.com/powerfitness  ",
            };

            var response = await PutAsync(request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var saved = await response.ReadAsAsync<GymSettingsResponse>();
            Assert.Equal("Power Fitness Plus", saved.GymName);
            Assert.Equal("hello@powerfitness.eg", saved.Email);
            Assert.Null(saved.WhatsApp);
            Assert.Null(saved.MapUrl);
            Assert.Null(saved.FacebookUrl);
            Assert.Equal("https://instagram.com/powerfitness", saved.InstagramUrl);

            // Stored as NULL in the database, not as an empty string.
            await factory.WithDbAsync(async db =>
            {
                var row = await db.GymSettings.SingleAsync();
                Assert.Null(row.WhatsApp);
                Assert.Null(row.MapUrl);
                Assert.Null(row.FacebookUrl);
            });
        }

        [Fact]
        public async Task Put_BothFridayTimesEmpty_MeansClosedOnFriday()
        {
            var response = await PutAsync(Seed with { FridayOpensAt = null, FridayClosesAt = null });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var saved = await response.ReadAsAsync<GymSettingsResponse>();
            Assert.Null(saved.FridayOpensAt);
            Assert.Null(saved.FridayClosesAt);
        }

        [Theory]
        [InlineData("bad-email", "email")]
        [InlineData("missing-email", "email")]
        [InlineData("missing-name", "gymName")]
        [InlineData("missing-address", "address")]
        [InlineData("bad-phone", "phone")]
        [InlineData("short-phone", "phone")]
        [InlineData("bad-whatsapp", "whatsApp")]
        [InlineData("http-map-url", "mapUrl")]
        [InlineData("relative-facebook-url", "facebookUrl")]
        [InlineData("javascript-instagram-url", "instagramUrl")]
        [InlineData("weekday-close-before-open", "weekdayClosesAt")]
        [InlineData("weekday-close-equals-open", "weekdayClosesAt")]
        [InlineData("only-friday-open", "fridayClosesAt")]
        [InlineData("only-friday-close", "fridayOpensAt")]
        [InlineData("friday-close-before-open", "fridayClosesAt")]
        public async Task Put_InvalidValue_Returns400_WithTheField(string invalidCase, string field)
        {
            var request = invalidCase switch
            {
                "bad-email" => Seed with { Email = "not-an-email" },
                "missing-email" => Seed with { Email = "  " },
                "missing-name" => Seed with { GymName = "" },
                "missing-address" => Seed with { Address = "   " },
                "bad-phone" => Seed with { Phone = "call us" },
                "short-phone" => Seed with { Phone = "12345" },
                "bad-whatsapp" => Seed with { WhatsApp = "wa.me/2010" },
                "http-map-url" => Seed with { MapUrl = "http://maps.google.com/?q=gym" },
                "relative-facebook-url" => Seed with { FacebookUrl = "/powerfitness" },
                "javascript-instagram-url" => Seed with { InstagramUrl = "javascript:alert(1)" },
                "weekday-close-before-open" => Seed with { WeekdayOpensAt = new TimeOnly(10, 0), WeekdayClosesAt = new TimeOnly(9, 0) },
                "weekday-close-equals-open" => Seed with { WeekdayOpensAt = new TimeOnly(10, 0), WeekdayClosesAt = new TimeOnly(10, 0) },
                "only-friday-open" => Seed with { FridayOpensAt = new TimeOnly(14, 0), FridayClosesAt = null },
                "only-friday-close" => Seed with { FridayOpensAt = null, FridayClosesAt = new TimeOnly(22, 0) },
                "friday-close-before-open" => Seed with { FridayOpensAt = new TimeOnly(18, 0), FridayClosesAt = new TimeOnly(14, 0) },
                _ => throw new ArgumentOutOfRangeException(nameof(invalidCase)),
            };

            var response = await PutAsync(request);

            await AssertFieldErrorAsync(response, field);
        }

        [Fact]
        public async Task Put_Invalid_DoesNotChangeAnything()
        {
            var before = await _admin.GetFromJsonAsync<GymSettingsResponse>(Url, Json);

            await PutAsync(Seed with { GymName = TestData.UniqueName("Gym"), Email = "broken" });

            var after = await _admin.GetFromJsonAsync<GymSettingsResponse>(Url, Json);
            Assert.Equal(before, after);
        }

        #endregion

        #region Security

        [Fact]
        public async Task Put_WithoutToken_Returns401()
        {
            var response = await factory.CreateHttpsClient().PutAsJsonAsync(Url, Seed, Json);

            await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "Auth.Unauthenticated");
        }

        [Theory]
        [InlineData(AppRoles.Member)]
        [InlineData(AppRoles.Trainer)]
        public async Task Put_AsNonAdmin_Returns403(string role)
        {
            var client = await factory.CreateClientForRoleAsync(role);

            var response = await client.PutAsJsonAsync(Url, Seed with { GymName = "Hacked" }, Json);

            await AssertProblemAsync(response, HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        [Theory]
        [InlineData(AppRoles.Member)]
        [InlineData(AppRoles.Trainer)]
        public async Task Get_AsNonAdmin_Returns403(string role)
        {
            var client = await factory.CreateClientForRoleAsync(role);

            var response = await client.GetAsync(Url);

            await AssertProblemAsync(response, HttpStatusCode.Forbidden, "Auth.Forbidden");
        }

        #endregion
    }
}
