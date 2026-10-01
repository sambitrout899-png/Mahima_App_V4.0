namespace Mahima.Api.v3.clean.Services;

public static class SmsCostPolicy
{
    private const string Basic = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
    private const string Extended = "\f^{}\\[~]|€";

    public static int Segments(string text)
    {
        if (text.Length == 0) return 0;
        var units = 0;
        foreach (var c in text)
        {
            if (Basic.Contains(c)) units++;
            else if (Extended.Contains(c)) units += 2;
            else return text.Length <= 70 ? 1 : (text.Length + 66) / 67;
        }
        return units <= 160 ? 1 : (units + 152) / 153;
    }

    public static string Notification(string? type) => type?.Replace("saturday-church-reminder", "sunday-church-reminder") switch
    {
        "sunday-church-reminder" => "रविवार आराधना सभा - Universal School, Gurunanak Nagar - Jalandhar 144008 - ऑनलाइन जुड़ें: https://www.youtube.com/@MahimaMinistry-r8h-",
        "daily-word" => "आज का वचन महिमा ऐप में पढ़ें।",
        "night-prayer" => "रात्रि प्रार्थना महिमा ऐप में पढ़ें।",
        "welcome" => "जय मसीह! स्वागत संदेश ऐप में पढ़ें।",
        _ => "नया संदेश महिमा ऐप में पढ़ें।"
    };

    public static bool IsNotification(string message) =>
        new[] { "sunday-church-reminder", "daily-word", "night-prayer", "welcome", "custom" }
            .Any(type => Notification(type) == message);

    // Only the approved, exact Sunday template receives the three-segment exception.
    public static int SegmentLimit(string message, int defaultLimit = 1) =>
        message == Notification("sunday-church-reminder") ? 3 : Math.Clamp(defaultLimit, 1, 10);

    public static string Compact(string message) =>
        TwilioSmsService.BuildParts(message).Sum(Segments) <= SegmentLimit(message) ? message : Notification(null);
}
