// services/Counselling/NotificationService.cs
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Models.Counselling;

namespace Mahima.Api.v3.clean.services.Counselling
{
    public interface INotificationService
    {
        Task SendCandidateScheduledAsync(CounsellingSession session);
        Task SendEscalationNotificationsAsync(CounsellingSession session);
        Task SendCaseClosedAsync(CounsellingSession session);
    }

    public class NotificationService : INotificationService
    {
        // Inject your email/SMS services here

        public Task SendCandidateScheduledAsync(CounsellingSession session)
        {
            // TODO: email + SMS to candidate with token and time
            return Task.CompletedTask;
        }

        public Task SendEscalationNotificationsAsync(CounsellingSession session)
        {
            // TODO: email + SMS to candidate & senior pastor
            return Task.CompletedTask;
        }

        public Task SendCaseClosedAsync(CounsellingSession session)
        {
            // TODO: gentle closure message
            return Task.CompletedTask;
        }
    }
}
