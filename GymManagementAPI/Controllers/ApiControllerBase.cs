using GymManagementBLL.Common;
using Microsoft.AspNetCore.Mvc;

namespace GymManagementAPI.Controllers
{
    /// <summary>
    /// Base class for all API controllers. Converts business <see cref="Error"/>s
    /// into RFC 7807 ProblemDetails responses with a machine-readable "code".
    /// </summary>
    [ApiController]
    public abstract class ApiControllerBase : ControllerBase
    {
        protected ObjectResult Problem(Error error)
        {
            var (status, title) = error.Type switch
            {
                ErrorType.Validation => (StatusCodes.Status400BadRequest, "Validation error"),
                ErrorType.NotFound => (StatusCodes.Status404NotFound, "Not found"),
                ErrorType.Conflict => (StatusCodes.Status409Conflict, "Conflict"),
                ErrorType.Unauthorized => (StatusCodes.Status401Unauthorized, "Unauthorized"),
                ErrorType.Forbidden => (StatusCodes.Status403Forbidden, "Forbidden"),
                _ => (StatusCodes.Status500InternalServerError, "Server error")
            };

            var problem = ProblemDetailsFactory.CreateProblemDetails(
                HttpContext,
                statusCode: status,
                title: title,
                detail: error.Message);

            problem.Extensions["code"] = error.Code;

            return new ObjectResult(problem) { StatusCode = status };
        }
    }
}
