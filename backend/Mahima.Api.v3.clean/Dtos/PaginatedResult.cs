using System;
using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Dtos
{
    public class PaginatedResult<T>
    {
        public IEnumerable<T> Items { get; }
        public int Total { get; }
        public int Page { get; }
        public int Size { get; }
        public int TotalPages => Size <= 0 ? 0 : (int)Math.Ceiling((double)Total / Size);

        public PaginatedResult(IEnumerable<T> items, int total, int page, int size)
        {
            Items = items;
            Total = total;
            Page = page;
            Size = size;
        }
    }
}
