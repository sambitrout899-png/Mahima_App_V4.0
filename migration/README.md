# Mahima V4.0 -> V4.1 Data Migration

Moves the on-prem V4.0 database and uploaded-file data into the V4.1 multi-tenant
database, under the existing **Mahima Root** tenant.

## Why this isn't a plain copy

V4.1 is a superset of V4.0, not a like-for-like schema:

- V4.1 retrofitted a `tenant_id` (or legacy `TenantId`) column onto most core tables
  (`users`, `expenses`, `accounts`, `journal_entries`, `baptism_requests`, `chats`,
  `prayerrequests`, `candidates`, `AttendanceRecords`, `Timesheets`, `Tasks`, `Teams`,
  `Meetings`, `Attachments`, `AuditLogs`, payroll, analytics, etc.). Child/junction tables
  (`journal_lines`, `messages`, `chatmembers`, `teammembers`, ...) were left alone - they
  inherit tenant scope through their parent's foreign key.
- V4.1 **dropped** `accounting_data_snapshots` entirely.
- V4.0's `chicken_sale_access` / `chicken_sale_days` / `chicken_sale_audit` tables have
  **no equivalent** in V4.1 at all.
- V4.1 added many brand-new tenant-scoped modules with no V4.0 source data (billing,
  marketing CRM, QA test tracking, events/RSVP, child check-in, volunteer scheduling,
  service plans) - these are left untouched, not seeded from V4.0.

Because of this, `MahimaDataMigrator` diffs both schemas via `information_schema` at run
time instead of using a hard-coded column map, so it keeps working as either schema
changes:

| Column situation | Behavior |
|---|---|
| exists in both source and target | copied as-is |
| exists only in target, named `tenant_id`/`TenantId` | backfilled with the configured Root Tenant id |
| exists only in target, anything else | left to the column's own `DEFAULT`/`NULL` (e.g. new `mfa_*` columns on `users`) |
| exists only in source | dropped, and reported so the loss is visible, not silent |
| table exists only in source | not written to the DB - exported to JSON via `archive` mode instead |
| table exists only in target | left alone (new V4.1-only modules) |

Table load order is derived from the target database's real foreign-key graph, so parent
rows (e.g. `users`, `teams`, `chats`, `journal_entries`) always land before their children.

## Prerequisites

- .NET 8 SDK (`dotnet --version`)
- Network access from wherever you run this to **both** Postgres servers (source V4.0 and
  target V4.1). This tool does not attempt to open any tunnel itself - run it from a
  machine/VPN/bastion that already has that access.
- The V4.1 "Mahima Root" tenant must already exist (`tenants.slug = 'mahima-root'`) - grab
  its `id` before starting.

## Setup

```powershell
cd migration/MahimaDataMigrator
cp migration.settings.example.json migration.settings.json
# edit migration.settings.json: SourceConnectionString, TargetConnectionString, RootTenantId
dotnet build
```

`migration.settings.json` holds real credentials - it's gitignored, never commit it.

Review `SkipTables` in the settings file. It defaults to excluding global lookup tables
(`roles`, `pages`, `app_languages`, `role_permissions`) on the assumption V4.1 seeds these
itself; if V4.1's rows for these don't already cover what V4.0 has, remove them from the
list so they get migrated too (their primary keys will dedupe safely either way via
`ON CONFLICT DO NOTHING`).

## Running it

Always run `plan` first and read it - it costs nothing (no writes) and tells you exactly
what will happen before you commit to anything.

```powershell
dotnet run -- plan
```

This prints, per table: which columns copy across, which get tenant-backfilled, which get
silently defaulted, and which source columns get dropped. It also lists every source-only
table that has no home in V4.1.

There are two ways to actually move the data. Both use the exact same schema-diff logic
(same column handling, same tenant backfill, same `ON CONFLICT DO NOTHING` dedup, same FK
load order) - pick based on how hands-on you want to be.

### Option A: generate plain SQL scripts and run them by hand (recommended for a first migration)

```powershell
dotnet run -- generate
```

This is read-only against both databases (it only introspects `information_schema` - no
data is copied by this command). It writes to `GeneratedScriptsDirectory`
(`migration-output/generated/` by default):

