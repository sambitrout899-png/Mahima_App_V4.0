# Mahima Chicken Sale

A shared chicken-retail ledger for the React website and the Capacitor Android app. Route: `/home/chicken-sale`.

## Enable in an environment

1. Apply `database/migrations/20260914_chicken_sale.sql` to the application's PostgreSQL database using the normal deployment database account. The migration is additive and repeatable. Deploy the database migration before the new frontend/API so access lookups can read their table.
2. Deploy the API and web build. For Android, run the existing `mobile:sync` and Android packaging/release workflow. No new native dependencies are required.
3. In Users, edit a saved user and enable **Mahima Chicken Sale**. Only authenticated administrators can grant/revoke access. Assignment saves immediately, separately from the profile Save button. Administrators must also explicitly assign themselves to operate the shop. Roles and role-page permissions cannot grant this module.
4. Open a business day, review Settings (city, expected sales, yield factor, labor and rent), and enter deliveries.
5. The existing `ILlmProvider` configuration enables AI advice. Without a configured/reachable model, accounting and cost-based pricing remain available.

The migration has not been executed against a live database, and these changes have not been deployed or packaged as a signed Android release.

## Daily flow

- **Receive:** record supplier/invoice reference, measured net raw kg, actual price per kg, payment and notes. Each delivery can have a different rate.
- **Dress:** record raw input and actual dressed output. The default planning factor is 1.6 raw kg per dressed kg (62.5% yield). Actual processing uses weighed output, not an assumed yield.
- **Sell:** record dressed kg, sale price, customer/bill reference and collection. A customer reference is required for unpaid sales.
- **Settle:** collect customer balances or pay outstanding supplier invoices. Open balances carry into the next business day; settlement changes cash/balances without recognizing revenue or cost twice.
- **Expenses:** record other paid operating charges. Daily labor and rent belong in Settings and must not be entered again as expenses. Rent is entered as a daily allocation; monthly rent can be divided by planned trading days.
- **Loss/exit:** record raw mortality/spoilage, dressed spoilage, or disposal/other non-revenue exits with a reason. Exits are charged at inventory cost. Customer sales must use Sale; overnight retained stock belongs in closing counts.
- **Close:** enter both physical stock counts. Explained shortages become loss; counts above recorded stock are rejected until missing transactions are recorded. Closing locks the day. New days must follow the latest closed day. Stock values and balances carry forward.
- **Corrections:** use Edit on any record of an open day. The original ID, author and timestamp are preserved; a reason is required and before/after values are audited. The entire day is recalculated, rejecting changes that would invalidate later stock movements or bill settlements. Record type cannot be changed. Only the latest entry can be removed, with a reason. Closed days remain locked.
- **History:** review and export the latest 90 trading days as CSV. Older persisted days can still be selected by date.

## Accounting and price calculation

Money uses backend `decimal` arithmetic. Each purchase/sale line total is rounded to two decimal places. Weights use kilograms. Timestamps are UTC; business dates use India time.

Raw stock uses moving weighted-average valuation. Dressing transfers the full raw input cost into the actual dressed output, absorbing ordinary dressing loss. Sales relieve dressed inventory at its moving average cost. Unsold inventory stays on the balance sheet; purchase cash outflow is not immediately treated as a profit expense.

`Net operating profit = sales revenue - cost of meat sold - spoilage/exit/closing shortage cost - daily labor - daily rent - other expenses`.

The planning unit cost blends on-hand raw and dressed inventory: `(raw value + dressed value) / (raw kg / planned factor + dressed kg)`. When inventory is exhausted, that day's average purchase rate times the factor is the fallback. With no usable cost basis, the price is unavailable.

`Break-even per kg = planning unit cost + (daily expenses + recorded losses) / expected dressed sales kg`.

`Suggested price = ceiling(break-even / (1 - target margin / 100))`.

