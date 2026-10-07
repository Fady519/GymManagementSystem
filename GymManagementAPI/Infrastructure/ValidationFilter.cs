using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using System.Text.Json;

namespace GymManagementAPI.Infrastructure
{
    /// <summary>
    /// Runs the registered FluentValidation validator (if any) for every action argument.
    /// On failure the action is not executed and a 400 ValidationProblemDetails is returned,
    /// with camelCase field names that match the JSON the client sent.
    /// </summary>
    internal sealed class ValidationFilter(ProblemDetailsFactory problemDetailsFactory) : IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            foreach (var argument in context.ActionArguments.Values)
            {
                if (argument is null)
                    continue;

                var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());

                if (context.HttpContext.RequestServices.GetService(validatorType) is not IValidator validator)
                    continue;

                var result = await validator.ValidateAsync(
                    new ValidationContext<object>(argument),
                    context.HttpContext.RequestAborted);

                if (result.IsValid)
                    continue;

                // A fresh dictionary: query-string binding already added keys like "PageSize",
                // and keys ignore case, so our camelCase names would be hidden.
                var errors = new ModelStateDictionary();
                foreach (var failure in result.Errors)
                {
                    var key = JsonNamingPolicy.CamelCase.ConvertName(failure.PropertyName);
                    errors.AddModelError(key, failure.ErrorMessage);
                }

                var problem = problemDetailsFactory.CreateValidationProblemDetails(
                    context.HttpContext,
                    errors,
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "One or more validation errors occurred.");

                problem.Extensions["code"] = "Validation.Failed";

                context.Result = new BadRequestObjectResult(problem);
                return;
            }

            await next();
        }
    }
}
