// JwtTokenService.cs
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
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
            _expireMinutes = int.TryParse(config["Jwt:ExpireMinutes"], out var m) ? m : 60;
        }

        public string GenerateToken(Guid userId, string username, string displayName, string role = "member")
        {
            var roleName = role switch
            {
                "3" => "admin",
                "2" => "moderator",
                "1" => "member",
                _   => string.IsNullOrWhiteSpace(role) ? "member" : role
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var keyBytes = Encoding.UTF8.GetBytes(_key);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, username ?? string.Empty),
                new Claim("name", string.IsNullOrWhiteSpace(displayName) ? (username ?? string.Empty) : displayName),
                new Claim(ClaimTypes.Role, roleName),
                new Claim("role_code", role ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

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
