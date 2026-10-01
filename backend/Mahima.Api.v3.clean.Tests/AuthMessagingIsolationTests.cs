using System.Reflection;
using Mahima.Api.v3.clean.Helpers;
using Mahima.Api.v3.clean.Hubs;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Mahima.Api.v3.clean.Tests;

public class AuthMessagingIsolationTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LoginControllerLoadsWithoutResolvingOptionalSms(bool brokenSmsRegistration)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=unused;Database=unused",
            ["Jwt:Key"] = "unit-test-key-that-is-not-used-to-sign-tokens"
        }).Build();
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddLogging();
        services.AddSingleton<JwtTokenService>();
        services.AddSingleton(DispatchProxy.Create<IEmailService, NoCallsProxy>());
        services.AddSingleton(DispatchProxy.Create<IPastorBotService, NoCallsProxy>());
        services.AddSingleton(DispatchProxy.Create<IHubContext<ChatHub>, NoCallsProxy>());
        if (brokenSmsRegistration)
            services.AddScoped<MinistrySmsDelivery>(_ => throw new InvalidOperationException("Simulated incomplete SMS setup"));
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var controller = ActivatorUtilities.CreateInstance<AuthController>(scope.ServiceProvider);
        // Reaches the login action without opening a DB connection or touching SMS.
        Assert.IsType<BadRequestObjectResult>(await controller.Login(new AuthController.LoginDto()));
    }

    public class NoCallsProxy : DispatchProxy
    {
        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) =>
            throw new InvalidOperationException("Unexpected dependency call: " + targetMethod?.Name);
    }
}
