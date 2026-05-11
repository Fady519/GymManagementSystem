using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.View_Models.PlanVm;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementPL.Controllers
{
    public class PlanController : Controller
    {
        private readonly IPlanService _planService;

        public PlanController(IPlanService planService)
        {
            _planService = planService;
        }
        //GET :Index
        //GET:Details
        //GET:Data To Update
        //Post :Submit Update
        //Post :Activate
        #region Get All Plans Action
        public ActionResult Index()
        {
            var plans = _planService.GetAllPlans();
            return View(plans);
        }
        #endregion


        #region Details Action

        //Plan/Details/5
        public ActionResult Details(int id)
        {
            if(id<=0)
            {
                TempData["ErrorMessage"] = "Id Cannot Be negative or zero";

                return RedirectToAction(nameof(Index));
            }

            var plan=_planService.GetPlanDetails(id);

            if(plan is null)
            {
                TempData["ErrorMessage"] = "Plan Not Found";
                return RedirectToAction(nameof(Index));

            }

            return View(plan);
        }
        #endregion


        #region Plan Edit

        //GET:Edit

        //Plan/Edit/5
        public ActionResult Edit(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id Cannot Be Negative or zero";
                return RedirectToAction(nameof(Index));
            }

            var plan=_planService.GetPlanToUpdate(id);

            if(plan is null)
            {
                TempData["ErrorMessage"] = "Plan Not Found";
                return RedirectToAction(nameof(Index));
            }

            return View(plan);
        }

        [HttpPost]
        public ActionResult Edit([FromRoute] int id,PlanToUpdateViewModel UpdatedPlan)
        {
            if(!ModelState.IsValid)
            {
                ModelState.AddModelError("WrongData", "Check Data Validation");
                return View(UpdatedPlan);
            }

            var result=_planService.UpdatePlan(id, UpdatedPlan);

            if(result)
            {
                TempData["SuccessMessage"] = "Plan Succes To Update";
            }
            else
            {
                TempData["ErrorMessage"] = "Plan Failed To Update";
            }

            return RedirectToAction(nameof(Index));
        }
        #endregion


        [HttpPost]
        public ActionResult Activate(int id)
        {
            var result=_planService.ToggleStatus(id);

            if (result)
            {
                TempData["SuccessMessage"] = "Plan Toggled Succesfully";
            }
            else
            {
                TempData["ErrorMessage"] = "Plan Failed to Toggle";
            }

            return RedirectToAction(nameof(Index));
        }



    }
}
