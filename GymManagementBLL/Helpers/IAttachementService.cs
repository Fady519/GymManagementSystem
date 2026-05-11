using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementBLL.Helpers
{
    public interface IAttachementService
    {
        string? Upload(string folderName,IFormFile file);  // Bytes ahmed.png

        bool Delete(string fileName,string folderName);
    }
}
