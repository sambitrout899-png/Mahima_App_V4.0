using System.Text;

namespace MahimaDataMigrator;

/// <summary>
/// Emits static, numbered psql scripts (one export + one import per table, in FK-safe order)
/// instead of moving data itself. Nothing here writes to either database - it only reads
/// information_schema (via the already-open connections) to know what SQL to write out.
///
/// The generated scripts use the same staging-table / tenant-backfill / ON CONFLICT DO NOTHING
/// approach as TableMigrator, just expressed as plain SQL text a person runs by hand with psql
/// instead of a live Npgsql connection driving it.
/// </summary>
public static class ScriptGenerator
{
    public static async Task GenerateAsync(
        List<string> orderedCommonTables, List<string> sourceOnlyTables,
        Dictionary<string, TableInfo> sourceTables, Dictionary<string, TableInfo> targetTables,
        Guid rootTenantId, string outputDir)
    {
        var exportDir = Path.Combine(outputDir, "export");
        var importDir = Path.Combine(outputDir, "import");
        var archiveDir = Path.Combine(outputDir, "archive");
        Directory.CreateDirectory(exportDir);
        Directory.CreateDirectory(importDir);
        Directory.CreateDirectory(archiveDir);

        var runbook = new StringBuilder();
        runbook.AppendLine("# Mahima V4.0 -> V4.1 Manual Migration Runbook");
        runbook.AppendLine();
        runbook.AppendLine($"Generated {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC. Root tenant id baked into every import script: {rootTenantId}");
        runbook.AppendLine();
        runbook.AppendLine("Run steps IN ORDER - later tables have foreign keys into earlier ones (e.g. `messages`");
        runbook.AppendLine("references `chats`, `journal_lines` references `journal_entries`). Skipping ahead will");
        runbook.AppendLine("fail with a foreign key violation, which is safe (nothing partial commits - every");
        runbook.AppendLine("import script is one transaction) but wastes a round trip.");
        runbook.AppendLine();
        runbook.AppendLine("Run every command from this `generated/` folder (the `\\copy` paths inside each script");
        runbook.AppendLine("are relative to wherever you invoke psql from):");
        runbook.AppendLine();
        runbook.AppendLine("```");
        runbook.AppendLine("psql \"$SOURCE_CONN\" -f export/<file>.export.sql   # on the V4.0 side");
        runbook.AppendLine("scp export/<file>.copy <target-host>:~/mahima-migration/generated/import/");
        runbook.AppendLine("psql \"$TARGET_CONN\" -f import/<file>.import.sql   # on the V4.1 side");
        runbook.AppendLine("```");
        runbook.AppendLine();
        runbook.AppendLine("After each import step, compare the row count psql prints for the export's `COPY N`");
        runbook.AppendLine("against the import's `INSERT 0 N` before moving to the next step. A smaller insert");
        runbook.AppendLine("count than the copy count is expected wherever rows already existed in the target");
        runbook.AppendLine("(ON CONFLICT DO NOTHING silently skips those) - not itself a problem.");
        runbook.AppendLine();

        var step = 10;
        foreach (var tableName in orderedCommonTables)
        {
            var src = sourceTables[tableName];
            var tgt = targetTables[tableName];
            var prefix = step.ToString("D3");
            var baseName = tableName;

            var (exportSql, importSql, tenantColumns, dropped, defaulted) = BuildTablePair(src, tgt, prefix, baseName, rootTenantId);

            await File.WriteAllTextAsync(Path.Combine(exportDir, $"{prefix}_{baseName}.export.sql"), exportSql);
            await File.WriteAllTextAsync(Path.Combine(importDir, $"{prefix}_{baseName}.import.sql"), importSql);

            runbook.AppendLine($"## Step {prefix}: {tableName}");
            if (tenantColumns.Count > 0) runbook.AppendLine($"- tenant backfill -> root tenant: {string.Join(", ", tenantColumns)}");
            if (dropped.Count > 0) runbook.AppendLine($"- **DROPPED** (no matching V4.1 column - confirm this is actually empty in source before proceeding): {string.Join(", ", dropped)}");
            if (defaulted.Count > 0) runbook.AppendLine($"- left to V4.1's own default/NULL: {string.Join(", ", defaulted)}");
            runbook.AppendLine($"1. `psql \"$SOURCE_CONN\" -f export/{prefix}_{baseName}.export.sql`");
            runbook.AppendLine($"2. `scp export/{prefix}_{baseName}.copy <target-host>:~/mahima-migration/generated/import/`");
            runbook.AppendLine($"3. `psql \"$TARGET_CONN\" -f import/{prefix}_{baseName}.import.sql`");
            runbook.AppendLine();

            step += 10;
        }

        runbook.AppendLine("## Archive-only tables (no V4.1 equivalent - export only, nothing to import anywhere)");
        runbook.AppendLine();
        foreach (var tableName in sourceOnlyTables.OrderBy(t => t, StringComparer.OrdinalIgnoreCase))
        {
            var src = sourceTables[tableName];
            var archiveSql = BuildArchiveExport(src, tableName);
            await File.WriteAllTextAsync(Path.Combine(archiveDir, $"{tableName}.export.sql"), archiveSql);
            runbook.AppendLine($"- `{tableName}`: `psql \"$SOURCE_CONN\" -f archive/{tableName}.export.sql` -> `archive/{tableName}.json.copy` (keep this file for the record; V4.1 has no table to load it into)");
        }

        await File.WriteAllTextAsync(Path.Combine(outputDir, "RUNBOOK.md"), runbook.ToString());
    }

