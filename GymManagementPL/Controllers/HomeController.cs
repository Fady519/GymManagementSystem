using GymManagementBLL.BusinessServices.Interfaces;
using GymManagementDAL.Entities;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementPL.Controllers
{

    //BaseUrl/Home/Index
    public class HomeController : Controller
    {
        private readonly IAnaltyicService _analtyicService;

        public HomeController(IAnaltyicService analtyicService)
        {
          _analtyicService = analtyicService;
        }
        //BaseUrl/Home/Index
        public ActionResult Index()
        {
            var data = _analtyicService.GetHomeAnalyticsService();
            //return View();  //Return Default View [View with same name of action] without any data

            return View(data); // Return Default view [View with same name of action] with passing model

            // return View("Hamada"); //Return Specific View [Passing its name]

           // return View("Hamada", data); //Return specific View Passing its name and passing to it dynamic data



        }

        #region Actions
        //public ViewResult Index()
        //{
        //       return View();
        //}





        ////BaseUrl/Home/Trainers
        //public JsonResult Trainers()
        //{
        //    var trainers=new List<Trainer>()
        //    {
        //        new Trainer(){Name="Khaled",Phone="01023339896"},
        //        new Trainer(){Name="Ziad",Phone="01024569896"},
        //    };

        //    return Json(trainers);
        //}

        ////BaseUrl/Home/Redirect
        //public RedirectResult Redirect()
        //{
        //    return Redirect("https://www.facebook.com/");
        //}

        ////Home/GetContent
        //public ContentResult GetContent()
        //{
        //    return Content("<h1>Hello From Gold's Gym</h1>","text/html");
        //}

        ////Home/DownloadFile
        //public FileResult DownloadFile()
        //{
        //    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "css", "site.css");


        //    var fileBytes=System.IO.File.ReadAllBytes(filePath);


        //    return File(fileBytes, "text/csss", "KhaledStyle.csss");
        //} 
        #endregion

    }
}
