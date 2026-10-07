using GymManagementBLL.DTOs.Common;
using GymManagementDAL.Entities.Enums;

namespace GymManagementBLL.DTOs.Members
{
    /// <summary>
    /// The member's subscription state, calculated (not stored):
    /// Active / Frozen = has a running membership; Expired = had one, it ended; None = never subscribed.
    /// </summary>
    public enum MemberMembershipState
    {
        None = 0,
        Active = 1,
        Frozen = 2,
        Expired = 3
    }

    /// <summary>One row of the members table (light: no address / health data).</summary>
    public sealed record MemberListItem(
        int Id,
        string Name,
        string Email,
        string Phone,
        Gender Gender,
        string? PhotoUrl,
        MemberMembershipState MembershipState,
        DateTime CreatedAt);

    public sealed record MemberResponse(
        int Id,
        string Name,
        string Email,
        string Phone,
        DateOnly DateOfBirth,
        Gender Gender,
        AddressDto? Address,
        string? PhotoUrl,
        HealthRecordDto? HealthRecord,
        MemberMembershipState MembershipState,
        bool HasAccount,
        DateTime CreatedAt,
        DateTime? UpdatedAt);

    public sealed record CreateMemberRequest(
        string Name,
        string Email,
        string Phone,
        DateOnly DateOfBirth,
        Gender Gender,
        AddressDto? Address,
        HealthRecordDto? HealthRecord);

    /// <summary>Health data is changed with its own endpoint (PUT /members/{id}/health-record).</summary>
    public sealed record UpdateMemberRequest(
        string Name,
        string Email,
        string Phone,
        DateOnly DateOfBirth,
        Gender Gender,
        AddressDto? Address);

    public enum MemberSortBy
    {
        CreatedAt = 0,
        Name = 1
    }

    /// <summary>Filters, sorting and paging for the members list ([FromQuery]).</summary>
    public sealed class MemberQuery
    {
        /// <summary>Part of the name, email or phone.</summary>
        public string? Search { get; set; }

        public Gender? Gender { get; set; }

        public MemberMembershipState? MembershipState { get; set; }

        public MemberSortBy SortBy { get; set; } = MemberSortBy.CreatedAt;

        /// <summary>Default: newest first.</summary>
        public bool Descending { get; set; } = true;

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