This targets margin on revenue, not markup on cost. It is a planning estimate; it does not guarantee profit, demand, or competitiveness. Daily labor/rent allocations are treated as paid charges in the displayed operating cash movement.

## Market and AI

The server reads the selected city's public [India Prices chicken page](https://www.indiaprices.co.in/chicken/jalandhar-chicken-price/) (default Jalandhar). The adapter accepts a live-chicken price only with a parseable publication date. Missing, future-dated, stale, unreachable or changed source data is clearly flagged; no invented quote or retail-to-wholesale conversion is used. The public quote is indicative live-chicken pricing, not a confirmed wholesale supplier offer. Confirm purchases directly with suppliers.

City can be entered in Settings or filled using **Use device location**, with device permission. This reuses the existing BigDataCloud location resolver through a lightweight authenticated endpoint. Permission denial, unavailable geolocation, or a non-Indian location falls back to manual city entry. The detected city is only saved when the user saves Settings. Coverage depends on whether the public source publishes that city. Quotes require outbound HTTPS from the API to `www.indiaprices.co.in`. Public HTML layouts can change; the parser fails closed when it cannot verify a dated rate. The source observed during development was older than the current day.

AI advice runs when a trading day is first viewed and can be refreshed on demand. It receives recorded figures and the dated quote, with explicit instructions not to invent market prices. It never changes prices or transactions automatically. AI and market failures do not prevent ledger operations. This is an on-view dashboard feature, not a scheduled notification.

## Persistence and safeguards

- `chicken_sale_access`: explicit assignments with assigning user/time.
- `chicken_sale_days`: versioned JSONB daily documents, actor and timestamp. The schema is separate from existing ministry/accounting data.
- `chicken_sale_audit`: append-only application audit events for assignments, mutations and corrections. Database permissions/backups should protect this table from direct tampering.
- Every operational API checks current persisted access, including administrator requests. Writes and assignment changes acquire the same PostgreSQL transaction advisory lock; version checks prevent lost updates.
- Entry UUIDs make retries idempotent. Server-side rules reject negative stock, output greater than raw input, missing reasons, invalid settings, overpayments, wrong bill settlement, and invalid closing counts. The client cannot set opening values or actor/time.
- One shared shop, INR, and one India business calendar. Separate branches, tax invoices/GST accounting, refunds/returns, supplier masters, expiry/batch tracking, offline writes and weighing-scale integration are not included. Closed ledgers are not reopened by this module.

## Verification

- API compiles under .NET 8. Existing unrelated nullable warnings remain.
- `ChickenSaleTests`: 15 passing cases covering weighted purchase costs, yield, profit, closing/carry-forward, credit settlements, stock bounds, overpayments, duplicates and quote freshness.
- Web and mobile Vite production builds pass; existing bundle-size/dynamic-import warnings remain.
- Desktop (1440px) and phone (390px) Playwright checks pass using mocked API responses: receipt submission, balance collection, close-day lock, device-location city selection, denied access, no horizontal overflow and no browser errors. These are UI tests, not live database integration tests.

Commands (run from repository root unless noted):

```powershell
dotnet test backend/Mahima.Api.v3.clean.Tests/Mahima.Api.v3.clean.Tests.csproj --no-restore -p:IntermediateOutputPath=obj/chicken-validation/ --filter FullyQualifiedName~ChickenSaleTests -o tmp/chicken-tests
npm --prefix frontend run build -- --outDir ../tmp/chicken-web-build
npm --prefix frontend run mobile:build -- --outDir ../tmp/chicken-mobile-build
# In a separate terminal:
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5179 --strictPort
node frontend/tests/chickenSale.ui.test.cjs
```

The browser test uses the repository's existing DemoRenderer Playwright dependency and installed Edge (`CHICKEN_TEST_BROWSER=chrome` can select Chrome). Its dedicated preview HTML is not a production route or build entry. Screenshots are written to `tmp/chicken-desktop.png` and `tmp/chicken-mobile.png`.

