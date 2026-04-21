using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api")]
    public class LandingController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public LandingController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpGet("cms/landing")]
        public IActionResult GetLanding()
        {
            var path = Path.Combine(_env.WebRootPath, "config", "landing.json");
            if (!System.IO.File.Exists(path))
                return NotFound();

            return Content(System.IO.File.ReadAllText(path), "application/json");
        }

        [HttpPost("admin/landing")]
        public IActionResult SaveLanding([FromBody] JsonElement json)
        {
            var dir = Path.Combine(_env.WebRootPath, "config");
            Directory.CreateDirectory(dir);

            var path = Path.Combine(dir, "landing.json");
            System.IO.File.WriteAllText(
                path,
                JsonSerializer.Serialize(json, new JsonSerializerOptions { WriteIndented = true })
            );

            return Ok(new { success = true });
        }
    }
}
