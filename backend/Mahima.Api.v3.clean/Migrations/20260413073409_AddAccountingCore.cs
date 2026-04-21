using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Mahima.Api.v3.clean.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountingCore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "accounts",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accounts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "journal_entries",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_journal_entries", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "journal_lines",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    journal_entry_id = table.Column<long>(type: "bigint", nullable: false),
                    account_id = table.Column<long>(type: "bigint", nullable: false),
                    debit = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    credit = table.Column<decimal>(type: "numeric(12,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_journal_lines", x => x.id);
                    table.ForeignKey(
                        name: "FK_journal_lines_accounts_account_id",
                        column: x => x.account_id,
                        principalSchema: "public",
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_journal_lines_journal_entries_journal_entry_id",
                        column: x => x.journal_entry_id,
                        principalSchema: "public",
                        principalTable: "journal_entries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_accounts_name",
                schema: "public",
                table: "accounts",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_journal_lines_account_id",
                schema: "public",
                table: "journal_lines",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "IX_journal_lines_journal_entry_id",
                schema: "public",
                table: "journal_lines",
                column: "journal_entry_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "journal_lines",
                schema: "public");

            migrationBuilder.DropTable(
                name: "accounts",
                schema: "public");

            migrationBuilder.DropTable(
                name: "journal_entries",
                schema: "public");
        }
    }
}
