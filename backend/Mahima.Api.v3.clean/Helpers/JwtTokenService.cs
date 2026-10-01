// JwtTokenService.cs
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Mahima.Api.v3.clean.Helpers
{
    public class JwtTokenService
    {
        private readonly string _key;
        private readonly string _issuer;
        private readonly string _audience;
        private readonly int _expireMinutes;

        public JwtTokenService(IConfiguration config)
        {
            _key = config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key missing");
            _issuer = config["Jwt:Issuer"] ?? "MahimaApi";
            _audience = config["Jwt:Audience"] ?? "MahimaClients";
            // Mobile users should stay signed in like a chat app. Keep the
            // default token valid for 30 days unless production config
            // explicitly overrides Jwt:ExpireMinutes.
            var configuredMinutes = int.TryParse(config["Jwt:ExpireMinutes"], out var m) ? m : 43200;
            _expireMinutes = Math.Max(configuredMinutes, 43200);
        }

        public string GenerateToken(Guid userId, string username, string displayName, string role = "member", Guid? tenantId = null)
        {
            var roleName = role switch
            {
                "1" => "admin",
                "2" => "member",
                "10" => "volunteer",
                "11" => "staff",
                "12" => "pastor",
                _   => string.IsNullOrWhiteSpace(role) ? "member" : role
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var keyBytes = Encoding.UTF8.GetBytes(_key);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, username ?? string.Empty),
                new Claim("name", string.IsNullOrWhiteSpace(displayName) ? (username ?? string.Empty) : displayName),
                new Claim(ClaimTypes.Role, roleName),
                new Claim("role_code", role ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };
            if (tenantId.HasValue && tenantId.Value != Guid.Empty)
                claims.Add(new Claim("tenant_id", tenantId.Value.ToString()));

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(_expireMinutes),
                Issuer = _issuer,
                Audience = _audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(keyBytes),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
