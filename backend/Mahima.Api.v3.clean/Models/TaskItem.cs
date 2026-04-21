using System;

namespace Mahima.Api.v3.clean.Models
{
    public enum TaskStatus { open, in_progress, review, closed }

    public class TaskItem
    {
        public long Id { get; set; }
        public string Title { get; set; } = "";
        public string? Description { get; set; }

        public Guid? CreatedById { get; set; }
        public User? CreatedBy { get; set; }

        public Guid? AssigneeId { get; set; }
        public User? Assignee { get; set; }

        public long? TeamId { get; set; }
        public Team? Team { get; set; }

        public TaskStatus Status { get; set; } = TaskStatus.open;
        public int Priority { get; set; } = 3;
        public DateTime? DueDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
    }
}
