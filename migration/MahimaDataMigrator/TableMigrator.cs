using Npgsql;
using NpgsqlTypes;

namespace MahimaDataMigrator;

public sealed class TableMigrationResult
{
    public required string Table { get; init; }
    public long SourceRowCount { get; set; }
    public long StagedRowCount { get; set; }
    public long InsertedRowCount { get; set; }
    public List<string> DroppedSourceOnlyColumns { get; set; } = new();
    public List<string> DefaultedTargetOnlyColumns { get; set; } = new();
    public List<string> TenantBackfilledColumns { get; set; } = new();
    public string? Error { get; set; }
}

/// <summary>
/// Copies one table's data from the V4.0 source database into the matching V4.1 target table.
///
/// Column handling is derived at run time from information_schema on both sides (no hard-coded
/// per-table mapping), so the tool keeps working as either schema evolves:
///   - columns present in both  -> copied as-is
///   - target-only tenant_id/TenantId column -> backfilled with the configured root tenant id
///   - other target-only columns -> left to the column's own DEFAULT/NULL
///   - source-only columns -> dropped (reported, so real data loss is visible, not silent)
///
/// Data flows through a per-table TEMP TABLE staged via Postgres COPY (fast, no per-row
/// round-trips, no manual value escaping), then merged with INSERT ... ON CONFLICT DO NOTHING
/// against the target's real primary key, which makes the whole run safely re-runnable.
/// </summary>
public static class TableMigrator
{
    public static async Task<TableMigrationResult> MigrateAsync(
        NpgsqlConnection source, NpgsqlConnection target,
        TableInfo sourceTable, TableInfo targetTable, Guid rootTenantId)
    {
        var result = new TableMigrationResult { Table = targetTable.Name };
        var quotedTable = Quoting.Ident(targetTable.Name);
        var quotedSourceTable = Quoting.Ident(sourceTable.Name);
        var stageTable = Quoting.Ident($"_stage_{targetTable.Name}");

        var sourceColByName = sourceTable.Columns.ToDictionary(c => c.Name, StringComparer.OrdinalIgnoreCase);
        var targetColByName = targetTable.Columns.ToDictionary(c => c.Name, StringComparer.OrdinalIgnoreCase);

        var copyColumns = targetTable.Columns
            .Where(tc => sourceColByName.ContainsKey(tc.Name))
            .Select(tc => tc.Name)
            .ToList();

        var tenantColumns = targetTable.Columns
            .Where(tc => !sourceColByName.ContainsKey(tc.Name) && tc.IsTenantColumn)
            .Select(tc => tc.Name)
            .ToList();

        result.DroppedSourceOnlyColumns = sourceTable.Columns
            .Where(sc => !targetColByName.ContainsKey(sc.Name))
            .Select(sc => sc.Name)
            .ToList();

        result.DefaultedTargetOnlyColumns = targetTable.Columns
            .Where(tc => !sourceColByName.ContainsKey(tc.Name) && !tc.IsTenantColumn)
            .Select(tc => tc.Name)
            .ToList();

        result.TenantBackfilledColumns = tenantColumns;

        var insertColumns = copyColumns.Concat(tenantColumns).ToList();
        if (insertColumns.Count == 0)
        {
            result.Error = "No overlapping columns between source and target; skipped.";
            return result;
        }

        await using (var countCmd = new NpgsqlCommand($"select count(*) from {quotedSourceTable}", source))
        {
            result.SourceRowCount = (long)(await countCmd.ExecuteScalarAsync() ?? 0L);
        }

        if (result.SourceRowCount == 0)
        {
            return result;
        }

        await using var tx = await target.BeginTransactionAsync();
        try
        {
            var insertColsQuoted = string.Join(", ", insertColumns.Select(Quoting.Ident));
            await using (var createStage = new NpgsqlCommand(
                $"create temp table {stageTable} as select {insertColsQuoted} from {quotedTable} with no data",
                target, tx))
            {
                await createStage.ExecuteNonQueryAsync();
            }

            var copyColsQuoted = string.Join(", ", copyColumns.Select(Quoting.Ident));
            var exportSql = $"copy (select {copyColsQuoted} from {quotedSourceTable}) to stdout";
            var importSql = $"copy {stageTable} ({copyColsQuoted}) from stdin";

            using (var exportReader = await source.BeginTextExportAsync(exportSql))
            await using (var importWriter = await target.BeginTextImportAsync(importSql))
            {
                var buffer = new char[81920];
                int read;
                while ((read = await exportReader.ReadAsync(buffer, 0, buffer.Length)) > 0)
                {
                    await importWriter.WriteAsync(buffer, 0, read);
                }
            }

            await using (var stagedCountCmd = new NpgsqlCommand($"select count(*) from {stageTable}", target, tx))
            {
                result.StagedRowCount = (long)(await stagedCountCmd.ExecuteScalarAsync() ?? 0L);
            }

            foreach (var tenantCol in tenantColumns)
            {
                var colInfo = targetColByName[tenantCol];
                var quotedCol = Quoting.Ident(tenantCol);
                await using var updateCmd = new NpgsqlCommand(
                    $"update {stageTable} set {quotedCol} = @tenantId where {quotedCol} is null", target, tx);
                if (colInfo.UdtName.Equals("uuid", StringComparison.OrdinalIgnoreCase))
                    updateCmd.Parameters.Add(new NpgsqlParameter("tenantId", NpgsqlDbType.Uuid) { Value = rootTenantId });
                else
                    updateCmd.Parameters.Add(new NpgsqlParameter("tenantId", NpgsqlDbType.Text) { Value = rootTenantId.ToString() });
                await updateCmd.ExecuteNonQueryAsync();
            }

            var pkCols = targetTable.PrimaryKeyColumns.Where(insertColumns.Contains).ToList();
            var onConflict = pkCols.Count > 0
                ? $"on conflict ({string.Join(", ", pkCols.Select(Quoting.Ident))}) do nothing"
                : "";

            await using (var mergeCmd = new NpgsqlCommand(
                $"insert into {quotedTable} ({insertColsQuoted}) select {insertColsQuoted} from {stageTable} {onConflict}",
                target, tx))
            {
                result.InsertedRowCount = await mergeCmd.ExecuteNonQueryAsync();
            }

            foreach (var col in targetTable.Columns.Where(c => insertColumns.Contains(c.Name) && c.IsSerial))
            {
                await using var seqCmd = new NpgsqlCommand(
                    "select setval(pg_get_serial_sequence(@table, @col), " +
                    $"greatest((select coalesce(max({Quoting.Ident(col.Name)}),0) from {quotedTable}), 1), true)",
                    target, tx);
                seqCmd.Parameters.AddWithValue("table", targetTable.Name);
                seqCmd.Parameters.AddWithValue("col", col.Name);
                await seqCmd.ExecuteScalarAsync();
            }

            await using (var dropStage = new NpgsqlCommand($"drop table if exists {stageTable}", target, tx))
            {
                await dropStage.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            result.Error = ex.Message;
        }

        return result;
    }
}
