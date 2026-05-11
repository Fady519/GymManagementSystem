using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GymManagementBLL.View_Models.MemberVm
{
    public class MemberToUpdateViewModel
    {
        public string Name { get; set; } = null!;

        public string? Photo { get; set; }



        [Required(ErrorMessage = "Email is Required")]
        [EmailAddress(ErrorMessage = "Invalid Email Format")] //App Validation
        [DataType(DataType.EmailAddress)] //UI Hint
        [StringLength(100, MinimumLength = 5, ErrorMessage = "Email must be between 5 and 100")]
        public string Email { get; set; }=null!;

        [Required(ErrorMessage = "Phone is Required")]
        [Phone(ErrorMessage = "Invalid Phone Format")]
        [RegularExpression(@"^(010|011|012|015)\d{8}$")]
        public string Phone { get; set; } = null!;


        [Required(ErrorMessage = "Building Number is Required")]
        [Range(1, 9000, ErrorMessage = "Building Number between 1 and 9000")]

        public int BuildingNumber { get; set; }

        [Required(ErrorMessage = "City is Required")]
        [StringLength(30, MinimumLength = 2, ErrorMessage = "City between 2 and 30")]
        [RegularExpression(@"^[a-zA-Z\s]+$", ErrorMessage = "City must contain letters or spaces only")]

        public string City { get; set; } = null!;

        [Required(ErrorMessage = "Street is Required")]
        [StringLength(30, MinimumLength = 2, ErrorMessage = "Street between 2 and 30")]
        [RegularExpression(@"^[a-zA-Z\s]+$", ErrorMessage = "Street must contain letters or spaces only")]

        public string Street { get; set; } = null!;

    }
}
