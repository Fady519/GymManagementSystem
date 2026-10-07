using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace GymManagementAPI.Infrastructure
{
    /// <summary>
    /// Makes the Swagger document tell the truth about security, endpoint by endpoint:
    /// - [AllowAnonymous] endpoints (login, forgot-password...) get no lock icon.
    /// - Every other endpoint gets the lock icon and a documented 401.
    /// - Endpoints limited to some roles (a policy) also get a documented 403.
    /// - Rate-limited endpoints get a documented 429.
    /// The generated openapi.json is used by the frontend, so these responses matter.
    /// </summary>
    internal sealed class AuthResponsesOperationFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            var metadata = context.ApiDescription.ActionDescriptor.EndpointMetadata;
            operation.Responses ??= [];

            if (metadata.OfType<EnableRateLimitingAttribute>().Any())
                AddProblemResponse(operation, context, StatusCodes.Status429TooManyRequests, "Too many attempts. Wait a minute and try again.");

            if (metadata.OfType<IAllowAnonymous>().Any())
                return;

            operation.Security =
            [
                new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("Bearer", context.Document)] = []
                }
            ];

            AddProblemResponse(operation, context, StatusCodes.Status401Unauthorized, "Missing, invalid or expired access token.");

            if (metadata.OfType<IAuthorizeData>().Any(a => a.Policy is not null || a.Roles is not null))
                AddProblemResponse(operation, context, StatusCodes.Status403Forbidden, "Your role is not allowed to do this.");
        }

        private static void AddProblemResponse(OpenApiOperation operation, OperationFilterContext context, int statusCode, string description)
        {
            var key = statusCode.ToString();
            if (operation.Responses!.ContainsKey(key))
                return; // the action documented it itself (with a more specific description)

            operation.Responses[key] = new OpenApiResponse
            {
                Description = description,
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["application/problem+json"] = new()
                    {
                        Schema = context.SchemaGenerator.GenerateSchema(typeof(ProblemDetails), context.SchemaRepository),
                    },
                },
            };
        }
    }
}
