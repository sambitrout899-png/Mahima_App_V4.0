using System.Text.Json;
using Npgsql;
using MahimaDataMigrator;

var mode = args.FirstOrDefault(a => !a.StartsWith("--"))?.ToLowerInvariant() ?? "plan";
var settingsPath = GetOption(args, "--settings") ?? "migration.settings.json";
var onlyTable = GetOption(args, "--table");

if (mode is not ("plan" or "migrate" or "archive" or "verify" or "generate"))
{
    Console.WriteLine("Usage: MahimaDataMigrator <plan|generate|migrate|archive|verify> [--settings path] [--table name]");
    Console.WriteLine();
    Console.WriteLine("  plan     Read both schemas, print the migration plan, write no data. Run this first.");
    Console.WriteLine("  generate Read both schemas and write static, numbered psql export/import scripts +");
    Console.WriteLine("           a RUNBOOK.md to GeneratedScriptsDirectory. Writes no DB data. Use this if you");
    Console.WriteLine("           want to run the actual migration by hand with psql instead of via 'migrate'.");
    Console.WriteLine("  archive  Export source-only tables (no V4.1 equivalent) to JSON. Writes no DB data.");
    Console.WriteLine("  migrate  Copy data for all common tables into the target database directly. Safe to re-run.");
    Console.WriteLine("  verify   After migrating, confirm every source row exists in the target.");
    return 1;
}

MigrationSettings settings;
try
{
    settings = MigrationSettings.Load(settingsPath);
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Settings error: {ex.Message}");
    return 1;
}

var rootTenantId = Guid.Parse(settings.RootTenantId);

await using var source = new NpgsqlConnection(settings.SourceConnectionString);
await using var target = new NpgsqlConnection(settings.TargetConnectionString);
await source.OpenAsync();
await target.OpenAsync();

Console.WriteLine($"Source: {source.Host}/{source.Database}");
Console.WriteLine($"Target: {target.Host}/{target.Database}");
Console.WriteLine($"Root tenant id: {rootTenantId}");
Console.WriteLine();

var sourceTables = await SchemaReader.ReadTablesAsync(source);
var targetTables = await SchemaReader.ReadTablesAsync(target);

var defaultSkip = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "__EFMigrationsHistory" };
var skip = new HashSet<string>(settings.SkipTables, StringComparer.OrdinalIgnoreCase);
skip.UnionWith(defaultSkip);

var commonTableNames = sourceTables.Keys.Intersect(targetTables.Keys, StringComparer.OrdinalIgnoreCase)
    .Where(t => !skip.Contains(t))
    .ToList();
var sourceOnlyTableNames = sourceTables.Keys.Except(targetTables.Keys, StringComparer.OrdinalIgnoreCase)
    .Where(t => !skip.Contains(t))
    .ToList();
var skippedButCommon = sourceTables.Keys.Intersect(targetTables.Keys, StringComparer.OrdinalIgnoreCase)
    .Where(skip.Contains)
    .ToList();

if (!string.IsNullOrWhiteSpace(onlyTable))
{
    commonTableNames = commonTableNames.Where(t => t.Equals(onlyTable, StringComparison.OrdinalIgnoreCase)).ToList();
    sourceOnlyTableNames = sourceOnlyTableNames.Where(t => t.Equals(onlyTable, StringComparison.OrdinalIgnoreCase)).ToList();
}

var edges = await SchemaReader.ReadForeignKeyEdgesAsync(target, new HashSet<string>(commonTableNames, StringComparer.OrdinalIgnoreCase));
var orderedTables = SchemaReader.TopologicalSort(commonTableNames, edges);

switch (mode)
{
    case "plan":
        PrintPlan(orderedTables, sourceOnlyTableNames, skippedButCommon, sourceTables, targetTables);
        break;

    case "generate":
        {
            await ScriptGenerator.GenerateAsync(
                orderedTables, sourceOnlyTableNames, sourceTables, targetTables,
                rootTenantId, settings.GeneratedScriptsDirectory);
            Console.WriteLine($"Wrote export/import scripts and RUNBOOK.md to {Path.GetFullPath(settings.GeneratedScriptsDirectory)}");
            Console.WriteLine($"  {orderedTables.Count} table(s) to migrate, {sourceOnlyTableNames.Count} archive-only table(s).");
            Console.WriteLine("Open RUNBOOK.md and follow it step by step - nothing has been written to either database.");
            break;
        }

    case "archive":
        {
            var counts = await Archiver.ArchiveTablesAsync(source, sourceOnlyTableNames, settings.ArchiveDirectory);
            Console.WriteLine($"Archived {counts.Count} source-only tables to {Path.GetFullPath(settings.ArchiveDirectory)}");
            foreach (var (table, count) in counts.OrderBy(kv => kv.Key))
                Console.WriteLine($"  {table,-40} {count,8} rows");
            break;
        }

    case "migrate":
        {
            var results = new List<TableMigrationResult>();
            foreach (var tableName in orderedTables)
            {
                var result = await TableMigrator.MigrateAsync(
                    source, target, sourceTables[tableName], targetTables[tableName], rootTenantId);
                results.Add(result);
                PrintResultLine(result);
            }
            await WriteReportAsync(settings.ReportDirectory, "migrate", results);

            var failed = results.Where(r => r.Error is not null).ToList();
            if (failed.Count > 0)
            {
                Console.WriteLine();
                Console.WriteLine($"{failed.Count} table(s) failed:");
                foreach (var f in failed) Console.WriteLine($"  {f.Table}: {f.Error}");
                return 1;
            }
            break;
        }

    case "verify":
        {
            var results = new List<VerifyResult>();
            foreach (var tableName in orderedTables)
            {
                var result = await Verifier.VerifyAsync(source, target, sourceTables[tableName], targetTables[tableName]);
                results.Add(result);
                var status = result.MissingInTarget == 0 && result.Note is null ? "OK" : "CHECK";
                Console.WriteLine($"  [{status,-5}] {result.Table,-40} source={result.SourceRowCount,-8} missing={result.MissingInTarget,-8} {result.Note}");
            }
            await WriteReportAsync(settings.ReportDirectory, "verify", results);

            var problems = results.Where(r => r.MissingInTarget > 0 || r.Note is not null).ToList();
            if (problems.Count > 0)
            {
                Console.WriteLine();
                Console.WriteLine($"{problems.Count} table(s) need review.");
                return 1;
            }
            break;
        }
}

