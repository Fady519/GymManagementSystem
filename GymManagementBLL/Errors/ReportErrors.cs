using GymManagementBLL.Common;

namespace GymManagementBLL.Errors
{
    public static class CheckInErrors
    {
        // Not saved in the check-ins log: there is no member to link it to.
        public static readonly Error UnknownCode =
            Error.NotFound("CheckIn.UnknownCode", "This QR code is not valid. Ask the member to open the latest code in the app.");
    }

    public static class ExportErrors
    {
        public static Error TooManyRows(int maxRows) =>
            Error.Validation("Export.TooManyRows", "The export has more than " + maxRows + " rows. Please narrow the filters (e.g. a shorter date range).");
    }
}
