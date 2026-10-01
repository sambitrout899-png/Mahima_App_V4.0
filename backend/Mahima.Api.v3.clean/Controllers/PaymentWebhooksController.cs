using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    public class PaymentWebhooksController : ControllerBase
    {
        private readonly MahimaDbContext _db;
        private readonly ILicensingService _licensing;
        private readonly IConfiguration _config;
        private readonly ILogger<PaymentWebhooksController> _logger;

        public PaymentWebhooksController(
            MahimaDbContext db,
            ILicensingService licensing,
            IConfiguration config,
            ILogger<PaymentWebhooksController> logger)
        {
            _db = db;
            _licensing = licensing;
            _config = config;
            _logger = logger;
        }

        [AllowAnonymous]
        [HttpPost("/api/billing/webhooks/razorpay")]
        public async Task<IActionResult> Razorpay(CancellationToken ct)
        {
            using var reader = new StreamReader(Request.Body, Encoding.UTF8);
            var payload = await reader.ReadToEndAsync();
            var signature = Request.Headers["X-Razorpay-Signature"].FirstOrDefault();
            var secret = _config["Billing:RazorpayWebhookSecret"];

            if (string.IsNullOrWhiteSpace(secret))
                return StatusCode(503, new { message = "Razorpay webhook secret is not configured." });

            if (!IsValidRazorpaySignature(payload, signature, secret))
                return Unauthorized(new { message = "Invalid Razorpay signature." });

            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;
            var eventType = root.TryGetProperty("event", out var eventNode) ? eventNode.GetString() : "razorpay";
            var providerEventId = root.TryGetProperty("id", out var eventIdNode) ? eventIdNode.GetString() : null;

            if (!string.IsNullOrWhiteSpace(providerEventId) &&
                await _db.PaymentEvents.AnyAsync(e => e.ProviderEventId == providerEventId, ct))
            {
                return Ok(new { status = "duplicate", providerEventId });
            }

            var payment = ExtractPayment(root);
            if (payment == null)
            {
                _logger.LogWarning("Razorpay webhook did not include payment entity: {EventType}", eventType);
                return Ok(new { status = "ignored", eventType });
            }

            var paymentId = GetString(payment.Value, "id");
            var orderId = GetString(payment.Value, "order_id");
            var intentId = GetIntentId(payment.Value);

            var intent = await FindPaymentIntentAsync(intentId, orderId, ct);
            if (intent == null)
                return NotFound(new { message = "No matching payment intent.", orderId, intentId });

            _db.PaymentEvents.Add(new PaymentEvent
            {
                PaymentIntentId = intent.Id,
                EventType = eventType ?? "razorpay.payment",
                ProviderEventId = providerEventId,
                PayloadJson = payload
            });

            if (string.Equals(eventType, "payment.captured", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(GetString(payment.Value, "status"), "captured", StringComparison.OrdinalIgnoreCase))
            {
                intent.Status = "paid";
                intent.ProviderPaymentId = paymentId;
                intent.ProviderOrderId = string.IsNullOrWhiteSpace(intent.ProviderOrderId) ? orderId : intent.ProviderOrderId;
                intent.PaidAtUtc = DateTime.UtcNow;

                if (!string.IsNullOrWhiteSpace(intent.ModuleCode))
                    await _licensing.ActivateModuleAsync(intent.TenantId, intent.ModuleCode, intent.AmountInr, "payment", intent.Id, ct);
            }

            await _db.SaveChangesAsync(ct);
            return Ok(new { status = intent.Status, paymentIntentId = intent.Id, activatedModule = intent.ModuleCode });
        }

        private async Task<PaymentIntent?> FindPaymentIntentAsync(Guid? intentId, string? orderId, CancellationToken ct)
        {
            if (intentId.HasValue)
            {
                var byId = await _db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == intentId.Value, ct);
                if (byId != null) return byId;
            }

            if (!string.IsNullOrWhiteSpace(orderId))
                return await _db.PaymentIntents.FirstOrDefaultAsync(p => p.ProviderOrderId == orderId, ct);

            return null;
        }

        private static JsonElement? ExtractPayment(JsonElement root)
        {
            if (!root.TryGetProperty("payload", out var payload)) return null;
            if (!payload.TryGetProperty("payment", out var payment)) return null;
            if (!payment.TryGetProperty("entity", out var entity)) return null;
            return entity;
        }

        private static Guid? GetIntentId(JsonElement payment)
        {
            if (!payment.TryGetProperty("notes", out var notes)) return null;

            foreach (var key in new[] { "paymentIntentId", "payment_intent_id", "mahimaPaymentIntentId" })
            {
                var value = GetString(notes, key);
                if (Guid.TryParse(value, out var parsed)) return parsed;
            }

            return null;
        }

        private static string? GetString(JsonElement element, string name)
        {
            return element.TryGetProperty(name, out var value) && value.ValueKind != JsonValueKind.Null
                ? value.ToString()
                : null;
        }

        private static bool IsValidRazorpaySignature(string payload, string? signature, string secret)
        {
            if (string.IsNullOrWhiteSpace(signature)) return false;
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var computed = Convert.ToHexString(hash).ToLowerInvariant();
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(computed),
                Encoding.UTF8.GetBytes(signature.Trim().ToLowerInvariant()));
        }
    }
}
