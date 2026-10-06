namespace GymManagementDAL.Entities.Identity
{
    /// <summary>The 4 roles of the system. Every account has exactly one of them.</summary>
    public static class AppRoles
    {
        public const string SuperAdmin = "SuperAdmin";
        public const string Admin = "Admin";
        public const string Trainer = "Trainer";
        public const string Member = "Member";

        public static readonly string[] All = [SuperAdmin, Admin, Trainer, Member];
    }
}
