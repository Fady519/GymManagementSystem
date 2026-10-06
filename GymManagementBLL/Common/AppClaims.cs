namespace GymManagementBLL.Common
{
    /// <summary>
    /// Names of the claims inside our access token. Short standard names ("sub", "role"...)
    /// keep the token small and easy to read on jwt.io.
    /// </summary>
    public static class AppClaims
    {
        public const string UserId = "sub";
        public const string Email = "email";
        public const string Name = "name";
        public const string Role = "role";
        public const string TokenId = "jti";
        public const string MemberId = "memberId";
        public const string TrainerId = "trainerId";
    }
}
