using Mahima.Api.v3.clean.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace Mahima.Api.v3.clean.Data
{
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<MahimaDbContext>
    {
        public MahimaDbContext CreateDbContext(string[] args)
        {
            var basePath = Directory.GetCurrentDirectory();

            var config = new ConfigurationBuilder()
                .SetBasePath(basePath)
                .AddJsonFile("appsettings.json", optional: false)
                .Build();

            //var connectionString = config.GetConnectionString("Default");
	    var connectionString = config.GetConnectionString("DefaultConnection");

            var optionsBuilder = new DbContextOptionsBuilder<MahimaDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            return new MahimaDbContext(optionsBuilder.Options);
        }
    }
}
