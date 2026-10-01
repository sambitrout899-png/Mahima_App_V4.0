using System.Text.Json;
using Npgsql;

namespace MahimaDataMigrator;

/// <summary>
/// Exports tables that exist only in the V4.0 source (no equivalent table in V4.1, e.g.
/// accounting_data_snapshots and the chicken_sale_* tables) to JSON files instead of silently
/// dropping them. Nothing here is written to the target database.
/// </summary>
public static class Archiver
{
    public static async Task<Dictionary<string, long>> ArchiveTablesAsync(
        NpgsqlConnection source, IEnumerable<string> tableNames, string outputDir)
    {
        Directory.CreateDirectory(outputDir);
        var counts = new Dictionary<string, long>();

        foreach (var table in tableNames.OrderBy(t => t, StringComparer.OrdinalIgnoreCase))
        {
            var quoted = Quoting.Ident(table);
            var outPath = Path.Combine(outputDir, $"{table}.json");

            await using var fs = File.Create(outPath);
            fs.Write("["u8);
            var first = true;
            long count = 0;

            await using (var cmd = new NpgsqlCommand($"select row_to_json(t) from {quoted} t", source))
            await using (var reader = await cmd.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    if (!first) fs.Write(","u8);
                    first = false;
                    var bytes = System.Text.Encoding.UTF8.GetBytes(reader.GetString(0));
                    fs.Write(bytes);
                    count++;
                }
            }

            fs.Write("]"u8);
            counts[table] = count;
        }

        return counts;
    }
}
