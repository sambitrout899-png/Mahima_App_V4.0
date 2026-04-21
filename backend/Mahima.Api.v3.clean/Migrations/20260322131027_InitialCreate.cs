using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Mahima.Api.v3.clean.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "public");

            migrationBuilder.CreateTable(
                name: "analytics_prayer_overview",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    snapshot_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    period_label = table.Column<string>(type: "text", nullable: false),
                    total_requests = table.Column<int>(type: "integer", nullable: false),
                    open_requests = table.Column<int>(type: "integer", nullable: false),
                    closed_requests = table.Column<int>(type: "integer", nullable: false),
                    testified_requests = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_analytics_prayer_overview", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "analytics_task_by_role",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    role = table.Column<string>(type: "text", nullable: false),
                    snapshot_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    total_tasks = table.Column<int>(type: "integer", nullable: false),
                    completed_tasks = table.Column<int>(type: "integer", nullable: false),
                    open_tasks = table.Column<int>(type: "integer", nullable: false),
                    overdue_tasks = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_analytics_task_by_role", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "analytics_user_overview",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    snapshot_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    total_users = table.Column<int>(type: "integer", nullable: false),
                    total_admins = table.Column<int>(type: "integer", nullable: false),
                    total_members = table.Column<int>(type: "integer", nullable: false),
                    total_staff = table.Column<int>(type: "integer", nullable: false),
                    total_volunteers = table.Column<int>(type: "integer", nullable: false),
                    new_members_30d = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_analytics_user_overview", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Attachments",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OwnerType = table.Column<string>(type: "text", nullable: false),
                    OwnerId = table.Column<long>(type: "bigint", nullable: false),
                    S3Key = table.Column<string>(type: "text", nullable: false),
                    Filename = table.Column<string>(type: "text", nullable: true),
                    ContentType = table.Column<string>(type: "text", nullable: true),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    UploadedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attachments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AttendanceRecords",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceRecords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: true),
                    Action = table.Column<string>(type: "text", nullable: false),
                    EntityType = table.Column<string>(type: "text", nullable: true),
                    EntityId = table.Column<string>(type: "text", nullable: true),
                    Details = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "baptism_requests",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    token = table.Column<string>(type: "text", nullable: true),
                    full_name = table.Column<string>(type: "text", nullable: false),
                    father_name = table.Column<string>(type: "text", nullable: true),
                    mother_name = table.Column<string>(type: "text", nullable: true),
                    date_of_birth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    contact_number = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    church_member_id = table.Column<int>(type: "integer", nullable: true),
                    preferred_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    preferred_service = table.Column<string>(type: "text", nullable: true),
                    church_verified = table.Column<bool>(type: "boolean", nullable: false),
                    church_verified_by = table.Column<int>(type: "integer", nullable: true),
                    church_verified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    consent_signed = table.Column<bool>(type: "boolean", nullable: false),
                    consent_signed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    consent_signed_by = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "Pending"),
                    certificate_pdf_url = table.Column<string>(type: "text", nullable: true),
                    baptism_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    baptism_place = table.Column<string>(type: "text", nullable: true),
                    baptized_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_baptism_requests", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "candidates",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    is_church_member = table.Column<bool>(type: "boolean", nullable: false),
                    member_id = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_candidates", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "expenses",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    description = table.Column<string>(type: "text", nullable: false),
                    category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    date = table.Column<DateTime>(type: "date", nullable: false),
                    vendor = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    payroll_person = table.Column<string>(type: "text", nullable: true),
                    payroll_month = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    created_by_user_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expenses", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "marriage_applications",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    groom_full_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    bride_full_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    groom_phone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    bride_phone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    groom_email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    bride_email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    groom_is_member = table.Column<bool>(type: "boolean", nullable: false),
                    bride_is_member = table.Column<bool>(type: "boolean", nullable: false),
                    groom_member_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    bride_member_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    preferred_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    preferred_service = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ceremony_location = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    token = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approved_by_user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_marriage_applications", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Meetings",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Location = table.Column<string>(type: "text", nullable: true),
                    LocationLat = table.Column<decimal>(type: "numeric", nullable: true),
                    LocationLng = table.Column<decimal>(type: "numeric", nullable: true),
                    StartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RsvpRequired = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Meetings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "pages",
                columns: table => new
                {
                    key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    id = table.Column<int>(type: "integer", nullable: true),
                    title = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pages", x => x.key);
                });

            migrationBuilder.CreateTable(
                name: "payroll_runs",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    staff_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    from_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    to_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    total_hours = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    hourly_rate = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    fixed_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    allowances = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    deductions = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    gross_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    net_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    run_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payroll_runs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "prayerrequests",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<Guid>(type: "uuid", nullable: true),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    message = table.Column<string>(type: "text", nullable: true),
                    anonymous = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    assignedto = table.Column<Guid>(type: "uuid", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    createdby = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    closecomment = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prayerrequests", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Sermons",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    S3Key = table.Column<string>(type: "text", nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true),
                    Speaker = table.Column<string>(type: "text", nullable: true),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sermons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "staff_payroll_settings",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    hourly_rate = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    monthly_fixed_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    allowances = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    deductions = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_payroll_settings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Timesheets",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Hours = table.Column<decimal>(type: "numeric", nullable: false),
                    Task = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Timesheets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserCode = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    cognitosub = table.Column<string>(type: "text", nullable: true),
                    username = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    phone = table.Column<string>(type: "text", nullable: true),
                    displayname = table.Column<string>(type: "text", nullable: true),
                    role = table.Column<string>(type: "text", nullable: false),
                    joindate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    lastlogin = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MaritalStatus = table.Column<string>(type: "text", nullable: true),
                    Sex = table.Column<string>(type: "text", nullable: true),
                    IsBaptized = table.Column<bool>(type: "boolean", nullable: true),
                    BaptismPlace = table.Column<string>(type: "text", nullable: true),
                    BaptismDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsBornAgain = table.Column<bool>(type: "boolean", nullable: true),
                    IsBeliever = table.Column<bool>(type: "boolean", nullable: true),
                    Birthday = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Age = table.Column<int>(type: "integer", nullable: true),
                    AadharNumber = table.Column<string>(type: "text", nullable: true),
                    HomeAddress = table.Column<string>(type: "text", nullable: true),
                    CurrentAddress = table.Column<string>(type: "text", nullable: true),
                    EmergencyContactPhone = table.Column<string>(type: "text", nullable: true),
                    IsPastor = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "counselling_cases",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    candidate_id = table.Column<Guid>(type: "uuid", nullable: false),
                    issue_category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    closed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_counselling_cases", x => x.id);
                    table.ForeignKey(
                        name: "fk_counsellingcases_candidateid",
                        column: x => x.candidate_id,
                        principalSchema: "public",
                        principalTable: "candidates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prayerresponses",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    prayerrequestid = table.Column<long>(type: "bigint", nullable: false),
                    userid = table.Column<Guid>(type: "uuid", nullable: true),
                    message = table.Column<string>(type: "text", nullable: false),
                    author = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prayerresponses", x => x.id);
                    table.ForeignKey(
                        name: "fk_prayerresponses_prayerrequest",
                        column: x => x.prayerrequestid,
                        principalSchema: "public",
                        principalTable: "prayerrequests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    role_id = table.Column<int>(type: "integer", nullable: false),
                    page_key = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permissions", x => x.id);
                    table.ForeignKey(
                        name: "FK_role_permissions_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "adminnotifications",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<Guid>(type: "uuid", nullable: true),
                    type = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    message = table.Column<string>(type: "text", nullable: true),
                    data = table.Column<string>(type: "text", nullable: true),
                    isread = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_adminnotifications", x => x.id);
                    table.ForeignKey(
                        name: "fk_adminnotifications_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chats",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true),
                    isgroup = table.Column<bool>(type: "boolean", nullable: false),
                    createdby = table.Column<Guid>(type: "uuid", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chats", x => x.id);
                    table.ForeignKey(
                        name: "fk_chats_createdby",
                        column: x => x.createdby,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Teams",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    LeadUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Teams", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Teams_users_LeadUserId",
                        column: x => x.LeadUserId,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "counselling_sessions",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    location = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    counselor_id = table.Column<Guid>(type: "uuid", nullable: true),
                    token_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    token_pdf_url = table.Column<string>(type: "text", nullable: true),
                    outcome = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_counselling_sessions", x => x.id);
                    table.ForeignKey(
                        name: "fk_counsellingsessions_caseid",
                        column: x => x.case_id,
                        principalSchema: "public",
                        principalTable: "counselling_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chatmembers",
                schema: "public",
                columns: table => new
                {
                    chatid = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    joinedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chatmembers", x => new { x.chatid, x.userid });
                    table.ForeignKey(
                        name: "fk_chatmembers_chatid",
                        column: x => x.chatid,
                        principalSchema: "public",
                        principalTable: "chats",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_chatmembers_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "messages",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    chatid = table.Column<Guid>(type: "uuid", nullable: false),
                    senderid = table.Column<Guid>(type: "uuid", nullable: false),
                    content = table.Column<string>(type: "text", nullable: true),
                    contenttype = table.Column<string>(type: "text", nullable: false),
                    attachmenturl = table.Column<string>(type: "text", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_messages", x => x.id);
                    table.ForeignKey(
                        name: "fk_messages_chatid",
                        column: x => x.chatid,
                        principalSchema: "public",
                        principalTable: "chats",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_messages_senderid",
                        column: x => x.senderid,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "analytics_team_productivity",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    snapshot_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    team_id = table.Column<long>(type: "bigint", nullable: false),
                    period_label = table.Column<string>(type: "text", nullable: false),
                    period_start = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    period_end = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    total_hours = table.Column<double>(type: "double precision", nullable: false),
                    avg_hours_per_user = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_analytics_team_productivity", x => x.id);
                    table.ForeignKey(
                        name: "fk_analytics_team_productivity_teamid",
                        column: x => x.team_id,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Tasks",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: true),
                    AssigneeId = table.Column<Guid>(type: "uuid", nullable: true),
                    TeamId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tasks_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Tasks_users_AssigneeId",
                        column: x => x.AssigneeId,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_Tasks_users_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "teammembers",
                schema: "public",
                columns: table => new
                {
                    teamid = table.Column<long>(type: "bigint", nullable: false),
                    userid = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleInTeam = table.Column<string>(type: "text", nullable: true),
                    JoinedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_teammembers", x => new { x.teamid, x.userid });
                    table.ForeignKey(
                        name: "FK_teammembers_Teams_teamid",
                        column: x => x.teamid,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_teammembers_users_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "messagereads",
                schema: "public",
                columns: table => new
                {
                    messageid = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<Guid>(type: "uuid", nullable: false),
                    readat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_messagereads", x => new { x.messageid, x.userid });
                    table.ForeignKey(
                        name: "fk_messagereads_messageid",
                        column: x => x.messageid,
                        principalSchema: "public",
                        principalTable: "messages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_messagereads_userid",
                        column: x => x.userid,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_adminnotifications_userid_isread",
                schema: "public",
                table: "adminnotifications",
                columns: new[] { "userid", "isread" });

            migrationBuilder.CreateIndex(
                name: "IX_analytics_team_productivity_team_id",
                schema: "public",
                table: "analytics_team_productivity",
                column: "team_id");

            migrationBuilder.CreateIndex(
                name: "IX_chatmembers_userid",
                schema: "public",
                table: "chatmembers",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_chats_createdby",
                schema: "public",
                table: "chats",
                column: "createdby");

            migrationBuilder.CreateIndex(
                name: "IX_counselling_cases_candidate_id",
                schema: "public",
                table: "counselling_cases",
                column: "candidate_id");

            migrationBuilder.CreateIndex(
                name: "IX_counselling_sessions_case_id",
                schema: "public",
                table: "counselling_sessions",
                column: "case_id");

            migrationBuilder.CreateIndex(
                name: "IX_marriage_applications_status",
                schema: "public",
                table: "marriage_applications",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_messagereads_userid",
                schema: "public",
                table: "messagereads",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_messages_chatid",
                schema: "public",
                table: "messages",
                column: "chatid");

            migrationBuilder.CreateIndex(
                name: "IX_messages_senderid",
                schema: "public",
                table: "messages",
                column: "senderid");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_runs_user_id_from_date_to_date",
                schema: "public",
                table: "payroll_runs",
                columns: new[] { "user_id", "from_date", "to_date" });

            migrationBuilder.CreateIndex(
                name: "IX_prayerresponses_prayerrequestid",
                schema: "public",
                table: "prayerresponses",
                column: "prayerrequestid");

            migrationBuilder.CreateIndex(
                name: "IX_role_permissions_role_id",
                table: "role_permissions",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_AssigneeId",
                table: "Tasks",
                column: "AssigneeId");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_CreatedById",
                table: "Tasks",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_TeamId",
                table: "Tasks",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_teammembers_userid",
                schema: "public",
                table: "teammembers",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_Teams_LeadUserId",
                table: "Teams",
                column: "LeadUserId");

            migrationBuilder.CreateIndex(
                name: "IX_users_UserCode",
                schema: "public",
                table: "users",
                column: "UserCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "adminnotifications",
                schema: "public");

            migrationBuilder.DropTable(
                name: "analytics_prayer_overview",
                schema: "public");

            migrationBuilder.DropTable(
                name: "analytics_task_by_role",
                schema: "public");

            migrationBuilder.DropTable(
                name: "analytics_team_productivity",
                schema: "public");

            migrationBuilder.DropTable(
                name: "analytics_user_overview",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Attachments");

            migrationBuilder.DropTable(
                name: "AttendanceRecords",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "baptism_requests",
                schema: "public");

            migrationBuilder.DropTable(
                name: "chatmembers",
                schema: "public");

            migrationBuilder.DropTable(
                name: "counselling_sessions",
                schema: "public");

            migrationBuilder.DropTable(
                name: "expenses",
                schema: "public");

            migrationBuilder.DropTable(
                name: "marriage_applications",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Meetings");

            migrationBuilder.DropTable(
                name: "messagereads",
                schema: "public");

            migrationBuilder.DropTable(
                name: "pages");

            migrationBuilder.DropTable(
                name: "payroll_runs",
                schema: "public");

            migrationBuilder.DropTable(
                name: "prayerresponses",
                schema: "public");

            migrationBuilder.DropTable(
                name: "role_permissions");

            migrationBuilder.DropTable(
                name: "Sermons");

            migrationBuilder.DropTable(
                name: "staff_payroll_settings",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Tasks");

            migrationBuilder.DropTable(
                name: "teammembers",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Timesheets",
                schema: "public");

            migrationBuilder.DropTable(
                name: "counselling_cases",
                schema: "public");

            migrationBuilder.DropTable(
                name: "messages",
                schema: "public");

            migrationBuilder.DropTable(
                name: "prayerrequests",
                schema: "public");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "Teams");

            migrationBuilder.DropTable(
                name: "candidates",
                schema: "public");

            migrationBuilder.DropTable(
                name: "chats",
                schema: "public");

            migrationBuilder.DropTable(
                name: "users",
                schema: "public");
        }
    }
}
