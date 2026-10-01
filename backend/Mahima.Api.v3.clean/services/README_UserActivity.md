# Live user activity history

Deploy the frontend and API together. The API creates `user_activity_history` and
`user_activity_tracking` on first use, following the application's existing schema
initialization approach; its database account needs table/index creation permission.
No existing user or business data is changed. Historical durations are not backfilled.

Authenticated password/Google logins record a visit. The application shell sends a
heartbeat every 15 seconds during visible use, stopping after five minutes without
interaction. Continued use of a saved login also counts as a visit. A new foreground
session starts after returning from a hidden or idle state. The API accepts user
identity only from the authenticated principal and uses server timestamps.

Active durations are confirmed between heartbeat samples (approximately 15-second
resolution); the final unsampled portion of a visit is not counted. Gaps longer than
45 seconds start a new interval. Overlapping tabs/devices are merged per user.
Summaries use IST calendar days, Monday–Sunday weeks, and calendar months. Counts
are distinct users, not login attempts. Summaries require an Admin role.

Tracking start is shown on the dashboard. Earlier periods show unavailable and
partially covered periods have partial totals. History is persisted in PostgreSQL
and survives API restarts. No automatic retention/deletion is performed.

Validation:
- `dotnet test backend/Mahima.Api.v3.clean.Tests/Mahima.Api.v3.clean.Tests.csproj`
- From frontend: `node --test src/hooks/useUserActivity.test.mjs`
- From frontend: `npm run build`
