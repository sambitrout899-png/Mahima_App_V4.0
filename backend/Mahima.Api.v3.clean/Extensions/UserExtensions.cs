using System;
using System.Security.Claims;

namespace Mahima.Api.v3.clean.Extensions
{
    public static class UserExtensions
    {
        /// <summary>
        /// Returns the user's id from claims as a Guid.
        /// Expects either ClaimTypes.NameIdentifier or "sub" to contain a GUID string.
        /// Throws FormatException if the claim is missing or not a valid GUID.
        /// </summary>
        public static Guid GetUserIdGuid(this ClaimsPrincipal user)
        {
            var id = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? user.FindFirst("sub")?.Value;

            if (string.IsNullOrWhiteSpace(id))
                throw new InvalidOperationException("User id claim not found.");

            return Guid.Parse(id);
        }

        /// <summary>
        /// Safer Try-parse variant (optional). Returns true if parsed.
        /// </summary>
        public static bool TryGetUserIdGuid(this ClaimsPrincipal user, out Guid userId)
        {
            userId = Guid.Empty;
            var id = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? user.FindFirst("sub")?.Value;

            return Guid.TryParse(id, out userId);
        }
    }
}
