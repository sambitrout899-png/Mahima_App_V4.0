namespace Mahima.Api.v3.clean.Dtos
{
    // ── Create Order ──────────────────────────────────────────────────────────

    public class CreateRazorpayOrderRequest
    {
        /// <summary>Amount in INR (e.g. 500.00). Converted to paise internally.</summary>
        public decimal Amount { get; set; }

        /// <summary>ISO 4217 currency code. Defaults to INR.</summary>
        public string Currency { get; set; } = "INR";

        /// <summary>Optional short description / receipt label.</summary>
        public string? Receipt { get; set; }
    }

    public class CreateRazorpayOrderResponse
    {
        public string OrderId { get; set; } = default!;
        public long Amount { get; set; }        // paise
        public string Currency { get; set; } = default!;
        public string KeyId { get; set; } = default!;
    }

    // ── Verify Payment ────────────────────────────────────────────────────────

    public class VerifyRazorpayPaymentRequest
    {
        public string RazorpayOrderId { get; set; } = default!;
        public string RazorpayPaymentId { get; set; } = default!;
        public string RazorpaySignature { get; set; } = default!;
    }

    public class VerifyRazorpayPaymentResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = default!;
        public string? PaymentId { get; set; }
    }
}