- `export/NNN_<table>.export.sql` - one `\copy` command per table, to run against the
  **source** with `psql`.
- `import/NNN_<table>.import.sql` - one transactional script per table (stage table, copy
  in, tenant backfill, `INSERT ... ON CONFLICT DO NOTHING`, sequence fixup) to run against
  the **target**.
- `archive/<table>.export.sql` - for `accounting_data_snapshots` / `chicken_sale_*`: export
  only, nothing to import anywhere.
- `RUNBOOK.md` - the exact ordered sequence of commands, with the per-table column notes
  from `plan` repeated inline so you don't have to cross-reference two documents.

Copy the whole `generated/` folder to both the source and target machines (or just to
whichever machine you're driving this from, if it can reach both over `psql`), `cd` into
it, and work through `RUNBOOK.md` one table at a time:

```bash
export SOURCE_CONN="postgresql://postgres:<pw>@localhost:15432/mahima_db_3_0"   # via the SSH tunnel
export TARGET_CONN="postgresql://postgres:<pw>@localhost:5432/mahima_db_3_0"

psql "$SOURCE_CONN" -f export/010_users.export.sql        # -> prints COPY <n>
scp export/010_users.copy <target-host>:~/mahima-migration/generated/import/
psql "$TARGET_CONN" -f import/010_users.import.sql        # -> prints INSERT 0 <n>
```

Re-running an import script is safe - `ON CONFLICT DO NOTHING` means already-migrated rows
are silently skipped, not duplicated. If an import fails partway, nothing commits (each
script is one transaction), so just fix the issue and re-run that same script.

### Option B: let the tool move the data directly (`migrate`)

Only viable if the machine running the tool has live connectivity to **both** databases at
once (e.g. via an SSH tunnel to source + local connection to target).

```powershell
dotnet run -- archive   # 1. archive tables with no V4.1 equivalent, to JSON
dotnet run -- migrate   # 2. copy data for every common table into the target database
dotnet run -- verify    # 3. confirm every source row now exists in the target
```

`migrate` is safe to re-run for the same reason as the generated scripts: every insert goes
through `ON CONFLICT DO NOTHING` keyed on the target table's real primary key.

To retry a single table (e.g. after fixing a connectivity blip), pass `--table`:

```powershell
dotnet run -- migrate --table baptism_requests
```

Every `migrate`/`verify` run writes a timestamped JSON report under
`migration-output/reports/` - keep these as your migration audit trail.

## File system data

Uploaded files (`Uploads:Root` / `MAHIMA_UPLOADS_ROOT`, e.g. `/var/www/mahima-uploads` on
Linux or `wwwroot/uploads` on Windows) live outside Postgres and are handled separately by
`scripts/sync-files.ps1` (Windows/UNC) or `scripts/sync-files.sh` (Linux/rsync/SSH). Both
are purely additive - they never delete or overwrite anything already at the destination -
so they're safe to run against a V4.1 uploads folder that already has its own live data.

```powershell
./scripts/sync-files.ps1 -SourceRoot "\\v40-server\mahima-uploads" -DestRoot "\\v41-server\mahima-uploads"
```

```bash
./scripts/sync-files.sh /var/www/mahima-uploads deploy@v41-server:/var/www/mahima-uploads
```

Fill in the actual source/dest paths for your deployment - they weren't discoverable from
this checkout (no live V4.0 uploads folder or running Postgres instance was found here;
this is a dev checkout, not the production server).

## Order of operations for a full cutover

1. **Back up the V4.1 target database first** - `scripts/backup-v41-db.ps1` /
   `backup-v41-db.sh`. This is the actual undo button if anything below goes wrong;
   `scripts/restore-v41-db.ps1` / `restore-v41-db.sh` restores from it.
2. `dotnet run -- plan` - review, adjust `SkipTables` if needed.
3. `dotnet run -- generate` - writes the numbered export/import scripts + RUNBOOK.md.
4. Work through `RUNBOOK.md` step by step: export on source, `scp`, import on target,
   compare row counts, repeat for the next table.
5. Run the file sync script.
6. Spot-check in the V4.1 app under the Mahima Root tenant.

(Or skip 3-4 and use `archive` / `migrate` / `verify` directly - see "Running it" below.)
