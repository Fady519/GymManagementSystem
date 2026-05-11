using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.View_Models.TrainerVm;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementPL.Controllers
{
    public class TrainerController : Controller
    {
        private readonly ITrainerService _trainerService;

        public TrainerController(ITrainerService trainerService)
        {
           _trainerService = trainerService;
        }
        #region Get All Trainers
        public ActionResult Index()
        {
            var trainers = _trainerService.GetAllTrainers();
            return View(trainers);
        }
        #endregion

        #region Get Trainer Details
        public ActionResult Details(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Invalid Trainer Id cannot be negative or zero";
                return RedirectToAction(nameof(Index));
            }

            var trainer = _trainerService.GetTrainerDetails(id);

            if (trainer is null)
            {
                TempData["ErrorMessage"] = "No Trainer Found";
                return RedirectToAction(nameof(Index));
            }

            return View(trainer);
        }
        #endregion

        #region Create Trainer
        public ActionResult Create()
        {
            return View();
        }

        [HttpPost]

        public ActionResult CreateTrainer(CreateTrainerViewModel createTrainer)
        {
            if (!ModelState.IsValid)
            {
                ModelState.AddModelError("wrongData", "Please correct the errors and try again.");
                return View(nameof(Create), createTrainer);
            }

            var result = _trainerService.CreateTrainer(createTrainer);

            if (result)
            {
                TempData["SuccessMessage"] = "Trainer Created Successfully";

            }
            else
            {
                TempData["ErrorMessage"] = "Failed to Create Trainer";
            }

            return RedirectToAction(nameof(Index));

        }
        #endregion


        #region Edit Trainer
        public ActionResult Edit(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Invalid Trainer Id cannot be negative or zero";
                return RedirectToAction(nameof(Index));
            }

            var trainerToUpdate = _trainerService.GetTrainerToUpdate(id);

            if (trainerToUpdate is null)
            {
                TempData["ErrorMessage"] = "No Trainer Found";
                return RedirectToAction(nameof(Index));
            }

            return View(trainerToUpdate);
        }

        [HttpPost]
        public ActionResult Edit(int id, TrainerToUpdateViewModel updateTrainer)
        {
            if (!ModelState.IsValid)
            {
                return View(updateTrainer);
            }

            var result = _trainerService.UpdateTrainer(id, updateTrainer);

            if (result)
            {
                TempData["SuccessMessage"] = "Trainer Updated Successfully";
            }
            else
            {
                TempData["ErrorMessage"] = "Failed to Update Trainer";
            }

            return RedirectToAction(nameof(Index));
        } 
        #endregion

        public ActionResult Delete(int id)
        {
            if(id <= 0)
            {
                TempData["ErrorMessage"] = "Invalid Trainer Id cannot be negative or zero";
                return RedirectToAction(nameof(Index));
            }

            var trainer=_trainerService.GetTrainerDetails(id);
            if(trainer is null)
            {
                TempData["ErrorMessage"] = "No Trainer Found";
                return RedirectToAction(nameof(Index));
            }

            ViewBag.TrainerId= id;

            return View();
        }

        [HttpPost]

        public ActionResult DeleteConfirmed(int id)
        {

            var result = _trainerService.DeleteTrainer(id);
            if (result)
            {
                TempData["SuccessMessage"] = "Trainer Deleted Successfully";
            }
            else
            {
                TempData["ErrorMessage"] = "Failed to Delete Trainer";
            }
            return RedirectToAction(nameof(Index));

        }





    }
}
