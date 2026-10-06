using GymManagementBLL.Common;
using Microsoft.AspNetCore.Identity;

namespace GymManagementBLL.Errors
{
    public static class AuthErrors
    {
        // Same message for "no such email" and "wrong password", so attackers can't
        // find out which emails have accounts.
        public static readonly Error InvalidCredentials =
            Error.Unauthorized("Auth.InvalidCredentials", "Email or password is incorrect.");

        public static readonly Error LockedOut =
            Error.Unauthorized("Auth.LockedOut", "Too many failed attempts. The account is locked for 15 minutes.");

        public static readonly Error AccountDisabled =
            Error.Forbidden("Auth.AccountDisabled", "This account is disabled. Please contact the gym.");

        public static readonly Error InvalidRefreshToken =
            Error.Unauthorized("Auth.InvalidRefreshToken", "Your session has expired. Please log in again.");

        public static readonly Error RefreshTokenReused =
            Error.Unauthorized("Auth.RefreshTokenReused", "This session was already used. All sessions were signed out for safety. Please log in again.");

        public static readonly Error UserNotFound =
            Error.Unauthorized("Auth.UserNotFound", "The account no longer exists.");

        public static readonly Error EmailTaken =
            Error.Conflict("Auth.EmailTaken", "An account with this email already exists. Try logging in.");

        public static readonly Error MemberAlreadyExists =
            Error.Conflict("Auth.MemberAlreadyExists", "This email is already registered at the gym. Please contact reception to activate your online account.");

        public static readonly Error PhoneTaken =
            Error.Conflict("Auth.PhoneTaken", "This phone number is already registered at the gym.");

        public static readonly Error WrongCurrentPassword =
            Error.Validation("Auth.WrongCurrentPassword", "The current password is incorrect.");

        /// <summary>Identity refused the operation (e.g. password rules). Rare, because our validators check first.</summary>
        public static Error IdentityFailed(IEnumerable<IdentityError> errors) =>
            Error.Validation("Auth.IdentityFailed", string.Join(" ", errors.Select(e => e.Description)));
    }

    public static class UserErrors
    {
        public static Error NotFound(int id) =>
            Error.NotFound("User.NotFound", $"User with id {id} was not found.");

        public static readonly Error EmailTaken =
            Error.Conflict("User.EmailTaken", "An account with this email already exists.");

        public static readonly Error CannotDisableSuperAdmin =
            Error.Forbidden("User.CannotDisableSuperAdmin", "A SuperAdmin account cannot be disabled.");

        public static Error UnknownRole(string role) =>
            Error.Validation("User.UnknownRole", $"Role '{role}' does not exist.");
    }
}
