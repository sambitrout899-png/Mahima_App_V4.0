using System.Text.Json;

namespace MahimaDataMigrator;

public sealed class MigrationSettings
{
    /// <summary>Npgsql connection string for the V4.0 on-prem source database.</summary>
    public string SourceConnectionString { get; set; } = "";

    /// <summary>Npgsql connection string for the V4.1 multi-tenant target database.</summary>
    public string TargetConnectionString { get; set; } = "";

    /// <summary>
    /// Id (uuid) of the existing "Mahima Root" tenant in V4.1 (tenants.slug = 'mahima-root').
    /// Backfilled into any tenant_id/TenantId column that exists on the target table but not the source.
    /// </summary>
    public string RootTenantId { get; set; } = "";

    /// <summary>Where JSON archives of source-only tables (no V4.1 equivalent) are written.</summary>
    public string ArchiveDirectory { get; set; } = "./migration-output/archive";

    /// <summary>Where per-run JSON/markdown reports are written.</summary>
    public string ReportDirectory { get; set; } = "./migration-output/reports";

    /// <summary>Where 'generate' mode writes its static export/import psql scripts + RUNBOOK.md.</summary>
    public string GeneratedScriptsDirectory { get; set; } = "./migration-output/generated";

    /// <summary>
    /// Tables present in both databases that should NOT be copied (e.g. global lookup tables
    /// already seeded independently in V4.1, such as roles/pages/app_languages).
    /// </summary>
    public List<string> SkipTables { get; set; } = new();

    public static MigrationSettings Load(string path)
    {
        if (!File.Exists(path))
            throw new FileNotFoundException(
                $"Settings file not found: {path}. Copy migration.settings.example.json to migration.settings.json and fill in real values.");

        var json = File.ReadAllText(path);
        var settings = JsonSerializer.Deserialize<MigrationSettings>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("Could not parse settings file.");

        if (string.IsNullOrWhiteSpace(settings.SourceConnectionString))
            throw new InvalidOperationException("SourceConnectionString is required.");
        if (string.IsNullOrWhiteSpace(settings.TargetConnectionString))
            throw new InvalidOperationException("TargetConnectionString is required.");
        if (string.IsNullOrWhiteSpace(settings.RootTenantId) || !Guid.TryParse(settings.RootTenantId, out _))
            throw new InvalidOperationException(
                "RootTenantId must be the GUID of the existing 'Mahima Root' tenant in the V4.1 database.");

        return settings;
    }
}
