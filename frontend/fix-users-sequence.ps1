# CONFIG
$PgHost     = "localhost"
$PgPort     = 5432
$PgDatabase = "mahima"     # <-- change
$PgUser     = "postgres"   # <-- change
$PgPassword = ""           # leave blank to be prompted
$PsqlPath   = "psql"
$TableName  = "Users"      # exact table name with correct case
$IdColumn   = "id"

# Prompt for password if not given
if (-not $PgPassword) {
  $sec = Read-Host "Enter Postgres password for $PgUser@$PgHost" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  $PgPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
$env:PGPASSWORD = $PgPassword

# Detect sequence
$findSeqSql = "SELECT pg_get_serial_sequence('public.""$TableName""', '$IdColumn');"
$seqName = & $PsqlPath -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -At -c $findSeqSql 2>$null

if (-not $seqName -or $seqName -eq "") {
  Write-Host "No sequence found on $TableName.$IdColumn — probably GUID PK, nothing to fix." -ForegroundColor Yellow
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  exit 0
}

Write-Host "Detected sequence: $seqName"

# Sync sequence
$setValSql = "SELECT setval('$seqName', (SELECT COALESCE(MAX($IdColumn), 1) FROM ""$TableName""));"
& $PsqlPath -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -c $setValSql

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
Write-Host "Sequence sync complete." -ForegroundColor Green
