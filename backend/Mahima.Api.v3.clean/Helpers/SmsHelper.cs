// File: Helpers/SmsHelper.cs
using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Twilio;
using Twilio.Exceptions;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace Mahima.Api.v3.clean.Helpers
{
    /// <summary>
    /// Static facade preserving the previous static API (Initialize, SendSmsAsync, SendWhatsappAsync).
    /// Internally holds an instance-based implementation to make later DI refactors straightforward.
    /// </summary>
    public static class SmsHelper
    {
        private static SmsHelperInstance? _instance;
        private static readonly object _sync = new object();

        /// <summary>
        /// Initialize with IConfiguration (optional). If null, environment variables will be used.
        /// </summary>
        public static void Initialize(IConfiguration? configuration = null)
        {
            if (_instance != null) return;
            lock (_sync)
            {
                if (_instance == null)
                {
                    _instance = new SmsHelperInstance(configuration, null);
                }
            }
        }

        /// <summary>
        /// Initialize with IConfiguration and ILogger - matches call-sites that provide logger too.
        /// </summary>
        public static void Initialize(IConfiguration? configuration, ILogger? logger)
        {
            if (_instance != null) return;
            lock (_sync)
            {
                if (_instance == null)
                {
                    _instance = new SmsHelperInstance(configuration, logger);
                }
            }
        }

        /// <summary>
        /// Initialize with AccountSid and AuthToken (two-arg overload).
        /// </summary>
        public static void Initialize(string accountSid, string authToken)
        {
            Initialize(accountSid, authToken, null, null);
        }

        /// <summary>
        /// Initialize with explicit accountSid, authToken, fromNumber and messagingServiceSid.
        /// Pass null for optional values.
        /// </summary>
        public static void Initialize(string accountSid, string authToken, string? fromNumber, string? messagingServiceSid)
        {
            if (_instance != null) return;
            lock (_sync)
            {
                if (_instance == null)
                {
                    _instance = new SmsHelperInstance(accountSid, authToken, fromNumber, messagingServiceSid, null);
                }
            }
        }

        public static Task<(bool Success, string? ErrorMessage)> SendSmsAsync(string toPhone, string body, ILogger? logger = null)
        {
            EnsureInstance();
            return _instance!.SendSmsAsync(toPhone, body, logger);
        }

        public static Task<(bool Success, string? ErrorMessage)> SendWhatsappAsync(string toPhone, string body, ILogger? logger = null)
        {
            EnsureInstance();
            return _instance!.SendWhatsappAsync(toPhone, body, logger);
        }

        private static void EnsureInstance()
        {
            if (_instance == null)
            {
                // try to initialize with environment variables only if Initialize was not called
                Initialize(null);
            }
        }

        // -------------------------
        // Internal instance class
        // -------------------------
        private class SmsHelperInstance
        {
            private readonly IConfiguration? _configuration;
            private readonly ILogger? _logger;
            private readonly string? _accountSid;
            private readonly string? _authToken;
            private readonly string? _fromNumber;             // used for SMS and WhatsApp (raw E.164)
            private readonly string? _messagingServiceSid;

            // constructor used when IConfiguration provided or when Initialize(null) is used
            public SmsHelperInstance(IConfiguration? configuration = null, ILogger? logger = null)
            {
                _configuration = configuration;
                _logger = logger;

                _accountSid = GetConfig("Twilio:AccountSid") ?? GetConfig("TWILIO_ACCOUNT_SID");
                _authToken = GetConfig("Twilio:AuthToken") ?? GetConfig("TWILIO_AUTH_TOKEN");

                // Accept both Twilio:FromNumber and Twilio:WhatsAppFrom/env names
                _fromNumber = GetConfig("Twilio:FromNumber")
                              ?? GetConfig("TWILIO_FROM_NUMBER")
                              ?? GetConfig("Twilio:WhatsAppFrom")
                              ?? GetConfig("TWILIO_WHATSAPP_FROM");

                _messagingServiceSid = GetConfig("Twilio:MessagingServiceSid") ?? GetConfig("TWILIO_MESSAGING_SERVICE_SID");

                if (!string.IsNullOrWhiteSpace(_accountSid) && !string.IsNullOrWhiteSpace(_authToken))
                {
                    try
                    {
                        TwilioClient.Init(_accountSid, _authToken);
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogWarning(ex, "TwilioClient.Init failed during SmsHelper initialization.");
                    }
                }
                else
                {
                    _logger?.LogWarning("Twilio credentials not found during SmsHelper initialization. Ensure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set.");
                }
            }

            // constructor used when explicit values passed
            public SmsHelperInstance(string accountSid, string authToken, string? fromNumber, string? messagingServiceSid, ILogger? logger = null)
            {
                _configuration = null;
                _logger = logger;

                _accountSid = accountSid;
                _authToken = authToken;
                _fromNumber = fromNumber;
                _messagingServiceSid = messagingServiceSid;

                if (!string.IsNullOrWhiteSpace(_accountSid) && !string.IsNullOrWhiteSpace(_authToken))
                {
                    try
                    {
                        TwilioClient.Init(_accountSid, _authToken);
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogWarning(ex, "TwilioClient.Init failed during SmsHelper explicit initialization.");
                    }
                }
                else
                {
                    _logger?.LogWarning("Twilio credentials not found during SmsHelper explicit initialization.");
                }
            }

            private string? GetConfig(string key)
            {
                return _configuration?[key] ?? Environment.GetEnvironmentVariable(key);
            }

            // helper: normalize E.164 for SMS (strip any whatsapp: prefix)
            private string NormalizeE164(string n)
            {
                if (string.IsNullOrWhiteSpace(n)) return n ?? string.Empty;
                n = n.Trim();

                // if someone passed "whatsapp:+9198..." remove the whatsapp: part for SMS path
                if (n.StartsWith("whatsapp:", StringComparison.OrdinalIgnoreCase))
                {
                    n = n.Substring("whatsapp:".Length);
                }

                if (!n.StartsWith("+")) n = "+" + n;
                return n;
            }

            // helper: normalize WhatsApp number: ensure "whatsapp:+..." prefix
            private string NormalizeWhatsAppNumber(string n)
            {
                if (string.IsNullOrWhiteSpace(n)) return n ?? string.Empty;
                n = n.Trim();

                // allow inputs with or without whatsapp: prefix
                if (!n.StartsWith("whatsapp:", StringComparison.OrdinalIgnoreCase))
                {
                    if (!n.StartsWith("+")) n = "+" + n;
                    return $"whatsapp:{n}";
                }
                return n;
            }

            public async Task<(bool Success, string? ErrorMessage)> SendSmsAsync(string toPhone, string body, ILogger? logger = null)
            {
                var log = logger ?? _logger;
                try
                {
                    if (string.IsNullOrWhiteSpace(_accountSid) || string.IsNullOrWhiteSpace(_authToken))
                    {
                        var em = "Twilio credentials missing (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN).";
                        log?.LogError(em);
                        return (false, em);
                    }

                    if (string.IsNullOrWhiteSpace(toPhone))
                    {
                        var em = "Destination phone number is empty.";
                        log?.LogError(em);
                        return (false, em);
                    }

                    // Ensure the phone passed to SMS is plain E.164 (no whatsapp: prefix)
                    var toE164 = NormalizeE164(toPhone);
                    var fromE164 = !string.IsNullOrWhiteSpace(_fromNumber) ? NormalizeE164(_fromNumber) : null;

                    log?.LogInformation("Sending SMS -> To: {To}, From: {From}, Using MessagingService: {Ms}", toE164, fromE164, _messagingServiceSid);

                    var to = new PhoneNumber(toE164);
                    MessageResource message;

                    if (!string.IsNullOrWhiteSpace(_messagingServiceSid))
                    {
                        message = await MessageResource.CreateAsync(
                            to: to,
                            messagingServiceSid: _messagingServiceSid,
                            body: body
                        );
                    }
                    else if (!string.IsNullOrWhiteSpace(fromE164))
                    {
                        message = await MessageResource.CreateAsync(
                            to: to,
                            from: new PhoneNumber(fromE164),
                            body: body
                        );
                    }
                    else
                    {
                        var em = "No SMS sender configured. Set TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID.";
                        log?.LogError(em);
                        return (false, em);
                    }

                    log?.LogInformation("SMS sent. SID: {Sid}", message?.Sid);
                    return (true, null);
                }
                catch (ApiException aex)
                {
                    log?.LogError(aex, "Twilio API Exception (SMS): Code={Code}, Message={Message}, MoreInfo={MoreInfo}", aex.Code, aex.Message, aex.MoreInfo);
                    return (false, $"Twilio API error: {aex.Message}");
                }
                catch (Exception ex)
                {
                    log?.LogError(ex, "Unexpected error sending SMS");
                    return (false, ex.Message);
                }
            }

            public async Task<(bool Success, string? ErrorMessage)> SendWhatsappAsync(string toPhone, string body, ILogger? logger = null)
            {
                var log = logger ?? _logger;
                try
                {
                    if (string.IsNullOrWhiteSpace(_accountSid) || string.IsNullOrWhiteSpace(_authToken))
                    {
                        var em = "Twilio credentials missing (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN).";
                        log?.LogError(em);
                        return (false, em);
                    }

                    if (string.IsNullOrWhiteSpace(toPhone))
                    {
                        var em = "Destination phone number is empty.";
                        log?.LogError(em);
                        return (false, em);
                    }

                    var toWhats = NormalizeWhatsAppNumber(toPhone);
                    string? fromWhats = null;
                    if (!string.IsNullOrWhiteSpace(_fromNumber)) fromWhats = NormalizeWhatsAppNumber(_fromNumber);

                    log?.LogInformation("Sending WhatsApp -> To: {To}, From: {From}, Using MessagingService: {Ms}", toWhats, fromWhats, _messagingServiceSid);

                    // init Twilio client (safe to call multiple times)
                    if (!string.IsNullOrWhiteSpace(_accountSid) && !string.IsNullOrWhiteSpace(_authToken))
                    {
                        try { TwilioClient.Init(_accountSid, _authToken); } catch { /* ignore init issues here */ }
                    }

                    MessageResource? message = null;

                    if (!string.IsNullOrWhiteSpace(_messagingServiceSid))
                    {
                        message = await MessageResource.CreateAsync(
                            to: new PhoneNumber(toWhats),
                            messagingServiceSid: _messagingServiceSid,
                            body: body
                        );
                    }
                    else if (!string.IsNullOrWhiteSpace(fromWhats))
                    {
                        message = await MessageResource.CreateAsync(
                            to: new PhoneNumber(toWhats),
                            from: new PhoneNumber(fromWhats),
                            body: body
                        );
                    }
                    else
                    {
                        var em = "No WhatsApp sender configured. Set TWILIO_WHATSAPP_FROM or TWILIO_MESSAGING_SERVICE_SID.";
                        log?.LogError(em);
                        return (false, em);
                    }

                    log?.LogInformation("WhatsApp message sent. SID: {Sid}", message?.Sid);
                    return (true, null);
                }
                catch (ApiException aex)
                {
                    log?.LogError(aex, "Twilio API Exception (WhatsApp): Code={Code}, Message={Message}, MoreInfo={MoreInfo}", aex.Code, aex.Message, aex.MoreInfo);
                    return (false, $"Twilio API error: {aex.Message}");
                }
                catch (Exception ex)
                {
                    log?.LogError(ex, "Unexpected error sending WhatsApp");
                    return (false, ex.Message);
                }
            }
        }
    }
}
