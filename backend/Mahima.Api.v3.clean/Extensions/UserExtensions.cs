using System;
using System.Security.Claims;

namespace Mahima.Api.v3.clean.Extensions
{
    public static class UserExtensions
    {
        /// <summary>
        /// Returns the user's id from claims as a Guid.
        /// Expects ClaimTypes.NameIdentifier, "sub", or "nameid" to contain a GUID string.
        /// Returns Guid.Empty when the claim is missing or invalid so controllers can return Unauthorized.
        /// </summary>
        public static Guid GetUserIdGuid(this ClaimsPrincipal user)
        {
            var id = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? user.FindFirst("sub")?.Value
                     ?? user.FindFirst("nameid")?.Value;

            if (string.IsNullOrWhiteSpace(id))
                return Guid.Empty;

            return Guid.TryParse(id, out var guid) ? guid : Guid.Empty;
        }

        /// <summary>
        /// Safer Try-parse variant (optional). Returns true if parsed.
        /// </summary>
        public static bool TryGetUserIdGuid(this ClaimsPrincipal user, out Guid userId)
        {
            userId = Guid.Empty;
            var id = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? user.FindFirst("sub")?.Value
                     ?? user.FindFirst("nameid")?.Value;

            return Guid.TryParse(id, out userId);
        }

        public static Guid GetTenantIdGuid(this ClaimsPrincipal user)
        {
            var id = user.FindFirst("tenant_id")?.Value;
            return Guid.TryParse(id, out var guid) ? guid : Guid.Empty;
        }
    }
}
