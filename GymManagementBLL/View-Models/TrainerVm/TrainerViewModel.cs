using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementBLL.View_Models.TrainerVm
{
    public class TrainerViewModel
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;

        public string Email { get; set; } = null!;

        public string Phone { get; set; } = null!;

        public string Specialities { get; set; } = null!;

        public string? DateOfBirth { get; set; }

        public string? Gender { get; set; }

        public string? Address { get; set; }
    }
}
