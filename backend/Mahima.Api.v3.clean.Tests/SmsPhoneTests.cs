using Mahima.Api.v3.clean.Services;

namespace Mahima.Api.v3.clean.Tests;

public class SmsPhoneTests
{
    [Theory]
    [InlineData("+91 (708) 777-5465", "+917087775465")]
    [InlineData("+1 202 555 0123", "+12025550123")]
    [InlineData("7087775465", null)]
    [InlineData("+0123456789", null)]
    [InlineData("+123", null)]
    [InlineData("+917087775465<script>", null)]
    public void RequiresExplicitCountryCode(string input, string? expected) =>
        Assert.Equal(expected, SmsPhone.NormalizePhone(input));

}
