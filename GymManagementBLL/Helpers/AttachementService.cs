using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementBLL.Helpers
{
    public class AttachementService : IAttachementService
    {
        private readonly string[] allowedExtensions = { ".jpg", ".jpeg", ".png" };
        private readonly long maxFileSize= 5 * 1024 * 1024; // 5 MB
        private readonly IWebHostEnvironment _webHost;

        public AttachementService(IWebHostEnvironment webHost)
        {
            _webHost = webHost;
        }
        public string? Upload(string folderName, IFormFile file)
        {
            try
            {
                if (folderName is null || file is null || file.Length == 0)
                    return null;

                if (file.Length > maxFileSize)
                    return null;

                var extension = Path.GetExtension(file.FileName).ToLower();

                if (!allowedExtensions.Contains(extension))
                    return null;
                //wwwroot/images/members
                var folderPath = Path.Combine(_webHost.WebRootPath, "images", folderName);

                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                }


                // 123fjhe.jpg
                var fileName = Guid.NewGuid().ToString() + extension;

                var filePath = Path.Combine(folderPath, fileName);

                using var fileStream = new FileStream(filePath, FileMode.Create);

                file.CopyTo(fileStream);

                return fileName;
            }
            catch (Exception ex)
            {

                Console.WriteLine($"Failed to Upload Photo in {folderName}: bec:{ex} ");
                return null;
            }


        }
        public bool Delete(string fileName, string folderName)
        {
            try
            {
                if (string.IsNullOrEmpty(fileName) || string.IsNullOrEmpty(folderName))
                    return false;

                var fullPath = Path.Combine(_webHost.WebRootPath, "images", folderName, fileName);

                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to delete file :{ex}");
                return false;
            }
        }


    }
}
