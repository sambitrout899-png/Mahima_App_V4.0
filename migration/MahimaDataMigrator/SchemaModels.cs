namespace MahimaDataMigrator;

public sealed class ColumnInfo
{
    public required string Name { get; init; }
    public required string DataType { get; init; }
    public required string UdtName { get; init; }
    public bool IsNullable { get; init; }
    public string? ColumnDefault { get; init; }
    public int OrdinalPosition { get; init; }

    /// <summary>
    /// V4.1 retrofitted a tenant column (snake_case "tenant_id" or legacy PascalCase "TenantId")
    /// onto most core tables. Any such column that only exists on the target side is backfilled
    /// with the configured root tenant id instead of being left to its default/NULL.
    /// </summary>
    public bool IsTenantColumn => Name.Equals("tenant_id", StringComparison.OrdinalIgnoreCase);

    public bool IsSerial => ColumnDefault is not null &&
        ColumnDefault.StartsWith("nextval(", StringComparison.OrdinalIgnoreCase);
}

public sealed class TableInfo
{
    public required string Name { get; init; }
    public required List<ColumnInfo> Columns { get; init; }
    public List<string> PrimaryKeyColumns { get; set; } = new();

    public ColumnInfo? FindColumn(string name) =>
        Columns.FirstOrDefault(c => c.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
}

public static class Quoting
{
    public static string Ident(string name) => "\"" + name.Replace("\"", "\"\"") + "\"";
}
