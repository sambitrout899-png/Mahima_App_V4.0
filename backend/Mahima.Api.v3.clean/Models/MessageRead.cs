using System;

namespace Mahima.Api.v3.clean.Models
{
    public class MessageRead
    {

	public Guid MessageId { get; set; }   // must match Messages.Id (uuid)
    public Guid UserId { get; set; }      // uuid
   // public DateTime ReadAt { get; set; }

        // Composite primary key (MessageId, UserId)
        // MessageId matches Message.Id which is a long (bigint)
        //public long MessageId { get; set; }
        public virtual Message? Message { get; set; }

        // UserId is a Guid referencing User.Id
       // public Guid UserId { get; set; }

        // When the message was read by the user
        public DateTime ReadAt { get; set; } = DateTime.UtcNow;
    }
}
