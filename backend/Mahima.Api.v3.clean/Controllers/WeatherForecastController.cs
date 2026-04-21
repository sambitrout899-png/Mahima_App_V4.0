using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class WeatherForecastController : ControllerBase
    {
        private static readonly string[] Summaries = new[]
        {
            "Freezing","Bracing","Chilly","Cool","Mild","Warm","Balmy","Hot","Sweltering","Scorching"
        };

        // GET /WeatherForecast
        [HttpGet]
        public IEnumerable<object> Get()
        {
            var rng = new Random();
            return Enumerable.Range(1, 5).Select(index => new
            {
                Date = DateTime.UtcNow.AddDays(index).ToString("yyyy-MM-dd"),
                TemperatureC = rng.Next(-20, 55),
                Summary = Summaries[rng.Next(Summaries.Length)]
            });
        }
    }
}
