using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        // GET api/health
        [HttpGet]
        public IActionResult Get()
        {
            // Simple health check response
            return Ok(new { status = "Healthy" });
        }

        // GET api/health/ready
        [HttpGet("ready")]
        public IActionResult Ready()
        {
            // Readiness probe (adjust as needed)
            return Ok(new { ready = true });
        }

        // GET api/health/liveness (example async endpoint if you need one)
        [HttpGet("liveness")]
        public async Task<IActionResult> Liveness()
        {
            // If you need async checks, keep them here.
            await Task.CompletedTask;
            return Ok(new { alive = true });
        }
    }
}