    private static (string exportSql, string importSql, List<string> tenantColumns, List<string> dropped, List<string> defaulted)
        BuildTablePair(TableInfo src, TableInfo tgt, string prefix, string baseName, Guid rootTenantId)
    {
        var sourceColByName = src.Columns.ToDictionary(c => c.Name, StringComparer.OrdinalIgnoreCase);
        var targetColByName = tgt.Columns.ToDictionary(c => c.Name, StringComparer.OrdinalIgnoreCase);

        var copyColumns = tgt.Columns.Where(tc => sourceColByName.ContainsKey(tc.Name)).Select(tc => tc.Name).ToList();
        var tenantColumns = tgt.Columns.Where(tc => !sourceColByName.ContainsKey(tc.Name) && tc.IsTenantColumn).Select(tc => tc.Name).ToList();
        var dropped = src.Columns.Where(sc => !targetColByName.ContainsKey(sc.Name)).Select(sc => sc.Name).ToList();
        var defaulted = tgt.Columns.Where(tc => !sourceColByName.ContainsKey(tc.Name) && !tc.IsTenantColumn).Select(tc => tc.Name).ToList();
        var insertColumns = copyColumns.Concat(tenantColumns).ToList();

        var quotedTable = Quoting.Ident(tgt.Name);
        var quotedSourceTable = Quoting.Ident(src.Name);
        var copyColsQuoted = string.Join(", ", copyColumns.Select(Quoting.Ident));
        var insertColsQuoted = string.Join(", ", insertColumns.Select(Quoting.Ident));
        var quotedStage = Quoting.Ident($"stage_{baseName}");
        var copyFileName = $"{prefix}_{baseName}.copy";

        var exportSql =
            $"-- Export {src.Name}: {copyColumns.Count} column(s) shared with V4.1's {tgt.Name}.\n" +
            $"-- Plain COPY text format (not CSV) so NULL vs empty-string is unambiguous.\n" +
            $"\\copy (select {copyColsQuoted} from {quotedSourceTable}) to 'export/{copyFileName}'\n";

        var sb = new StringBuilder();
        sb.AppendLine($"-- Import into {tgt.Name} from export/{copyFileName} (copy it into import/ first).");
        sb.AppendLine("begin;");
        sb.AppendLine();
        sb.AppendLine($"create temp table {quotedStage} as select {insertColsQuoted} from {quotedTable} with no data;");
        sb.AppendLine();
        sb.AppendLine($"\\copy {quotedStage} ({copyColsQuoted}) from 'import/{copyFileName}'");
        sb.AppendLine();
        foreach (var tenantCol in tenantColumns)
        {
            var colInfo = targetColByName[tenantCol];
            var quotedCol = Quoting.Ident(tenantCol);
            var literal = colInfo.UdtName.Equals("uuid", StringComparison.OrdinalIgnoreCase)
                ? $"'{rootTenantId}'::uuid"
                : $"'{rootTenantId}'";
            sb.AppendLine($"update {quotedStage} set {quotedCol} = {literal} where {quotedCol} is null;");
        }
        if (tenantColumns.Count > 0) sb.AppendLine();

        var pkCols = tgt.PrimaryKeyColumns.Where(insertColumns.Contains).ToList();
        var onConflict = pkCols.Count > 0 ? $"\non conflict ({string.Join(", ", pkCols.Select(Quoting.Ident))}) do nothing" : "";
        sb.AppendLine($"insert into {quotedTable} ({insertColsQuoted})");
        sb.AppendLine($"select {insertColsQuoted} from {quotedStage}{onConflict};");

        var serialCols = tgt.Columns.Where(c => insertColumns.Contains(c.Name) && c.IsSerial).ToList();
        if (serialCols.Count > 0) sb.AppendLine();
        foreach (var col in serialCols)
        {
            sb.AppendLine($"select setval(pg_get_serial_sequence('{Escape(tgt.Name)}', '{Escape(col.Name)}'), " +
                $"greatest((select coalesce(max({Quoting.Ident(col.Name)}),0) from {quotedTable}), 1), true);");
        }

        sb.AppendLine();
        sb.AppendLine($"drop table {quotedStage};");
        sb.AppendLine("commit;");

        return (exportSql, sb.ToString(), tenantColumns, dropped, defaulted);
    }

    private static string BuildArchiveExport(TableInfo src, string tableName)
    {
        var quotedTable = Quoting.Ident(src.Name);
        return
            $"-- Archive-only export: {src.Name} has no matching table in V4.1, so this is kept as a\n" +
            $"-- JSON-lines file for the record rather than loaded anywhere. One JSON object per row.\n" +
            $"\\copy (select row_to_json(t) from {quotedTable} t) to 'archive/{tableName}.json.copy'\n";
    }

    private static string Escape(string s) => s.Replace("'", "''");
}
