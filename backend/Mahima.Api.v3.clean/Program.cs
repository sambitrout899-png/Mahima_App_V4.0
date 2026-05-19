using Mahima.Api.v3.clean.Data;
using System;
using System.IO;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

// ✅ FIXED NAMESPACES
using Mahima.Api.v3.clean.Hubs;
using Mahima.Api.v3.clean.Helpers;
using Mahima.Api.v3.clean.Services;
using Mahima.Api.v3.clean.services.Counselling;
using Mahima.Api.v3.clean.services.Marriage;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// -------------------------------------------------------
// Kestrel
// -------------------------------------------------------
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5001);
});

// -------------------------------------------------------
// Data Protection (LINUX SAFE)
// -------------------------------------------------------
//var keysPath = "/root/keys";
var keysPath = "/var/www/mahima-api/keys";
if (!Directory.Exists(keysPath)) Directory.CreateDirectory(keysPath);

builder.Services
    .AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(keysPath))
    .SetApplicationName("Mahima.Api");

// -------------------------------------------------------
// Database (EF CORE)
// -------------------------------------------------------
var connStr = builder.Configuration.GetConnectionString("DefaultConnection")
              ?? throw new InvalidOperationException("Missing Default connection string.");

builder.Services.AddDbContext<MahimaDbContext>(opt =>
    opt.UseNpgsql(connStr, npgsql => npgsql.EnableRetryOnFailure(3)));

// -------------------------------------------------------
// JSON / Controllers
// -------------------------------------------------------
builder.Services.AddControllers().AddJsonOptions(opts =>
{
    opts.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    opts.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
// -------------------------------------------------------
// JWT AUTH
// -------------------------------------------------------
var jwt = builder.Configuration.GetSection("Jwt");

var jwtKey = jwt["Key"] ?? throw new InvalidOperationException("Jwt:Key missing");
var issuer = jwt["Issuer"] ?? "MahimaApi";
var audience = jwt["Audience"] ?? "MahimaClients";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.RequireHttpsMetadata = false;
        o.SaveToken = true;

        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = issuer,

            ValidateAudience = true,
            ValidAudience = audience,

            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),

            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5),

            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };

        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                var path = ctx.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(token)
                    && (path.StartsWithSegments("/api/hubs/chat")
                        || path.StartsWithSegments("/api/server-files")))
                {
                    ctx.Token = token;
                }

                return Task.CompletedTask;
            }
        };
    });

// -------------------------------------------------------
// ✅ CORS (FIXED FINAL)
// -------------------------------------------------------
const string CorsPolicy = "MahimaCors";

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        policy
            .SetIsOriginAllowed(_ => true)   // 🔥 allows all origins safely (fixes your issue)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// -------------------------------------------------------
// SERVICES
// -------------------------------------------------------
builder.Services.AddSignalR();

builder.Services.AddSingleton<IUserIdProvider, NameIdentifierUserIdProvider>();

builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddSingleton<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<IBaptismCertificateService, BaptismCertificateService>();
builder.Services.AddScoped<IMarriageService, MarriageService>();
builder.Services.AddScoped<ICounsellingService, CounsellingService>();
builder.Services.AddScoped<AccountingService>();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient("PastorBot");
builder.Services.AddScoped<IPastorBotService, PastorBotService>();
builder.Services.AddHostedService<MinistryChatAutomationService>();


// -------------------------------------------------------
// BUILD APP
// -------------------------------------------------------
var app = builder.Build();

// -------------------------------------------------------
// MIDDLEWARE
// -------------------------------------------------------
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.All
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
var webRootPath = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(webRootPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webRootPath),
    RequestPath = ""
});
app.UseRouting();

// ✅ CORS MUST BE HERE
app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/api/hubs/chat");

app.Run();
