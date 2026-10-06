using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.DTOs.Plans;
using GymManagementBLL.View_Models.PlanVm;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementPL.Controllers
{
    // LEGACY (MVC): kept working on top of the new async IPlanService until the
    // MVC project is removed from the solution in B2. The API equivalent is
    // GymManagementAPI/Controllers/PlansController.cs.
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
        public async Task<ActionResult> Index()
        {
            var plans = await _planService.GetAllAsync();
            return View(plans.Select(ToViewModel));
        }
        #endregion


        #region Details Action

        //Plan/Details/5
        public async Task<ActionResult> Details(int id)
        {
            if(id<=0)
            {
                TempData["ErrorMessage"] = "Id Cannot Be negative or zero";

                return RedirectToAction(nameof(Index));
            }

            var result = await _planService.GetByIdAsync(id);

            if(result.IsFailure)
            {
                TempData["ErrorMessage"] = result.Error.Message;
                return RedirectToAction(nameof(Index));

            }

            return View(ToViewModel(result.Value));
        }
        #endregion


        #region Plan Edit

        //GET:Edit

        //Plan/Edit/5
        public async Task<ActionResult> Edit(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id Cannot Be Negative or zero";
                return RedirectToAction(nameof(Index));
            }

            var result = await _planService.GetByIdAsync(id);

            if(result.IsFailure || !result.Value.IsActive)
            {
                TempData["ErrorMessage"] = result.IsFailure ? result.Error.Message : "Inactive plans cannot be edited";
                return RedirectToAction(nameof(Index));
            }

            var plan = result.Value;

            return View(new PlanToUpdateViewModel
            {
                Name = plan.Name,
                Description = plan.Description,
                DurationDays = plan.DurationDays,
                Price = plan.Price,
            });
        }

        [HttpPost]
        public async Task<ActionResult> Edit([FromRoute] int id,PlanToUpdateViewModel UpdatedPlan)
        {
            if(!ModelState.IsValid)
            {
                ModelState.AddModelError("WrongData", "Check Data Validation");
                return View(UpdatedPlan);
            }

            var result = await _planService.UpdateAsync(id, new UpdatePlanRequest(
                UpdatedPlan.Name, UpdatedPlan.Description, UpdatedPlan.DurationDays, UpdatedPlan.Price));

            if(result.IsSuccess)
            {
                TempData["SuccessMessage"] = "Plan Succes To Update";
            }
            else
            {
                TempData["ErrorMessage"] = result.Error.Message;
            }

            return RedirectToAction(nameof(Index));
        }
        #endregion


        [HttpPost]
        public async Task<ActionResult> Activate(int id)
        {
            var current = await _planService.GetByIdAsync(id);

            if (current.IsFailure)
            {
                TempData["ErrorMessage"] = current.Error.Message;
                return RedirectToAction(nameof(Index));
            }

            var result = await _planService.SetStatusAsync(id, !current.Value.IsActive);

            if (result.IsSuccess)
            {
                TempData["SuccessMessage"] = "Plan Toggled Succesfully";
            }
            else
            {
                TempData["ErrorMessage"] = result.Error.Message;
            }

            return RedirectToAction(nameof(Index));
        }


        private static PlanViewModel ToViewModel(PlanResponse plan) => new()
        {
            Id = plan.Id,
            Name = plan.Name,
            Description = plan.Description,
            DurationDays = plan.DurationDays,
            Price = plan.Price,
            IsActive = plan.IsActive,
        };

    }
}
