using System;

namespace Mahima.Api.v3.clean.Dtos
{
    public record ChatBlockStatusDto(
        Guid ChatId,
        bool IsDirect,
        Guid? OtherUserId,
        bool IBlockedThem,
        bool TheyBlockedMe)
    {
        public bool IsBlocked => IBlockedThem || TheyBlockedMe;
    }
}
