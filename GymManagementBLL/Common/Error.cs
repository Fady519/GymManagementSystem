namespace GymManagementBLL.Common
{
    /// <summary>
    /// The category of a business error. The API layer maps each type to an HTTP status code.
    /// </summary>
    public enum ErrorType
    {
        Failure = 0,
        Validation = 1,
        NotFound = 2,
        Conflict = 3,
        Unauthorized = 4,
        Forbidden = 5
    }

    /// <summary>
    /// A business error with a stable machine-readable code (e.g. "Plan.NotFound")
    /// and a human-readable message.
    /// </summary>
    public sealed record Error(string Code, string Message, ErrorType Type)
    {
        public static readonly Error None = new(string.Empty, string.Empty, ErrorType.Failure);

        public static Error Failure(string code, string message) => new(code, message, ErrorType.Failure);
        public static Error Validation(string code, string message) => new(code, message, ErrorType.Validation);
        public static Error NotFound(string code, string message) => new(code, message, ErrorType.NotFound);
        public static Error Conflict(string code, string message) => new(code, message, ErrorType.Conflict);
        public static Error Unauthorized(string code, string message) => new(code, message, ErrorType.Unauthorized);
        public static Error Forbidden(string code, string message) => new(code, message, ErrorType.Forbidden);
    }
}
