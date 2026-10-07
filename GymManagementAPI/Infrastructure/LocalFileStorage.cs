using GymManagementBLL.Abstractions;

namespace GymManagementAPI.Infrastructure
{
    /// <summary>
    /// Stores uploaded files in a folder on the server's disk (FileStorage:RootPath, default "uploads").
    /// The folder is served as static files under /uploads, e.g. /uploads/members/{guid}.jpg.
    /// </summary>
    public sealed class LocalFileStorage : IFileStorage
    {
        public const string RequestPath = "/uploads";

        private readonly string _rootPath;

        public LocalFileStorage(string rootPath)
        {
            _rootPath = rootPath;
        }

        /// <summary>Absolute path of the uploads folder (relative paths are inside the API's content root).</summary>
        public static string ResolveRootPath(IConfiguration configuration, IWebHostEnvironment environment)
        {
            var configured = configuration["FileStorage:RootPath"] ?? "uploads";
            return Path.GetFullPath(Path.Combine(environment.ContentRootPath, configured));
        }

        public async Task<string> SaveAsync(Stream content, string folder, string extension, CancellationToken ct = default)
        {
            var directory = Path.Combine(_rootPath, folder);
            Directory.CreateDirectory(directory);

            // A random name: users can't guess other files, and two uploads never overwrite each other.
            var fileName = $"{Guid.NewGuid():N}{extension}";

            await using var file = File.Create(Path.Combine(directory, fileName));
            await content.CopyToAsync(file, ct);

            return fileName;
        }

        public Task DeleteAsync(string folder, string fileName, CancellationToken ct = default)
        {
            // Path.GetFileName drops any "..\" so a bad name can't delete files outside the folder.
            var path = Path.Combine(_rootPath, folder, Path.GetFileName(fileName));

            if (File.Exists(path))
                File.Delete(path);

            return Task.CompletedTask;
        }

        public string GetPublicUrl(string folder, string fileName)
            => $"{RequestPath}/{folder}/{Uri.EscapeDataString(fileName)}";
    }
}
