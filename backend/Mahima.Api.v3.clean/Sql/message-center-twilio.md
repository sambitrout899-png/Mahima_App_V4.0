# Message Center: Sunday worship and Twilio SMS

## What changed

- Sunday Worship Reminder replaces Saturday Church Reminder. The scheduler runs it on Sunday in the configured timezone. Existing Saturday time/enabled settings are read as fallbacks until the new Sunday settings are saved; their values are preserved. The old manual trigger name remains an alias for the Sunday message. Historical Saturday run entries are retained.
- Daily word, morning welcome, night prayer, Sunday worship, custom broadcasts, approved new-member welcomes, registration welcomes, birthdays, shared pastor replies, and active task reminder paths use the shared `ITwilioSmsService`.
- Group content targets existing Jai Masih chat members; new-member and birthday SMS target only those users; task SMS target existing task recipients. Duplicate phone numbers within a batch are skipped.
- The Message Center has a saved **Twilio SMS** toggle, enabled by default. This controls ministry/automated sends. The Users broadcast channel selectors still control individual broadcasts. Active task-page manual/threshold reminders now request SMS as well as existing in-app delivery.
- Each SMS requires a valid country-code phone number. Missing credentials and provider failures are returned rather than silently treated as successful delivery.
- Outgoing SMS no longer appends STOP/HELP instructions.
- Message Center sends short Hindi SMS notifications while keeping full multilingual content in chat. Other long ministry messages become an app notification; short messages are preserved when the complete SMS fits one segment. Direct Users broadcasts exceeding the segment limit are skipped with an explanation, not silently truncated.
- The shared sender counts GSM-7 extension characters and Unicode UTF-16 units, including sender name. Twilio:MaxSegmentsPerMessage defaults to 1 (configurable 1-10). Raising this value increases potential cost. Logs record each accepted Message SID and estimated segments. This is a per-message cap, not an account spending cap.
- Manual Message Center results distinguish queued, skipped, and failed; Users broadcasts now inspect recipient/channel outcomes, including when an older API returns overall `success: true`. Queued means accepted for sending, not confirmed handset delivery. Automated outcomes are logged with user IDs and reasons.

## Server configuration

Use backend configuration, never frontend JavaScript:

```json
"Twilio": {
  "AccountSid": "AC...",
  "AuthToken": "matching live account token",
  "MessagingServiceSid": "MG...",
  "FromNumber": "+..."
}
```

`MessagingServiceSid` is optional. When present it selects the Messaging Service sender pool; otherwise `FromNumber` is required. Use complete real values in the server configuration. The code validates SID prefixes/length and removes surrounding whitespace. It cannot repair mismatched account credentials or provider account restrictions.

Deploy the API and frontend together and restart the API. SMS no longer reads or writes local consent records. Existing historical database records are retained. Remove the obsolete SMS signup/controller/store files listed in the update instructions. Manage STOP/HELP handling through your Twilio sender configuration; provider restrictions still apply.

## Verification

- Backend tests cover Sunday-only scheduling and delivery windows, legacy setting preservation, all three worship translations, legacy trigger compatibility, credential validation, Unicode splitting, partial-failure reporting, and phone-number validation.
- Browser checks use mocked API responses for the saved SMS toggle, Sunday trigger, mixed delivery outcomes, and desktop/mobile layouts. No live SMS was sent during implementation.
- After deployment, use a genuine opted-in test recipient and valid server credentials to verify provider acceptance, handset receipt, HELP and STOP. The earlier server error `Authentication Error - invalid username` still requires correcting the deployed Twilio credentials.

Scheduled run history records the in-app send, not handset delivery. SMS failures do not roll back the in-app message or automatically replay accepted parts; inspect server logs before a deliberate retry.

Reference: [Twilio Message resource and status definitions](https://www.twilio.com/docs/messaging/api/message-resource).

## Billing investigation (2026-09-16)

The previous English/Hindi/Punjabi Sunday body plus sender/footer reproduces exactly eight Unicode segments in one API request. The batch uses distinct user IDs and normalized phone deduplication. There is no eight-send loop for a single short Sunday payload. This does not rule out separate HTTP requests, simultaneous scheduler instances, or repeat manual sends in production: inspect Message SIDs and NumSegments in Twilio logs to establish those.

Twilio's published India international outbound rate checked today is USD 0.0832 per segment:
https://www.twilio.com/en-us/sms/pricing/in
Segment rules: https://www.twilio.com/docs/glossary/what-sms-character-limit

Old Sunday: 8 x 0.0832 = USD 0.6656 per recipient.
Approved Sunday address/link template: 3 x 0.0832 = USD 0.2496 per recipient (62.5% less than the original eight-segment message). Other notifications remain one segment.
100 Sunday recipients: USD 66.56 -> USD 24.96, excluding taxes, number rental and other fees. Rates may change; the UI estimate is informational and does not query account-specific pricing.

Deployment: replace all files in the backend package, rebuild/publish/restart, and deploy the updated frontend. No database migration or live SMS test is required for these cost controls. Until deployment, turn off the Message Center Twilio SMS toggle and save if you want to pause scheduled SMS. Repeat sends and recipient count still incur cost; the one-segment cap is not a daily budget or cross-request idempotency mechanism.

The exact approved Hindi Sunday template (English address and YouTube URL) has a three-segment exception, used by scheduled and manual sends. It is preserved by ministry compaction. Other messages retain the configured default limit (one unless explicitly configured otherwise). Deploy services/SmsCostPolicy.cs and services/TwilioSmsService.cs together, rebuild/publish and restart. Update the frontend for the corrected cost label.
