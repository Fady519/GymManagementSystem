using GymManagementBLL.Common;

namespace GymManagementBLL.Errors
{
    public static class CategoryErrors
    {
        public static Error NotFound(int id) =>
            Error.NotFound("Category.NotFound", $"Category with id {id} was not found.");

        public static Error NameTaken(string name) =>
            Error.Conflict("Category.NameTaken", $"A category named '{name}' already exists.");

        public static readonly Error HasTrainers =
            Error.Conflict("Category.HasTrainers", "The category cannot be deleted while trainers have it as their speciality. Move them to another category first.");

        public static readonly Error HasUpcomingSessions =
            Error.Conflict("Category.HasUpcomingSessions", "The category cannot be deleted while it has upcoming sessions.");
    }

    public static class TrainerErrors
    {
        public static Error NotFound(int id) =>
            Error.NotFound("Trainer.NotFound", $"Trainer with id {id} was not found.");

        public static readonly Error EmailTaken =
            Error.Conflict("Trainer.EmailTaken", "Another trainer or login account already uses this email.");

        public static readonly Error PhoneTaken =
            Error.Conflict("Trainer.PhoneTaken", "Another trainer already uses this phone number.");

        public static Error CategoryNotFound(int categoryId) =>
            Error.Validation("Trainer.CategoryNotFound", $"Category with id {categoryId} does not exist.");

        public static readonly Error AlreadyHasAccount =
            Error.Conflict("Trainer.AlreadyHasAccount", "This trainer already has a login account.");

        public static readonly Error HasUpcomingSessions =
            Error.Conflict("Trainer.HasUpcomingSessions", "The trainer cannot be deleted while they have upcoming sessions. Reassign or cancel them first.");
    }

    public static class MemberErrors
    {
        public static Error NotFound(int id) =>
            Error.NotFound("Member.NotFound", $"Member with id {id} was not found.");

        public static readonly Error EmailTaken =
            Error.Conflict("Member.EmailTaken", "Another member already uses this email.");

        public static readonly Error PhoneTaken =
            Error.Conflict("Member.PhoneTaken", "Another member already uses this phone number.");

        public static readonly Error HasActiveMembership =
            Error.Conflict("Member.HasActiveMembership", "The member cannot be deleted while they have an active or frozen membership. Cancel it first.");

        public static readonly Error HasUpcomingBookings =
            Error.Conflict("Member.HasUpcomingBookings", "The member cannot be deleted while they have upcoming session bookings. Cancel them first.");
    }

    public static class FileErrors
    {
        public static readonly Error Empty =
            Error.Validation("File.Empty", "Please choose a file.");

        public static Error TooLarge(int maxMb) =>
            Error.Validation("File.TooLarge", $"The file is too large. The maximum size is {maxMb} MB.");

        public static readonly Error NotAnImage =
            Error.Validation("File.NotAnImage", "Only JPG, PNG or WEBP images are allowed.");
    }
}
