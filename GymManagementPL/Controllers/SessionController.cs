using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementBLL.View_Models.SessionVms;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace GymManagementPL.Controllers
{
    public class SessionController : Controller
    {
        private readonly ISessionService _sessionService;

        public SessionController(ISessionService sessionService)
        {
            _sessionService = sessionService;
        }
        #region Get All Sessions
        public ActionResult Index()
        {
            var sessions = _sessionService.GetAllSessions();
            return View(sessions);
        }
        #endregion

        #region Session Details
        //Session/Details/6
        public ActionResult Details(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id Cannot be negative or zero";
                return RedirectToAction(nameof(Index));
            }

            var session = _sessionService.GetSessionDetails(id);

            if (session is null)
            {
                TempData["ErrorMessage"] = "Session not found";
                return RedirectToAction(nameof(Index));
            }

            return View(session);
        }
        #endregion

        #region Create Session

        //Session/Create
        public ActionResult Create()
        {

            LoadDropDowns();
            return View();
        }


        [HttpPost]
        public ActionResult Create(CreateSessionViewModel CreateSession)
        {
            if (!ModelState.IsValid)
            {
                LoadDropDowns();
                return View(CreateSession);
            }

            bool result = _sessionService.CreateSession(CreateSession);

            if (result)
            {
                TempData["SuccessMessage"] = "Session Created Succesfully";
                return RedirectToAction(nameof(Index));
            }
            else
            {
                LoadDropDowns();
                TempData["ErrorMessage"] = "Session Failed To Create";
                return View(CreateSession);
            }

        }
        #endregion

        #region Edit Session

        public ActionResult Edit(int id)
        {
            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id Cannot be negative or zero";
                return RedirectToAction(nameof(Index));
            }
            var session = _sessionService.GetSessionToUpdate(id);
            if (session is null)
            {
                TempData["ErrorMessage"] = "Session Not Found";
                return RedirectToAction(nameof(Index));
            }
            LoadDropDownForTrainersOnly();
            return View(session);
        }

        [HttpPost]
        public ActionResult Edit(int id,UpdateSessionViewModel updateSession)
        {
            if (!ModelState.IsValid)
            {
                LoadDropDownForTrainersOnly();
                return View(updateSession);
            }
            var result = _sessionService.UpdateSession(id,updateSession);
            if (result)
            {
                TempData["SuccessMessage"] = "Session Updated Successfully";
                return RedirectToAction(nameof(Index));
            }
            else
            {
                LoadDropDownForTrainersOnly();
                TempData["ErrorMessage"] = "Session Failed To Update";
                return View(updateSession);
            }
        }
        #endregion

        #region Delete Session 


        //Session/Delete/90
        public ActionResult Delete(int id)
        {

            if (id <= 0)
            {
                TempData["ErrorMessage"] = "Id Cannot be negative or zero";
                return RedirectToAction(nameof(Index));
            }

            var session = _sessionService.GetSessionDetails(id);

            if (session is null)
            {
                TempData["ErrorMessage"] = "Session Not Found";
                return RedirectToAction(nameof(Index));
            }
            ViewBag.SessionId = id;
            return View();
        }

        [HttpPost]

        //Session/DeleteConfirmed/6
        public ActionResult DeleteConfirmed(int id)
        {
            var result = _sessionService.DeleteSession(id);
            if (result)
            {
                TempData["SuccessMessage"] = "Session Deleted Successfully";
            }
            else
            {
                TempData["ErrorMessage"] = "Session Failed To Delete";
            }

            return RedirectToAction(nameof(Index));



        }
        #endregion

        #region Helper Methods
        private void LoadDropDowns()
        {
            var trainers = _sessionService.GetAllTrainersForDropDown();
            var categories = _sessionService.GetAllCategoriesForDropDown();

            ViewBag.Trainers = new SelectList(trainers, "Id", "Name");
            ViewBag.Categories = new SelectList(categories, "Id", "Name");
        }
        private void LoadDropDownForTrainersOnly()
        {
            var trainers = _sessionService.GetAllTrainersForDropDown();

            ViewBag.Trainers = new SelectList(trainers, "Id", "Name");
        }
        #endregion
    }
}
