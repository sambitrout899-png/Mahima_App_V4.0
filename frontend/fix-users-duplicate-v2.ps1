# --- CONFIG: DB connection ---
$PgHost = "localhost"
$PgPort = 5432
$PgDatabase = "mahima"     # <-- set your DB name
$PgUser = "postgres"       # <-- set your user
$PgPassword = ""           # leave blank to be prompted
$PsqlPath = "psql"

# Candidate logical name (case-insensitive); we'll discover the actual quoted name
$LogicalName = "users"

# Prompt for password if missing
if (-not $PgPassword) {
  $sec = Read-Host "Enter Postgres password for $PgUser@$PgHost" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  $PgPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
$env:PGPASSWORD = $PgPassword

# 1) Find the actual table (handles quoted/case-sensitive names)
$findTableSql = @"
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_type='BASE TABLE'
  AND table_schema='public'
  AND lower(table_name)=lower('$LogicalName')
ORDER BY table_name
LIMIT 1;
"@

# Execute and parse
$tbl = & $PsqlPath -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -At -F $'\t' -c $findTableSql 2>$null
if (-not $tbl) {
  Write-Host "No table matching '$LogicalName' found in schema public. Skipping sequence fix." -ForegroundColor Yellow
  Write-Host "Tip: List tables with:  SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  exit 0
}

$parts = $tbl -split "`t"
$schema = $parts[0]
$actualTable = $parts[1]   # exact-cased name, e.g. Users

Write-Host "Detected table: $schema.$actualTable"

# 2) Try to detect the identity/sequence for column "id"
$findSeqSql = @"
SELECT pg_get_serial_sequence('""$schema"".""$actualTable""', 'id');
"@

$seqName = & $PsqlPath -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -At -c $findSeqSql 2>$null

if (-not $seqName -or $seqName -eq "") {
  Write-Host "No serial/identity sequence found for $schema.""$actualTable"".id — likely GUID PK or non-identity int. Skipping setval." -ForegroundColor Yellow
  Write-Host "If your PK is GUID/UUID, no sequence fix is needed."
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  exit 0
}

Write-Host "Detected sequence: $seqName"
# 3) set sequence to MAX(id)
$setValSql = @"
SELECT setval('$seqName', (SELECT COALESCE(MAX(id), 1) FROM ""$schema"".""$actualTable"" ));
"@

& $PsqlPath -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -c $setValSql

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
Write-Host "Sequence sync complete."
