namespace Mahima.Api.v3.clean.Features.ChickenSale;

public sealed record ChickenBalance(Guid Id, string Kind, string Party, decimal Due);

public sealed class ChickenDay
{
    public DateOnly Date { get; set; }
    public int Version { get; set; }
    public string City { get; set; } = "Jalandhar";
    public decimal RawFactor { get; set; } = 1.6m;
    public decimal TargetMargin { get; set; } = 20m;
    public decimal ExpectedSalesKg { get; set; } = 50m;
    public decimal Labor { get; set; }
    public decimal Rent { get; set; }
    public decimal OpeningRawKg { get; set; }
    public decimal OpeningRawValue { get; set; }
    public decimal OpeningDressedKg { get; set; }
    public decimal OpeningDressedValue { get; set; }
    public bool Closed { get; set; }
    public decimal? CountedRawKg { get; set; }
    public decimal? CountedDressedKg { get; set; }
    public string CloseNote { get; set; } = "";
    public List<ChickenBalance> OpeningBalances { get; set; } = new();
    public List<ChickenEntry> Entries { get; set; } = new();
}
public sealed class ChickenEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Kind { get; set; } = "receive";
    public decimal Kg { get; set; }
    public decimal OutputKg { get; set; }
    public decimal Rate { get; set; }
    public decimal Amount { get; set; }
    public decimal Paid { get; set; }
    public string Payment { get; set; } = "cash";
    public string Party { get; set; } = "";
    public string Note { get; set; } = "";
    public Guid? ReferenceId { get; set; }
    public Guid ActorId { get; set; }
    public DateTime CreatedAt { get; set; }
}
public sealed class ChickenTotals
{
    public decimal RawKg { get; set; }
    public decimal RawValue { get; set; }
    public decimal DressedKg { get; set; }
    public decimal DressedValue { get; set; }
    public decimal ReceivedKg { get; set; }
    public decimal Purchases { get; set; }
    public decimal SupplierPaid { get; set; }
    public decimal SoldKg { get; set; }
    public decimal Revenue { get; set; }
    public decimal Collected { get; set; }
    public decimal CostOfSales { get; set; }
    public decimal WasteCost { get; set; }
    public decimal DressingLossKg { get; set; }
    public decimal Expenses { get; set; }
    public decimal RawVarianceKg { get; set; }
    public decimal DressedVarianceKg { get; set; }
    public decimal Profit => Revenue - CostOfSales - WasteCost - Expenses;
    public List<ChickenBalance> Balances { get; set; } = new();
    public decimal Receivable => Balances.Where(b => b.Kind == "sale").Sum(b => b.Due);
    public decimal SupplierDue => Balances.Where(b => b.Kind == "receive").Sum(b => b.Due);
    public decimal CashFlow => Collected - SupplierPaid - Expenses;
    public decimal? BreakEvenRate { get; set; }
    public decimal? SuggestedRate { get; set; }
}
public static class ChickenLedger
{
    static void Require(bool condition, string message) { if (!condition) throw new ArgumentException(message); }
    static decimal Remove(ref decimal kg, ref decimal value, decimal quantity)
    {
        Require(quantity > 0 && quantity <= kg, "Insufficient stock or invalid weight.");
        var cost = value * quantity / kg;
        kg -= quantity; value -= cost;
        return cost;
    }
    public static ChickenEntry Edit(ChickenDay d, ChickenEntry replacement, string reason)
    {
        Require(!d.Closed, "Closed days cannot be edited.");
        Require(!string.IsNullOrWhiteSpace(reason) && reason.Length <= 1000, "Enter an edit reason (up to 1000 characters).");
        var index = d.Entries.FindIndex(e => e.Id == replacement.Id);
        Require(index >= 0, "Record was not found. Refresh the day.");
        var original = d.Entries[index];
        Require(replacement.Kind == original.Kind, "The record type cannot be changed.");
        replacement.ActorId = original.ActorId;
        replacement.CreatedAt = original.CreatedAt;
        d.Entries[index] = replacement;
        try { Calculate(d); }
        catch { d.Entries[index] = original; throw; }
        return original;
    }

