using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementBLL.View_Models.MemberVm
{
    public class HealthRecordViewModel
    {
        [Required(ErrorMessage ="Hieght is Required ")]
        [Range(0.1,300,ErrorMessage ="Hieght between 0.1 and 300 cm")]
        public decimal Height { get; set; }

        [Required(ErrorMessage ="Wieght is Required ")]
        [Range(1,350,ErrorMessage ="Wieght between 1 and 350 kg")]
        public decimal Weight { get; set; }

        [Required(ErrorMessage = "Blood Type is Required")]
        [StringLength(3, ErrorMessage = "Blood Type is max 3")]

        public string BloodType { get; set; } = null!;

        public string? Note { get; set; }

    }
}
