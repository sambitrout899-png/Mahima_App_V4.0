using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mahima.Api.v3.clean.Migrations
{
    /// <inheritdoc />
    public partial class AddRunAtToPayrollRun : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ExpectedMonthlyHours",
                schema: "public",
                table: "staff_payroll_settings",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "SalaryType",
                schema: "public",
                table: "staff_payroll_settings",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExpectedMonthlyHours",
                schema: "public",
                table: "staff_payroll_settings");

            migrationBuilder.DropColumn(
                name: "SalaryType",
                schema: "public",
                table: "staff_payroll_settings");
        }
    }
}