return 0;

static string? GetOption(string[] args, string name)
{
    var idx = Array.IndexOf(args, name);
    return idx >= 0 && idx + 1 < args.Length ? args[idx + 1] : null;
}

static void PrintPlan(
    List<string> orderedTables, List<string> sourceOnlyTables, List<string> skippedTables,
    Dictionary<string, TableInfo> sourceTables, Dictionary<string, TableInfo> targetTables)
{
    Console.WriteLine($"Tables to migrate (in dependency order): {orderedTables.Count}");
    foreach (var tableName in orderedTables)
    {
        var src = sourceTables[tableName];
        var tgt = targetTables[tableName];
        var srcCols = new HashSet<string>(src.Columns.Select(c => c.Name), StringComparer.OrdinalIgnoreCase);
        var tgtCols = new HashSet<string>(tgt.Columns.Select(c => c.Name), StringComparer.OrdinalIgnoreCase);

        var dropped = src.Columns.Where(c => !tgtCols.Contains(c.Name)).Select(c => c.Name).ToList();
        var tenantBackfill = tgt.Columns.Where(c => !srcCols.Contains(c.Name) && c.IsTenantColumn).Select(c => c.Name).ToList();
        var defaulted = tgt.Columns.Where(c => !srcCols.Contains(c.Name) && !c.IsTenantColumn).Select(c => c.Name).ToList();

        Console.WriteLine($"  {tableName}");
        if (tenantBackfill.Count > 0) Console.WriteLine($"      tenant backfill : {string.Join(", ", tenantBackfill)}");
        if (dropped.Count > 0) Console.WriteLine($"      DROPPED (source-only, no target column) : {string.Join(", ", dropped)}");
        if (defaulted.Count > 0) Console.WriteLine($"      left to target default : {string.Join(", ", defaulted)}");
    }

    Console.WriteLine();
    Console.WriteLine($"Source-only tables with no V4.1 equivalent (run 'archive' to export, not loaded into DB): {sourceOnlyTables.Count}");
    foreach (var t in sourceOnlyTables.OrderBy(t => t, StringComparer.OrdinalIgnoreCase))
        Console.WriteLine($"  {t}");

    if (skippedTables.Count > 0)
    {
        Console.WriteLine();
        Console.WriteLine($"Explicitly skipped (present both sides, excluded via SkipTables/defaults): {skippedTables.Count}");
        foreach (var t in skippedTables.OrderBy(t => t, StringComparer.OrdinalIgnoreCase))
            Console.WriteLine($"  {t}");
    }
}

static void PrintResultLine(TableMigrationResult r)
{
    if (r.Error is not null)
    {
        Console.WriteLine($"  [FAIL ] {r.Table,-40} {r.Error}");
        return;
    }
    if (r.SourceRowCount == 0)
    {
        Console.WriteLine($"  [EMPTY] {r.Table,-40} source has no rows");
        return;
    }
    Console.WriteLine($"  [ OK  ] {r.Table,-40} source={r.SourceRowCount,-8} inserted={r.InsertedRowCount,-8} (skipped as duplicates={r.StagedRowCount - r.InsertedRowCount})");
}

static async Task WriteReportAsync<T>(string reportDir, string kind, List<T> results)
{
    Directory.CreateDirectory(reportDir);
    var path = Path.Combine(reportDir, $"{kind}-{DateTime.UtcNow:yyyyMMdd-HHmmss}.json");
    await using var fs = File.Create(path);
    await JsonSerializer.SerializeAsync(fs, results, new JsonSerializerOptions { WriteIndented = true });
    Console.WriteLine();
    Console.WriteLine($"Report written to {Path.GetFullPath(path)}");
}
