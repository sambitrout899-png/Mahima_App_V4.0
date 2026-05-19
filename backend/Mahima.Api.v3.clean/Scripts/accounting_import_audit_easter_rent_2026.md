# Accounting PDF Import Audit - FY 2026-27

## Source Files Read

- `acstatement easter day meeting.pdf`
- `acstatement easter day meeting-1.pdf` - duplicate of the first Easter statement
- `acstatement rent account.pdf`
- `bsheet.pdf`
- `bsheet-1.pdf` - duplicate of `bsheet.pdf`

## Extracted Source Totals

| Source | Extracted Account | Debit | Credit | Imported Treatment |
|---|---:|---:|---:|---|
| Easter statement | Easter Day Meeting Expense | 83,800.00 | 0.00 | Dr Easter Day Meeting Expense / Cr Cash in Hand |
| Rent statement | Rent Expense | 13,000.00 | 0.00 | Dr Rent Expense / Cr Cash in Hand |
| Balance sheet | Capital Fund | 50,000.00 | 0.00 | Dr Cash in Hand / Cr Capital Fund |
| Balance sheet | Sambit Raut Unsecured Loan | 58,500.00 | 0.00 | Dr Cash in Hand / Cr Sambit Raut Unsecured Loan |
| Balance sheet | Cash in Hand | 21,785.00 | 0.00 | Validation target |
| Balance sheet | Loss as per P&L | 86,715.00 | 0.00 | Validation target |

## Reconciliation

Expense statements total:

- Easter expense: 83,800.00
- Rent expense: 13,000.00
- Total expenses: 96,800.00

Balance sheet reports loss as per P&L:

- Loss: 86,715.00

Therefore, the imported books need income/receipts of:

- 96,800.00 - 86,715.00 = 10,085.00

Because the source PDFs do not include the detailed receipt account statement, the import posts this as:

- Dr Cash in Hand 10,085.00
- Cr Unidentified Receipts / Donations 10,085.00

The journal narration clearly marks it as inferred from balance sheet reconciliation.

## Expected Post-Import Position

| Item | Amount |
|---|---:|
| Capital Fund | 50,000.00 Cr |
| Sambit Raut Unsecured Loan | 58,500.00 Cr |
| Easter Day Meeting Expense | 83,800.00 Dr |
| Rent Expense | 13,000.00 Dr |
| Unidentified Receipts / Donations | 10,085.00 Cr |
| Net Loss | 86,715.00 |
| Cash in Hand | 21,785.00 Dr |

## Run Script

Run this on the production server after taking a backup:

```bash
cd /root/Mahima_App_V4.0/backend/Mahima.Api.v3.clean
sudo -u postgres psql mahima_db_3_0 -f Scripts/accounting_reset_import_easter_rent_2026.sql
```

If the production database name is different, replace `mahima_db_3_0` with the actual database used by `mahima-api`.
