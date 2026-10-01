using Mahima.Api.v3.clean.Features.ChickenSale;

namespace Mahima.Api.v3.clean.Tests;
public sealed class ChickenSaleTests
{
    static ChickenEntry Receive(decimal kg, decimal rate) => new() { Kind = "receive", Kg = kg, Rate = rate, Paid = kg * rate, Party = "Supplier A" };
    static ChickenEntry Dress(decimal raw, decimal meat) => new() { Kind = "dress", Kg = raw, OutputKg = meat };
    static ChickenEntry Sell(decimal kg, decimal rate) => new() { Kind = "sale", Kg = kg, Rate = rate, Paid = kg * rate };
    [Fact] public void DressingLossIsAbsorbedIntoCostNotChargedTwice()
    {
        var d = new ChickenDay { Labor = 300, Rent = 200, ExpectedSalesKg = 50, Entries = new() { Receive(100, 100), Dress(80, 50), Sell(40, 250) } };
        var t = ChickenLedger.Calculate(d);
        Assert.Equal(20, t.RawKg); Assert.Equal(2000, t.RawValue); Assert.Equal(10, t.DressedKg); Assert.Equal(1600, t.DressedValue);
        Assert.Equal(30, t.DressingLossKg); Assert.Equal(6400, t.CostOfSales); Assert.Equal(0, t.WasteCost); Assert.Equal(3100, t.Profit);
        Assert.Equal(170, t.BreakEvenRate); Assert.Equal(213, t.SuggestedRate);
    }
    [Fact] public void VariableSupplierRatesUseMovingWeightedCost()
    {
        var d = new ChickenDay { Entries = new() { Receive(10, 100), Receive(30, 120), Dress(16, 10), Sell(10, 250) } };
        var t = ChickenLedger.Calculate(d);
        Assert.Equal(1840, t.CostOfSales); Assert.Equal(2760, t.RawValue); Assert.Equal(660, t.Profit);
    }
    [Fact] public void ClosingShortageCostsAndCarryForwardReconcile()
    {
        var d = new ChickenDay { Closed = true, CountedRawKg = 18, CountedDressedKg = 8, CloseNote = "Physical shortage", Entries = new() { Receive(100, 100), Dress(80, 50), Sell(40, 250) } };
        var t = ChickenLedger.Calculate(d); Assert.Equal(520, t.WasteCost); Assert.Equal(3080, t.Profit);
        var next = ChickenLedger.Calculate(new ChickenDay { OpeningRawKg = t.RawKg, OpeningRawValue = t.RawValue, OpeningDressedKg = t.DressedKg, OpeningDressedValue = t.DressedValue, Entries = new() { Sell(8, 250) } });
        Assert.Equal(1280, next.CostOfSales); Assert.Equal(720, next.Profit); Assert.Equal(1800, next.RawValue);
    }
    [Fact] public void CreditBalancesCarryAndSettleWithoutExtraRevenue()
    {
        var receipt = Receive(16, 100); receipt.Paid = 500;
        var sale = Sell(10, 250); sale.Paid = 1000; sale.Party = "Customer";
        var first = ChickenLedger.Calculate(new ChickenDay { Entries = new() { receipt, Dress(16, 10), sale } });
        Assert.Equal(1100, first.SupplierDue); Assert.Equal(1500, first.Receivable);
        var next = ChickenLedger.Calculate(new ChickenDay { OpeningBalances = first.Balances, Entries = new() { new() { Kind = "collection", ReferenceId = sale.Id, Amount = 1500 }, new() { Kind = "supplier-payment", ReferenceId = receipt.Id, Amount = 1100 } } });
        Assert.Equal(0, next.Revenue); Assert.Equal(0, next.Profit); Assert.Equal(0, next.SupplierDue); Assert.Equal(0, next.Receivable); Assert.Equal(400, next.CashFlow);
    }
    [Theory] [InlineData("sale")] [InlineData("dress")] [InlineData("raw-waste")] [InlineData("dressed-waste")]
    public void NegativeInventoryIsRejected(string kind)
    { Assert.Throws<ArgumentException>(() => ChickenLedger.Calculate(new ChickenDay { Entries = new() { new() { Kind = kind, Kg = 1, OutputKg = 1, Rate = 100, Paid = 100, Note = "Reason" } } })); }
    [Fact] public void InvalidYieldMarginAndClosingAreRejected()
    {
        Assert.Throws<ArgumentException>(() => ChickenLedger.Calculate(new ChickenDay { RawFactor = .6m }));
        Assert.Throws<ArgumentException>(() => ChickenLedger.Calculate(new ChickenDay { TargetMargin = 100 }));
        Assert.Throws<ArgumentException>(() => ChickenLedger.Calculate(new ChickenDay { Entries = new() { Receive(5, 100), Dress(5, 6) } }));
        Assert.Throws<ArgumentException>(() => ChickenLedger.Calculate(new ChickenDay { Closed = true, CountedRawKg = 1, CountedDressedKg = 0 }));
    }
    [Fact] public void OverpaymentAndDuplicateEntryAreRejected()
    {
        var receipt = Receive(10, 100); receipt.Paid = 1001;
        Assert.Throws<ArgumentException>(() => ChickenLedger.Calculate(new ChickenDay { Entries = new() { receipt } }));
        receipt.Paid = 1000;
        Assert.Throws<ArgumentException>(() => ChickenLedger.Calculate(new ChickenDay { Entries = new() { receipt, receipt } }));
    }
    [Fact] public void EditReceiptRecalculatesLaterSalesAndPreservesIdentity()
    {
        var receipt = Receive(16, 100); receipt.CreatedAt = DateTime.UtcNow; receipt.ActorId = Guid.NewGuid();
        var d = new ChickenDay { Entries = new() { receipt, Dress(16, 10), Sell(10, 250) } };
        var replacement = Receive(16, 120); replacement.Id = receipt.Id;
        var before = ChickenLedger.Edit(d, replacement, "Correct supplier price");
        Assert.Same(receipt, before); Assert.Equal(receipt.CreatedAt, replacement.CreatedAt); Assert.Equal(receipt.ActorId, replacement.ActorId);
        Assert.Equal(1920, ChickenLedger.Calculate(d).CostOfSales); Assert.Equal(580, ChickenLedger.Calculate(d).Profit);
    }
    [Fact] public void InvalidEditRestoresOriginalAndRejectsClosedDay()
    {
        var receipt = Receive(16, 100);
        var d = new ChickenDay { Entries = new() { receipt, Dress(16, 10) } };
        var replacement = Receive(10, 100); replacement.Id = receipt.Id;
        Assert.Throws<ArgumentException>(() => ChickenLedger.Edit(d, replacement, "Wrong weight"));
        Assert.Same(receipt, d.Entries[0]);
        d.Closed = true;
        Assert.Throws<ArgumentException>(() => ChickenLedger.Edit(d, receipt, "Correction"));
    }
    [Fact] public void EditCannotInvalidateLaterCollections()
    {
        var sale = Sell(10, 250); sale.Paid = 0; sale.Party = "Customer";
        var d = new ChickenDay { Entries = new() { Receive(16, 100), Dress(16, 10), sale, new() { Kind = "collection", ReferenceId = sale.Id, Amount = 2400 } } };
        var replacement = Sell(10, 200); replacement.Id = sale.Id; replacement.Paid = 0; replacement.Party = sale.Party;
        Assert.Throws<ArgumentException>(() => ChickenLedger.Edit(d, replacement, "Lower price"));
        Assert.Same(sale, d.Entries[2]);
        Assert.Throws<ArgumentException>(() => ChickenLedger.Edit(d, sale, ""));
    }
    [Fact] public void PrecisionCannotHideSmallStockOrCashDifferences()
    {
        Assert.Throws<ArgumentException>(() => ChickenLedger.Calculate(new ChickenDay { Entries = new() { Receive(1.0001m, 100) } }));
        Assert.Throws<ArgumentException>(() => ChickenLedger.Calculate(new ChickenDay { Rent = 100.001m }));
        var receive = Receive(1, 100); receive.Paid = 99.999m;
        Assert.Throws<ArgumentException>(() => ChickenLedger.Calculate(new ChickenDay { Entries = new() { receive } }));
    }
    [Fact] public void PublicQuoteRequiresSourceDateAndDoesNotConfuseCountryChicken()
    {
        var date = new DateOnly(2026, 9, 14);
        var quote = ChickenMarket.Parse("<td>Chicken Live</td><td>1 Kg</td><td>Rs. 130.00</td> Last updated on 14-Sep-2026.", "Jalandhar", "https://example.com", date);
        Assert.True(quote.Fresh); Assert.Equal(130, quote.Price);
        Assert.False(ChickenMarket.Parse("Chicken Live 1 Kg Rs. 130.00 Last updated on 07-Sep-2026.", "Jalandhar", "", date).Fresh);
        Assert.Null(ChickenMarket.Parse("Country Chicken Live 1 Kg Rs. 250.00 Last updated on 14-Sep-2026.", "Jalandhar", "", date).Price);
        Assert.Null(ChickenMarket.Parse("Chicken Live 1 Kg Rs. 130.00", "Jalandhar", "", date).Price);
        Assert.Null(ChickenMarket.Parse("Chicken Live 1 Kg Rs. 130.00 Last updated on 15-Sep-2026.", "Jalandhar", "", date).Price);
    }
}
