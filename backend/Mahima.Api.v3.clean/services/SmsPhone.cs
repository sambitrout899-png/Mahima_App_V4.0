using System.Text.RegularExpressions;

namespace Mahima.Api.v3.clean.Services;

public static class SmsPhone
{
    public static string? NormalizePhone(string? phone)
    {
        var cleaned = Regex.Replace(phone?.Trim() ?? "", @"[\s().-]", "");
        return Regex.IsMatch(cleaned, @"^\+[1-9][0-9]{7,14}$") ? cleaned : null;
    }

}
