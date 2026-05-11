using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.View_Models.MembershipsVms;
using GymManagementDAL.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace GymManagementPL.Controllers
{
    public class MembershipController(IMembershipService membershipService) : Controller
    {
        public IActionResult Index()
        {
            var memberships = membershipService.GetAllMemberships();
            return View(memberships);
        }

        public IActionResult Create()
        {
            LoadDropdowns();
            return View();
        }

        [HttpPost]
        public IActionResult Create(CreateMembershipViewModel model)
        {
            if (ModelState.IsValid)
            {

                var result = membershipService.CreateMembership(model);

                if (result)
                {
                    TempData["SuccessMessage"] = "Membership created successfully";
                    return RedirectToAction("Index");
                }
                else
                {
                    TempData["ErrorMessage"] = "Membership can not be created";
                    return RedirectToAction("Index");

                }

            }

            TempData["ErrorMessage"] = "Creation failed, Check the data";
            LoadDropdowns();
            return View(model);
        }

        public IActionResult Cancel (int id)
        {
            var result = membershipService.DeleteMembership(id);

            if (result)
            {
                TempData["SuccessMessage"] = "Membership deleted successfully";
                return RedirectToAction("Index");
            }
            
            TempData["ErrorMessage"] = "Membership can not be deleted";
            return RedirectToAction("Index");


        }


        #region Helper Method

        public void LoadDropdowns()
        {
            var members = membershipService.GetMembersForDropDown();
            var plans = membershipService.GetPlansForDropDown();

            ViewBag.Members = new SelectList(members, "Id", "Name");
            ViewBag.Plans = new SelectList(plans, "Id", "Name");

        }

        #endregion
    }
}
