using Mahima.Api.v3.clean.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly MahimaDbContext _db;

        public AnalyticsController(MahimaDbContext db)
        {
            _db = db;
        }

        // --------------------------------------------------------------------
        // 1) REBUILD ANALYTICS (placeholder – using live data)
        // --------------------------------------------------------------------
        [HttpPost("rebuild")]
        public IActionResult RebuildAnalytics()
        {
            return Ok(new
            {
                message = "Analytics is generated live from core tables. No snapshot rebuild required."
            });
        }

        // --------------------------------------------------------------------
        // 2) OVERVIEW
        //    - User Mix (Admins / Members / Staff / Volunteers)
        //    - Tasks (total + byRole from analytics_task_by_role)
        //    - Team Productivity from Timesheets + AttendanceRecords
        // --------------------------------------------------------------------
        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview()
        {
            var now = DateTime.UtcNow;

            // ---------- ROLE LOOKUP (numeric -> name) ----------
            var rolesLookup = await _db.Roles
                .Select(r => new { r.Id, r.Name })
                .ToDictionaryAsync(
                    r => r.Id.ToString(),
                    r => r.Name ?? string.Empty
                );

            // ---------- USER MIX ----------
            var usersRaw = await _db.Users
                .Select(u => new { u.Role, u.JoinDate })
                .ToListAsync();

            string NormalizeRole(string? raw)
            {
                if (string.IsNullOrWhiteSpace(raw))
                    return string.Empty;

                var roleStr = raw.Trim();

                // If role is numeric ("2", "3", "4", "5"), map via roles table
                if (int.TryParse(roleStr, out var id) &&
                    rolesLookup.TryGetValue(id.ToString(), out var mappedName) &&
                    !string.IsNullOrWhiteSpace(mappedName))
                {
                    roleStr = mappedName;
                }

                return roleStr;
            }

            var usersWithNormRole = usersRaw
                .Select(u => new
                {
                    Role = NormalizeRole(u.Role),
                    u.JoinDate
                })
                .ToList();

            int totalUsers = usersWithNormRole.Count;

            bool IsRole(string role, string target) =>
                !string.IsNullOrEmpty(role) &&
                role.Equals(target, StringComparison.OrdinalIgnoreCase);

            int admins = usersWithNormRole.Count(u => IsRole(u.Role, "Admin"));
            int members = usersWithNormRole.Count(u => IsRole(u.Role, "Member"));
            int staff = usersWithNormRole.Count(u => IsRole(u.Role, "Staff"));
            int volunteers = usersWithNormRole.Count(u => IsRole(u.Role, "Volunteer"));

            var fromDateMembers = now.AddDays(-30);
            int newMembers30d = usersWithNormRole.Count(u =>
                IsRole(u.Role, "Member") &&
                u.JoinDate >= fromDateMembers);

            var users = new
            {
                active = totalUsers,
                total = totalUsers,
                admins,
                members,
                staff,
                volunteers,
                newMembers30d
            };

            // ---------- TASKS (TOTAL + BY ROLE FROM SNAPSHOT TABLE) ----------
            var totalTasks = await _db.Tasks.CountAsync();

            // latest snapshot from analytics_task_by_role
            DateTime? latestTaskSnapshot = await _db.AnalyticsTaskByRole
                .MaxAsync(a => (DateTime?)a.SnapshotAt);

            var tasksByRole = new List<object>();

            if (latestTaskSnapshot != null)
            {
                var rows = await _db.AnalyticsTaskByRole
                    .Where(a => a.SnapshotAt == latestTaskSnapshot)
                    .ToListAsync();

                tasksByRole = rows
                    .Select(a =>
                    {
                        // a.Role might be "Admin" or a numeric code ("2","3",...)
                        var roleKey = a.Role ?? string.Empty;

                        if (!string.IsNullOrWhiteSpace(roleKey) &&
                            int.TryParse(roleKey, out var roleId) &&
                            rolesLookup.TryGetValue(roleId.ToString(), out var mappedName) &&
                            !string.IsNullOrWhiteSpace(mappedName))
                        {
                            roleKey = mappedName;
                        }

                        return new
                        {
                            role = roleKey,
                            total = a.TotalTasks,
                            open = a.OpenTasks,
                            completed = a.CompletedTasks,
                            overdue = a.OverdueTasks
                        } as object;
                    })
                    .ToList();
            }

            var tasks = new
            {
                total = totalTasks,
                byRole = tasksByRole
            };

            // ---------- TEAM PRODUCTIVITY ----------
            var teamsList = await _db.Teams
                .Select(t => new { t.Id })
                .ToListAsync();

            double avgHoursPerUser = 0.0;
            double attendancePercent = 0.0;

            try
            {
                var allTimesheets = await _db.Timesheets.ToListAsync();
                var allAttendance = await _db.AttendanceRecords.ToListAsync();

                var totalHours = allTimesheets.Sum(ts => (double)ts.Hours);
                var distinctTimesheetUsers = allTimesheets
                    .Select(ts => ts.UserId)
                    .Distinct()
                    .Count();

                if (distinctTimesheetUsers > 0)
                {
                    avgHoursPerUser = totalHours / distinctTimesheetUsers;
                }

                var totalAttendanceRecords = allAttendance.Count;
                var distinctAttendanceUsers = allAttendance
                    .Select(ar => ar.UserId)
                    .Distinct()
                    .Count();

                var periodDays = 30;
                var possibleSlots = distinctAttendanceUsers * periodDays;

                if (possibleSlots > 0)
                {
                    attendancePercent =
                        (double)totalAttendanceRecords / possibleSlots * 100.0;
                }
            }
            catch
            {
                avgHoursPerUser = 0.0;
                attendancePercent = 0.0;
            }

            var teamProductivity = teamsList
                .Select(t => new
                {
                    team = "Team " + t.Id,
                    avgHours = avgHoursPerUser,
                    attendanceRate = attendancePercent
                })
                .Cast<object>()
                .ToList();

            var teams = new
            {
                total = teamsList.Count,
                productivity = teamProductivity
            };

            var overview = new
            {
                snapshotAt = latestTaskSnapshot, // show when the analytics row was taken
                users,
                tasks,
                teams
            };

            return Ok(overview);
        }

        // --------------------------------------------------------------------
        // 3) PRAYERS
        // --------------------------------------------------------------------
        [HttpGet("prayers")]
        public async Task<IActionResult> GetPrayers(
            [FromQuery] string? windows = "7,15,30,60,90,180,365")
        {
            var now = DateTime.UtcNow;

            var windowsParsed = (windows ?? "7,15,30,60,90,180,365")
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Select(s => int.TryParse(s, out var d) ? d : (int?)null)
                .Where(d => d.HasValue && d.Value > 0)
                .Select(d => d!.Value)
                .Distinct()
                .OrderBy(d => d)
                .ToList();

            var result = new Dictionary<int, object>();

            foreach (var days in windowsParsed)
            {
                var fromDate = now.AddDays(-days);

                var total = await _db.PrayerRequests
                    .CountAsync(p => p.CreatedAt >= fromDate);

                var responded = await _db.PrayerResponses
                    .Include(r => r.PrayerRequest)
                    .Where(r => r.PrayerRequest != null &&
                                r.PrayerRequest.CreatedAt >= fromDate)
                    .Select(r => r.PrayerRequestId)
                    .Distinct()
                    .CountAsync();

                result[days] = new
                {
                    total,
                    responded
                };
            }

            var payload = new
            {
                windows = windowsParsed,
                counts = result
            };

            return Ok(payload);
        }

        // --------------------------------------------------------------------
        // 4) ADMIN REPORTS
        // --------------------------------------------------------------------
        [HttpGet("reports")]
        public async Task<IActionResult> GetAdminReports()
        {
            var now = DateTime.UtcNow;
            var from30 = now.AddDays(-30);

            var usersByRole = await _db.Users
                .GroupBy(u => u.Role ?? "Unassigned")
                .Select(g => new { role = g.Key, count = g.Count() })
                .OrderByDescending(x => x.count)
                .ToListAsync();

            var taskStatus = await _db.Tasks
                .GroupBy(t => t.Status)
                .Select(g => new { status = g.Key, count = g.Count() })
                .ToListAsync();

            var taskPriority = await _db.Tasks
                .GroupBy(t => t.Priority)
                .Select(g => new { priority = g.Key, count = g.Count() })
                .ToListAsync();

            var recentMessages = await _db.Messages.CountAsync(m => m.CreatedAt >= from30);
            var totalChats = await _db.Chats.CountAsync();
            var groupChats = await _db.Chats.CountAsync(c => c.IsGroup);

            var journalLines = await _db.JournalLines
                .Include(l => l.Account)
                .Include(l => l.JournalEntry)
                .Where(l => l.JournalEntry.Date >= from30)
                .ToListAsync();

            var accountingByType = journalLines
                .GroupBy(l => l.Account != null ? l.Account.Type : "UNKNOWN")
                .Select(g => new
                {
                    type = g.Key,
                    debit = g.Sum(x => x.Debit),
                    credit = g.Sum(x => x.Credit),
                    net = g.Sum(x => x.Debit - x.Credit)
                })
                .OrderBy(x => x.type)
                .ToList();

            var prayer30 = await _db.PrayerRequests.CountAsync(p => p.CreatedAt >= from30);

            return Ok(new
            {
                snapshotAt = now,
                users = new { byRole = usersByRole, total = await _db.Users.CountAsync() },
                tasks = new { byStatus = taskStatus, byPriority = taskPriority, total = await _db.Tasks.CountAsync() },
                chats = new { total = totalChats, groupChats, directChats = totalChats - groupChats, recentMessages30d = recentMessages },
                accounting = new { last30Days = accountingByType },
                prayers = new { created30d = prayer30 }
            });
        }
    }
}
