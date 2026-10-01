using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/razorpay")]
    [Authorize]
    public class RazorpayController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly ILogger<RazorpayController> _logger;

        public RazorpayController(IConfiguration config, ILogger<RazorpayController> logger)
        {
            _config = config;
            _logger = logger;
        }

        // ── POST /api/razorpay/create-order ───────────────────────────────────

        [HttpPost("create-order")]
        public async Task<IActionResult> CreateOrder(
            [FromBody] CreateRazorpayOrderRequest dto,
            CancellationToken ct)
        {
            var keyId = _config["Billing:RazorpayKeyId"];
            var keySecret = _config["Billing:RazorpayKeySecret"];

            if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret))
                return StatusCode(503, new { message = "Razorpay credentials are not configured." });

            // Convert INR → paise and enforce minimum of 100 paise (₹1)
            var amountPaise = (long)Math.Round(dto.Amount * 100, MidpointRounding.AwayFromZero);
            if (amountPaise < 100)
                return BadRequest(new { message = "Amount must be at least ₹1.00 (100 paise)." });

            var receipt = string.IsNullOrWhiteSpace(dto.Receipt)
                ? $"rcpt_{Guid.NewGuid():N}"
                : dto.Receipt;

            try
            {
                using var client = new HttpClient();
                var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Basic", credentials);

                var payload = new
                {
                    amount = amountPaise,
                    currency = string.IsNullOrWhiteSpace(dto.Currency) ? "INR" : dto.Currency,
                    receipt
                };

                using var content = new StringContent(
                    JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                using var response = await client.PostAsync(
                    "https://api.razorpay.com/v1/orders", content, ct);

                var body = await response.Content.ReadAsStringAsync(ct);

                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                    return StatusCode(401, new { message = "Razorpay authentication failed. Check API credentials." });

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Razorpay create-order failed: {Status} {Body}",
                        (int)response.StatusCode, body);
                    return StatusCode(500, new { message = "Failed to create Razorpay order.", detail = body });
                }

                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                var orderId = root.TryGetProperty("id", out var idNode) ? idNode.GetString() : null;
                var returnedAmount = root.TryGetProperty("amount", out var amtNode) ? amtNode.GetInt64() : amountPaise;
                var currency = root.TryGetProperty("currency", out var curNode) ? curNode.GetString() : dto.Currency;

                if (string.IsNullOrWhiteSpace(orderId))
                {
                    _logger.LogError("Razorpay order response missing id. Body: {Body}", body);
                    return StatusCode(500, new { message = "Razorpay response did not contain an order id." });
                }

                return Ok(new CreateRazorpayOrderResponse
                {
                    OrderId = orderId,
                    Amount = returnedAmount,
                    Currency = currency ?? "INR",
                    KeyId = keyId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating Razorpay order.");
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // ── POST /api/razorpay/verify-payment ─────────────────────────────────

        [HttpPost("verify-payment")]
        public IActionResult VerifyPayment([FromBody] VerifyRazorpayPaymentRequest dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RazorpayOrderId) ||
                string.IsNullOrWhiteSpace(dto.RazorpayPaymentId) ||
                string.IsNullOrWhiteSpace(dto.RazorpaySignature))
            {
                return BadRequest(new VerifyRazorpayPaymentResponse
                {
                    Success = false,
                    Message = "razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required."
                });
            }

            var keySecret = _config["Billing:RazorpayKeySecret"];
            if (string.IsNullOrWhiteSpace(keySecret))
                return StatusCode(503, new { message = "Razorpay credentials are not configured." });

            // HMAC-SHA256(order_id + "|" + payment_id, key_secret)
            var message = $"{dto.RazorpayOrderId}|{dto.RazorpayPaymentId}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(keySecret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
            var computed = Convert.ToHexString(hash).ToLowerInvariant();

            var isValid = CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(computed),
                Encoding.UTF8.GetBytes(dto.RazorpaySignature.Trim().ToLowerInvariant()));

            if (!isValid)
            {
                _logger.LogWarning("Razorpay signature mismatch for order {OrderId}", dto.RazorpayOrderId);
                return BadRequest(new VerifyRazorpayPaymentResponse
                {
                    Success = false,
                    Message = "Payment signature verification failed. Do not mark this payment as successful."
                });
            }

            return Ok(new VerifyRazorpayPaymentResponse
            {
                Success = true,
                Message = "Payment verified successfully.",
                PaymentId = dto.RazorpayPaymentId
            });
        }
    }
}