    public static ChickenTotals Calculate(ChickenDay d)
    {
        Require(d.RawFactor >= 1 && d.RawFactor <= 5, "Raw-to-dressed factor must be between 1 and 5.");
        Require(d.TargetMargin >= 0 && d.TargetMargin <= 80, "Target margin must be between 0 and 80%.");
        Require(d.ExpectedSalesKg > 0 && d.ExpectedSalesKg <= 100000, "Enter expected sales greater than zero.");
        Require(d.Labor >= 0 && d.Rent >= 0 && d.Labor <= 10000000 && d.Rent <= 10000000, "Daily charges must be non-negative and within limits.");
        Require(d.Labor == decimal.Round(d.Labor, 2) && d.Rent == decimal.Round(d.Rent, 2), "Daily charges allow two decimal places.");
        Require(d.CloseNote.Length <= 1000, "Closing note is too long.");
        Require(!string.IsNullOrWhiteSpace(d.City) && d.City.Length <= 80, "Enter a city (up to 80 characters).");
        var raw = d.OpeningRawKg; var rv = d.OpeningRawValue;
        var meat = d.OpeningDressedKg; var mv = d.OpeningDressedValue;
        var t = new ChickenTotals { Expenses = d.Labor + d.Rent };
        var balances = d.OpeningBalances.ToDictionary(b => b.Id);
        Require(d.Entries.Count <= 10000, "Daily entry limit reached.");
        foreach (var e in d.Entries)
        {
            Require(e.Id != Guid.Empty && e.Kg >= 0 && e.Kg <= 100000 && e.OutputKg >= 0 && e.OutputKg <= 100000 && e.Rate >= 0 && e.Rate <= 100000 && e.Amount >= 0 && e.Amount <= 10000000 && e.Paid >= 0, "Invalid quantity or amount.");
            Require(e.Kg == decimal.Round(e.Kg, 3) && e.OutputKg == decimal.Round(e.OutputKg, 3), "Weights allow three decimal places.");
            Require(e.Rate == decimal.Round(e.Rate, 2) && e.Amount == decimal.Round(e.Amount, 2) && e.Paid == decimal.Round(e.Paid, 2), "Money allows two decimal places.");
            Require(e.Party.Length <= 200 && e.Note.Length <= 1000, "Supplier/customer or note is too long.");
            Require(new[] { "cash", "upi", "card", "bank", "credit" }.Contains(e.Payment), "Invalid payment method.");
            switch (e.Kind)
            {
                case "receive":
                    Require(e.Kg > 0 && e.Rate > 0 && !string.IsNullOrWhiteSpace(e.Party), "Receipt requires supplier, weight and purchase rate.");
                    var purchase = decimal.Round(e.Kg * e.Rate, 2);
                    Require(e.Paid <= purchase, "Supplier payment exceeds receipt value.");
                    balances[e.Id] = new(e.Id, "receive", e.Party, purchase - e.Paid);
                    raw += e.Kg; rv += purchase; t.ReceivedKg += e.Kg; t.Purchases += purchase; t.SupplierPaid += e.Paid;
                    break;
                case "dress":
                    Require(e.OutputKg > 0 && e.OutputKg <= e.Kg, "Dressed output must be positive and cannot exceed raw input.");
                    mv += Remove(ref raw, ref rv, e.Kg); meat += e.OutputKg; t.DressingLossKg += e.Kg - e.OutputKg;
                    break;
                case "sale":
                    Require(e.Rate > 0, "Sale rate must be positive.");
                    var sale = decimal.Round(e.Kg * e.Rate, 2);
                    Require(e.Paid <= sale, "Collection exceeds sale value.");
                    Require(e.Paid == sale || !string.IsNullOrWhiteSpace(e.Party), "Name the customer for a credit sale.");
                    balances[e.Id] = new(e.Id, "sale", e.Party, sale - e.Paid);
                    t.CostOfSales += Remove(ref meat, ref mv, e.Kg); t.SoldKg += e.Kg; t.Revenue += sale; t.Collected += e.Paid;
                    break;
                case "raw-waste": case "raw-exit":
                    Require(!string.IsNullOrWhiteSpace(e.Note), "Enter a reason for stock removal.");
                    t.WasteCost += Remove(ref raw, ref rv, e.Kg); break;
                case "dressed-waste": case "dressed-exit":
                    Require(!string.IsNullOrWhiteSpace(e.Note), "Enter a reason for stock removal.");
                    t.WasteCost += Remove(ref meat, ref mv, e.Kg); break;
                case "collection": case "supplier-payment":
                    Require(e.ReferenceId.HasValue && balances.ContainsKey(e.ReferenceId.Value), "Select an outstanding bill.");
                    var balance = balances[e.ReferenceId!.Value];
                    Require(balance.Kind == (e.Kind == "collection" ? "sale" : "receive") && e.Amount > 0 && e.Amount <= balance.Due, "Payment exceeds the bill balance or references the wrong bill type.");
                    balances[balance.Id] = balance with { Due = balance.Due - e.Amount };
                    if (e.Kind == "collection") t.Collected += e.Amount; else t.SupplierPaid += e.Amount;
                    break;
                case "expense":
                    Require(e.Amount > 0 && !string.IsNullOrWhiteSpace(e.Note), "Enter expense amount and category/reason.");
                    t.Expenses += e.Amount; break;
                default: throw new ArgumentException("Unknown entry type.");
            }
        }
        Require(d.Entries.Select(e => e.Id).Distinct().Count() == d.Entries.Count, "Duplicate entry ID.");
        if (d.Closed)
        {
            Require(d.CountedRawKg.HasValue && d.CountedDressedKg.HasValue, "Record both physical closing weights.");
            Require(d.CountedRawKg >= 0 && d.CountedRawKg <= raw && d.CountedDressedKg >= 0 && d.CountedDressedKg <= meat, "Closing count cannot exceed recorded stock. Record missing receipts/processing first.");
            Require(d.CountedRawKg.Value == decimal.Round(d.CountedRawKg.Value, 3) && d.CountedDressedKg.Value == decimal.Round(d.CountedDressedKg.Value, 3), "Closing weights allow three decimal places.");
            t.RawVarianceKg = raw - d.CountedRawKg!.Value; t.DressedVarianceKg = meat - d.CountedDressedKg!.Value;
            Require((t.RawVarianceKg == 0 && t.DressedVarianceKg == 0) || !string.IsNullOrWhiteSpace(d.CloseNote), "Explain closing stock shortages.");
            if (t.RawVarianceKg > 0) t.WasteCost += Remove(ref raw, ref rv, t.RawVarianceKg);
            if (t.DressedVarianceKg > 0) t.WasteCost += Remove(ref meat, ref mv, t.DressedVarianceKg);
        }
        t.Balances = balances.Values.Where(b => b.Due > 0).ToList();
        t.RawKg = raw; t.RawValue = rv; t.DressedKg = meat; t.DressedValue = mv;
        decimal? unit = raw + meat > 0 ? (rv + mv) / (raw / d.RawFactor + meat) : t.ReceivedKg > 0 ? t.Purchases / t.ReceivedKg * d.RawFactor : null;
        t.BreakEvenRate = unit.HasValue ? decimal.Round(unit.Value + (t.Expenses + t.WasteCost) / d.ExpectedSalesKg, 2) : null;
        t.SuggestedRate = t.BreakEvenRate.HasValue ? decimal.Ceiling(t.BreakEvenRate.Value / (1 - d.TargetMargin / 100)) : null;
        return t;
    }
}
