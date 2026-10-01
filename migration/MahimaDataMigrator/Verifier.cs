using Npgsql;

namespace MahimaDataMigrator;

public sealed class VerifyResult
{
    public required string Table { get; init; }
    public long SourceRowCount { get; set; }
    public long MissingInTarget { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// Post-migration check: for every source primary key, confirm a matching row exists in the
/// target table. Uses row counts rather than raw table-count comparison because target tables
/// can legitimately hold rows that did not come from this migration (other tenants' data,
/// pre-seeded lookup rows, etc.), so a simple count(*) match/mismatch would be misleading.
/// </summary>
public static class Verifier
{
    public static async Task<VerifyResult> VerifyAsync(
        NpgsqlConnection source, NpgsqlConnection target, TableInfo sourceTable, TableInfo targetTable)
    {
        var result = new VerifyResult { Table = targetTable.Name };
        var pkCols = targetTable.PrimaryKeyColumns
            .Where(pk => sourceTable.FindColumn(pk) is not null)
            .ToList();

        var quotedSource = Quoting.Ident(sourceTable.Name);

        await using (var countCmd = new NpgsqlCommand($"select count(*) from {quotedSource}", source))
        {
            result.SourceRowCount = (long)(await countCmd.ExecuteScalarAsync() ?? 0L);
        }

        if (pkCols.Count == 0)
        {
            result.Note = "No primary key shared with source; existence could not be verified.";
            return result;
        }

        if (result.SourceRowCount == 0) return result;

        var quotedTarget = Quoting.Ident(targetTable.Name);
        var pkList = string.Join(", ", pkCols.Select(Quoting.Ident));
        var stageTable = Quoting.Ident($"_verify_{targetTable.Name}");

        await using var tx = await target.BeginTransactionAsync();
        try
        {
            await using (var createStage = new NpgsqlCommand(
                $"create temp table {stageTable} as select {pkList} from {quotedTarget} with no data", target, tx))
            {
                await createStage.ExecuteNonQueryAsync();
            }

            var exportSql = $"copy (select {pkList} from {quotedSource}) to stdout";
            var importSql = $"copy {stageTable} ({pkList}) from stdin";

            using (var exportReader = await source.BeginTextExportAsync(exportSql))
            await using (var importWriter = await target.BeginTextImportAsync(importSql))
            {
                var buffer = new char[81920];
                int read;
                while ((read = await exportReader.ReadAsync(buffer, 0, buffer.Length)) > 0)
                    await importWriter.WriteAsync(buffer, 0, read);
            }

            var joinCond = string.Join(" and ", pkCols.Select(c => $"s.{Quoting.Ident(c)} = t.{Quoting.Ident(c)}"));
            await using (var missingCmd = new NpgsqlCommand(
                $"select count(*) from {stageTable} s left join {quotedTarget} t on {joinCond} where {string.Join(" or ", pkCols.Select(c => $"t.{Quoting.Ident(c)} is null"))}",
                target, tx))
            {
                result.MissingInTarget = (long)(await missingCmd.ExecuteScalarAsync() ?? 0L);
            }

            await using (var dropStage = new NpgsqlCommand($"drop table if exists {stageTable}", target, tx))
                await dropStage.ExecuteNonQueryAsync();

            await tx.CommitAsync();
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            result.Note = $"Verification failed: {ex.Message}";
        }

        return result;
    }
}
