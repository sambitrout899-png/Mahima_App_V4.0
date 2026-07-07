using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mahima.Api.v3.clean.Migrations
{
    /// <inheritdoc />
    public partial class AddMinistryAutomationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ministry_automation_settings
            // Stores key/value pairs controlling the automation service
            // (Enabled, TimeZone, schedule times, per-message toggles).
            migrationBuilder.CreateTable(
                name: "ministry_automation_settings",
                schema: "public",
                columns: table => new
                {
                    key = table.Column<string>(type: "text", nullable: false),
                    value = table.Column<string>(type: "text", nullable: false, defaultValue: ""),
                    updated_at_utc = table.Column<DateTime>(
                        type: "timestamp without time zone",
                        nullable: false,
                        defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ministry_automation_settings", x => x.key);
                });

            // ministry_scheduled_message_runs
            // Deduplication log — one row per (message_key, local_date) ensures
            // a given message type is never sent more than once per day.
            migrationBuilder.CreateTable(
                name: "ministry_scheduled_message_runs",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    message_key = table.Column<string>(type: "text", nullable: false),
                    scheduled_local_date = table.Column<DateTime>(type: "date", nullable: false),
                    sent_at_utc = table.Column<DateTime>(
                        type: "timestamp without time zone",
                        nullable: false,
                        defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ministry_scheduled_message_runs", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ux_ministry_scheduled_message_runs_key_date",
                schema: "public",
                table: "ministry_scheduled_message_runs",
                columns: new[] { "message_key", "scheduled_local_date" },
                unique: true);

            // Seed default settings so the service works immediately on a fresh database.
            migrationBuilder.InsertData(
                schema: "public",
                table: "ministry_automation_settings",
                columns: new[] { "key", "value" },
                values: new object[,]
                {
                    { "Enabled",                 "true" },
                    { "TimeZone",                "Asia/Kolkata" },
                    { "DailyWordTime",           "06:30" },
                    { "WelcomeTime",             "07:00" },
                    { "NightPrayerTime",         "18:30" },
                    { "SaturdayReminderTime",    "18:00" },
                    { "DeliveryWindowMinutes",   "90" },
                    { "DailyWordEnabled",        "true" },
                    { "WelcomeEnabled",          "true" },
                    { "NightPrayerEnabled",      "true" },
                    { "SaturdayReminderEnabled", "true" },
                    { "BirthdayGreetingEnabled", "true" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ministry_scheduled_message_runs",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ministry_automation_settings",
                schema: "public");
        }
    }
}
