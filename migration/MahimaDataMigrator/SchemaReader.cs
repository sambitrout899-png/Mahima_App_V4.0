using Npgsql;

namespace MahimaDataMigrator;

public static class SchemaReader
{
    public static async Task<Dictionary<string, TableInfo>> ReadTablesAsync(NpgsqlConnection conn)
    {
        var tables = new Dictionary<string, TableInfo>(StringComparer.OrdinalIgnoreCase);

        const string tableSql = @"
            select table_name
            from information_schema.tables
            where table_schema = 'public' and table_type = 'BASE TABLE'";

        await using (var cmd = new NpgsqlCommand(tableSql, conn))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                var name = reader.GetString(0);
                tables[name] = new TableInfo { Name = name, Columns = new List<ColumnInfo>() };
            }
        }

        const string colSql = @"
            select table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position
            from information_schema.columns
            where table_schema = 'public'
            order by table_name, ordinal_position";

        await using (var cmd = new NpgsqlCommand(colSql, conn))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                var tableName = reader.GetString(0);
                if (!tables.TryGetValue(tableName, out var table)) continue;
                table.Columns.Add(new ColumnInfo
                {
                    Name = reader.GetString(1),
                    DataType = reader.GetString(2),
                    UdtName = reader.GetString(3),
                    IsNullable = reader.GetString(4) == "YES",
                    ColumnDefault = reader.IsDBNull(5) ? null : reader.GetString(5),
                    OrdinalPosition = reader.GetInt32(6)
                });
            }
        }

        const string pkSql = @"
            select tc.table_name, kcu.column_name
            from information_schema.table_constraints tc
            join information_schema.key_column_usage kcu
              on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
            where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = 'public'
            order by tc.table_name, kcu.ordinal_position";

        await using (var cmd = new NpgsqlCommand(pkSql, conn))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                var tableName = reader.GetString(0);
                if (!tables.TryGetValue(tableName, out var table)) continue;
                table.PrimaryKeyColumns.Add(reader.GetString(1));
            }
        }

        return tables;
    }

    public static async Task<List<(string Child, string Parent)>> ReadForeignKeyEdgesAsync(
        NpgsqlConnection conn, IReadOnlySet<string> tableFilter)
    {
        const string fkSql = @"
            select tc.table_name as child_table, ccu.table_name as parent_table
            from information_schema.table_constraints tc
            join information_schema.constraint_column_usage ccu
              on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
            where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'";

        var edges = new List<(string, string)>();
        await using var cmd = new NpgsqlCommand(fkSql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var child = reader.GetString(0);
            var parent = reader.GetString(1);
            if (!tableFilter.Contains(child) || !tableFilter.Contains(parent)) continue;
            if (string.Equals(child, parent, StringComparison.OrdinalIgnoreCase)) continue;
            edges.Add((child, parent));
        }
        return edges;
    }

    /// <summary>
    /// Orders tables so parents load before children. Any table caught in an FK cycle
    /// is appended in a stable order rather than aborting the whole run.
    /// </summary>
    public static List<string> TopologicalSort(
        IReadOnlyCollection<string> tableNames, IReadOnlyCollection<(string Child, string Parent)> edges)
    {
        var inDegree = tableNames.ToDictionary(t => t, _ => 0, StringComparer.OrdinalIgnoreCase);
        var dependents = tableNames.ToDictionary(t => t, _ => new List<string>(), StringComparer.OrdinalIgnoreCase);

        foreach (var (child, parent) in edges)
        {
            if (!inDegree.ContainsKey(child) || !inDegree.ContainsKey(parent)) continue;
            dependents[parent].Add(child);
            inDegree[child]++;
        }

        var queue = new Queue<string>(inDegree.Where(kv => kv.Value == 0)
            .Select(kv => kv.Key).OrderBy(t => t, StringComparer.OrdinalIgnoreCase));
        var result = new List<string>();
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        while (queue.Count > 0)
        {
            var node = queue.Dequeue();
            if (!visited.Add(node)) continue;
            result.Add(node);
            foreach (var dep in dependents[node].OrderBy(t => t, StringComparer.OrdinalIgnoreCase))
            {
                inDegree[dep]--;
                if (inDegree[dep] == 0) queue.Enqueue(dep);
            }
        }

        foreach (var t in tableNames.OrderBy(t => t, StringComparer.OrdinalIgnoreCase))
        {
            if (visited.Add(t)) result.Add(t);
        }

        return result;
    }
}
