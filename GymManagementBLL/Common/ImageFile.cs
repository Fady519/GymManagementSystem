namespace GymManagementBLL.Common
{
    /// <summary>
    /// Detects the real image type from the first bytes of the file ("magic bytes").
    /// The file name / extension is never trusted: a virus.exe renamed to photo.jpg
    /// still starts with "MZ", so it is rejected.
    /// </summary>
    public static class ImageFile
    {
        public const int MaxSizeMb = 2;
        public const long MaxSizeBytes = MaxSizeMb * 1024 * 1024;

        private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF];
        private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        private static readonly byte[] Riff = "RIFF"u8.ToArray();
        private static readonly byte[] Webp = "WEBP"u8.ToArray();

        /// <summary>Returns ".jpg", ".png" or ".webp", or null if the bytes are not one of those images.</summary>
        public static string? DetectExtension(ReadOnlySpan<byte> header)
        {
            if (header.StartsWith(Jpeg))
                return ".jpg";

            if (header.StartsWith(Png))
                return ".png";

            // WEBP = "RIFF" + 4 bytes (file size) + "WEBP"
            if (header.Length >= 12 && header.StartsWith(Riff) && header.Slice(8, 4).SequenceEqual(Webp))
                return ".webp";

            return null;
        }
    }
}
