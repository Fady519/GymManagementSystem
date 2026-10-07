namespace GymManagementBLL.Abstractions
{
    /// <summary>
    /// Saves and deletes uploaded files. The BLL only knows this interface, not where files go:
    /// today it's a local folder (LocalFileStorage in the API); later it could be cloud storage
    /// without changing any business code.
    /// </summary>
    public interface IFileStorage
    {
        /// <summary>Saves the content under a new random (GUID) name and returns that file name.</summary>
        Task<string> SaveAsync(Stream content, string folder, string extension, CancellationToken ct = default);

        /// <summary>Deletes the file if it exists (no error if it doesn't).</summary>
        Task DeleteAsync(string folder, string fileName, CancellationToken ct = default);

        /// <summary>The public URL path of the file, e.g. /uploads/members/abc.jpg.</summary>
        string GetPublicUrl(string folder, string fileName);
    }
}
