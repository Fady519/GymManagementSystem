using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementBLL.View_Models.PlanVm
{
    public class PlanToUpdateViewModel
    {
        public string Name { get; set; } = null!;

        [Required(ErrorMessage ="Description is Required")]
        [StringLength(100,MinimumLength =5,ErrorMessage ="Description Between 5 and 50")]
        public string Description { get; set; } = null!;
        [Required(ErrorMessage ="Duration Days is Required")]
        [Range(1,365,ErrorMessage ="Duration days between 1 and 365")]
        public int DurationDays { get; set; }
        [Required(ErrorMessage ="Price is Required")]
        [Range(250,10000,ErrorMessage ="Price between 250 between 10000 EGP")]
        public decimal Price { get; set; }
    }
}
