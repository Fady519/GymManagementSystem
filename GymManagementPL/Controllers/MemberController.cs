using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.View_Models.MemberVm;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementPL.Controllers
{
    public class MemberController : Controller
    {
        private readonly IMemberService _memberService;

        public MemberController(IMemberService memberService)
        {
            _memberService = memberService;
        }
        #region Get All Members
        public ActionResult Index()
        {
            var members = _memberService.GetAllMembers();
            return View(members);
        }
        #endregion

        #region Get Member Details
        //BaseUrl/Member/MemberDetails/5
        public ActionResult MemberDetails(int id)
        {
            // id => memberView Model
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id cannot be negative or zero";
                return RedirectToAction(nameof(Index));

            }

            var member = _memberService.GetMemberDetails(id);
            if (member is null)
            {
                TempData["ErrorMessage"] = "Member Not Found";
                return RedirectToAction(nameof(Index));

            }

            return View(member);
        }
        #endregion


        #region Get Health Record Details

        //BaseUrl/Member/HealthRecordDetails

        public ActionResult HealthRecordDetails(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id cannot be negative or zero";
                return RedirectToAction(nameof(Index));

            }


            var healthRecordData = _memberService.GetMemberHealthDetails(id);

            if (healthRecordData is null)
            {
                TempData["ErrorMessage"] = "HealthRecord Not Found";
                return RedirectToAction(nameof(Index));
            }
            return View(healthRecordData);
        }
        #endregion

        #region Create Member


        //BaseUrl/Member/Create
        //HTTPGET
        public ActionResult Create()
        {
            return View();
        }

        [HttpPost]
        public ActionResult CreateMember(CreateMemberViewModel CreateMember)
        {
            if (!ModelState.IsValid)
            {
                ModelState.AddModelError("DataInvalid", "There are missing Fields");
                return View(nameof(Create), CreateMember);
            }

            bool result = _memberService.CreateMember(CreateMember);
            if (result)
            {
                TempData["SuccessMessage"] = "Member Created Succesfully";
            }
            else
            {
                TempData["ErrorMessage"] = "Member failed to Create";
            }

            return RedirectToAction(nameof(Index));


        }
        #endregion

        #region Edit Member

        //GET
        //Member/MemberEdit/5
        public ActionResult MemberEdit(int id)
        {
            if(id<=0)
            {
                TempData["ErrorMessage"] = "Id Cannot Be negative or Zero";
                return RedirectToAction(nameof(Index));
            }

            var member=_memberService.GetMemberDetailsToUpdate(id);

            if(member is null)
            {
                TempData["ErrorMessage"] = "Member Not Found";
                return RedirectToAction(nameof(Index));
            }

            return View(member);
        }

        [HttpPost]
        public ActionResult MemberEdit([FromRoute]int id,MemberToUpdateViewModel UpdatedMember)
        {
            if (!ModelState.IsValid)
            {
                return View(UpdatedMember);
            }

            var result=_memberService.UpdateMember(id, UpdatedMember);

            if (result)
            {
                TempData["SuccessMessage"] = "Member Updated Successfully";
            }
            else
            {
                TempData["ErrorMessage"] = "Member Failed to Update";
            }

            return RedirectToAction(nameof(Index));


        }
        #endregion

        #region Delete Member 

        //Member/Delete/5
        public ActionResult Delete(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id Cannot Be negative or Zero";
                return RedirectToAction(nameof(Index));
            }

            var member = _memberService.GetMemberDetails(id);
            if( member is null)
            {
                TempData["ErrorMessage"] = "Member Not Found";
                return RedirectToAction(nameof(Index));
            }
            ViewBag.MemberId = id;
            ViewBag.MemberName = member.Name; 
            return View();
        }

        [HttpPost]

        public ActionResult DeleteConfirmed(int id)
        {
            var result = _memberService.RemoveMember(id);

            if (result)
            {
                TempData["SuccessMessage"] = "Member Deleted Succesfully";
            }
            else
            {
                TempData["ErrorMessage"] = "Member Failed to Delete";
            }

            return RedirectToAction(nameof(Index));
        }
        #endregion
    }
}
