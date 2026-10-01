# Fin_12_09_1.pdf versus live cost module

Prepared 12 September 2026. **Review draft only. Nothing has been imported or changed in the system.**

The attached CSV is a conditional adjustment proposal. It reconciles daily net movements and closing balances to the PDF. It is not a voucher-for-voucher replacement and does not make gross debit/credit turnover, journal count, narration or voucher IDs identical. Do not import until the scope and source questions below are resolved.

## Scope and evidence

- Source: Fin_12_09_1.pdf, all 8 pages. Printed financial-year header: 01-Apr-2026 to 31-Mar-2027. Actual transaction dates: 01-Apr-2026 to 29-Aug-2026. No September transactions are supplied.
- Working cutoff: 31-Aug-2026, inferred from the August statement content. The PDF does not explicitly certify completeness through that date.
- Live authenticated Mahima cost module inspected on 12-Sep-2026. All 48 account ledgers and 682 rows from 01-Jan-1900 through 31-Aug-2026 were read; 510 rows fall in April-August. All 48 account IDs were read from the journal form without saving.
- Live captured gross debits and credits both equal INR 3,976,806.35. The six independently captured month-end control vectors balance exactly, and the daily extraction reproduces all six.
- PDF: 198 printed transaction rows, 128 reconstructed vouchers, 18 printed ledgers. Every printed running balance, debit total, credit total and closing balance was recalculated. All pass. Both sides of a voucher were paired once, not imported twice.
- 190 of 198 PDF rows have an available live match by account/date/signed amount after allocating occurrences. Eight do not. This is a financial-signature match, not proof of voucher identity: journal IDs are not exposed in the ledger UI. Repeated live signatures are separately flagged below.
- The application reported a journal export, but the browser did not produce a retrievable download. The audit therefore uses the visible ledger data, not a claimed journal-ID export.

## Major differences

Period measures below use April-August activity, excluding prior-year expense balances. INR.

| Measure | Live system | PDF-derived | Live minus PDF |
|---|---:|---:|---:|
| Income | 60,094.01 | 25,854.00 | 34,240.01 |
| Expenses | 1,137,859.64 | 421,475.60 | 716,384.04 |
| Net loss | 1,077,765.63 | 395,621.60 | 682,144.03 |

1. **Fixed assets are doubled by opening imports.** Building 650,000 versus 325,000; furniture 153,976 versus 76,988; music system 160,000 versus 80,000; tent/crockery 70,000 versus 35,000. Combined excess: 516,988. The ledger retains the 2025 purchases and adds the same brought-forward balances again on 01-Apr-2026.
2. **Payroll contains both imported salary payments and payroll-run entries.** April-August payroll expense is 865,208.64 versus PDF salary expense of 227,566.60, a difference of 637,642.04. The all-time payroll account balance is 1,174,108.64 because it also includes 308,900 of prior-year expense. Payroll payable is 360,577.74 Cr versus 7,500 Cr. These differences require payroll-basis review, not a blanket conclusion that every unmatched payroll is erroneous.
3. **August month-end payroll is absent from this PDF.** Seven payroll runs dated 31-Aug produce 89,685.41 expense, 44,929.00 generic-bank payments, and 44,756.41 additional payable. A separate 0.30 rounding adjustment is also present. PDF salary payments end on 14-Aug and mostly describe July or older salary. The draft reverses the net effect of unmatched payroll to achieve PDF agreement; if these are valid later records they must be retained and the PDF updated instead.
4. **Rent contains repeated imports and prior-year carry-forward.** April-August rent is 117,000 versus PDF 65,000, an excess of 52,000. The all-time closing rent account is 169,000 because it includes 52,000 of prior-year expense. The 12-Aug rent payment appears three times at 13,000.
5. **HDFC and generic-bank accounts overlap.** HDFC is 5,475.60 Cr instead of PDF 326.40 Dr, a signed difference of 5,802.00. Generic Bank separately holds 195,262.30 Cr. Several July/August payments and receipts have two or three imported copies; August also contains a 74,200 HDFC reclassification.
6. **Easter expense already totals 83,800 correctly, but its funding and one date differ.** All 83,800 was credited to legacy Cash in Hand. The PDF credits Sambit Raut for 10,000 on 01-Apr and 3,500 plus 32,000 on 06-Apr (45,500 total), leaving 38,300 cash-funded. The 660 vegetable purchase is dated 05-Apr in the system but 01-Apr in the PDF. Do not add another 83,800 expense.
7. **Sambit Raut closing balance is 1,143,942 Cr versus PDF 743,942 Cr**, a 400,000 excess in the mapped account. A separate legacy loan liability of 71,500 is also present. The PDF explicitly records 35,000 cash funding plus the 45,500 direct Easter payments; those four credit-side rows have no matching live financial signature.
8. **Golak and other income contain duplicates and classification differences.** Golak April-August net income is 39,343 versus PDF 23,003, a difference of 16,340. The 23-Aug cash offering of 590 appears three times. The PDF debit reversal of 2,460 is absent. The 27-May 100 donation is in RAJWINDER KAUR in the system but DONATION BY BANK in the PDF.
9. **The 29-Aug meeting expense of 290 is missing.** The system instead has a separate 7,500 donation on that date, which the PDF does not include. Absence from this PDF does not independently prove that donation invalid.
10. **Opening and legacy balances are not comparable without restatement.** Capital Fund is 767,958 Cr versus PDF 150,958 Cr. Prior-year income/expense accounts remain open in the live balance display. The draft explicitly restates 31-Mar-2026 closing balances; this changes prior-year reported totals and must be reviewed.

## Source ambiguities and decisions required

- Confirm whether the PDF is the complete, authoritative replacement through 31-Aug, or whether unmatched real payroll/payments/donations should remain. This changes the correction amounts materially.
- Cash ledger is absent. Inferred opening cash is 13,720, the residual required to balance the printed opening accounts. With 58 inferred cash counterparts, closing cash is 702. No negative end-of-day cash balance arises under this reconstruction. These are conditional derived amounts, not a printed cash confirmation.
- 23-Aug C-3 in Golak says CASH RECVD but debits donation 2,460. The draft preserves the printed direction, implying a cash outflow/donation reversal. Confirm the intended entry with the statement preparer.
- 09-Jul printing of 4,988 is J-1 in Printing & Sty and J-2 in Soma. It is paired once by date and exact amount. Both references remain in the source schedule.
- Two 27-May HDFC receipts of 100 (J-1 and J-2) are distinct in the PDF: one credits SOMA and one credits DONATION BY BANK. Likewise the two 16-Aug donations of 100 are distinct. They must not be collapsed merely because amount/date match.
- The one-paisa GROSS PROFIT / CLOSING STOCK entry in the system is absent from the new PDF and is removed by the draft; no rounding amount has been invented.
- The draft preserves all original journals and all post-August postings. Therefore gross ledger debit/credit totals and voucher lists remain different from the PDF even when daily net movements and closing balances agree. If exact voucher/gross-turnover replacement is required, obtain a retrievable current journal export with EntryIds and prepare an explicit update/delete migration instead.

## Account comparison at 31 August

Balances are signed by Dr/Cr. All-time live balances include prior-year carry-forward. For PDF-absent accounts, zero is a **draft supersession assumption**, not proof that their balances are invalid.

| ID | Live account / PDF account | Live closing | PDF/draft target | Signed adjustment (Dr positive) | Basis |
|---|---|---:|---:|---:|---|
| 1 | Cash in Hand | 11,700.00 Dr | 0.00  | -11,700.00 | PDF absent; assumed zero |
| 2 | Capital Fund / CAPITAL FUND | 767,958.00 Cr | 150,958.00 Cr | 617,000.00 | PDF printed |
| 3 | Sambit Raut Unsecured Loan | 71,500.00 Cr | 0.00  | 71,500.00 | PDF absent; assumed zero |
| 4 | Easter Day Meeting Expense / EASTER DAY MEETING EXPS | 83,800.00 Dr | 83,800.00 Dr | 0.00 | PDF printed |
| 5 | Rent Expense / RENT | 169,000.00 Dr | 65,000.00 Dr | -104,000.00 | PDF printed |
| 6 | Unidentified Receipts / Donations | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 7 | Cash / CASH IN HAND | 27,451.00 Dr | 702.00 Dr | -26,749.00 | Cash inferred |
| 8 | Bank | 195,262.30 Cr | 0.00  | 195,262.30 | PDF absent; assumed zero |
| 9 | Accounts Receivable | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 10 | Advances and Deposits | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 11 | Fixed Assets | 4,400.00 Dr | 0.00  | -4,400.00 | PDF absent; assumed zero |
| 12 | Accounts Payable | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 13 | Payroll Payable / SALARY PAYABLE | 360,577.74 Cr | 7,500.00 Cr | 353,077.74 | PDF printed |
| 14 | Statutory Dues Payable | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 15 | Loans Payable | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 16 | Opening Balance Equity | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 17 | General Fund / Corpus Fund | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 18 | Retained Surplus | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 19 | Tithes and Offerings | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 20 | Donations | 35,731.00 Cr | 0.00  | 35,731.00 | PDF absent; assumed zero |
| 21 | Grants | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 22 | Event Income | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 23 | Other Income | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 24 | Payroll Expense / SALARY A/C | 1,174,108.64 Dr | 227,566.60 Dr | -946,542.04 | PDF printed |
| 25 | Utilities Expense | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 26 | Ministry Events Expense / MEETING EXPS | 143,463.00 Dr | 40,121.00 Dr | -103,342.00 | PDF printed |
| 27 | Outreach Expense | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 28 | Travel Expense | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 29 | Office and Administration Expense / PRINTING & STY | 5,258.00 Dr | 4,988.00 Dr | -270.00 | PDF printed |
| 30 | Bank Charges | 0.00  | 0.00  | 0.00 | Zero; no net change |
| 31 | SISTER SOMA | 4,400.00 Cr | 0.00  | 4,400.00 | PDF absent; assumed zero |
| 32 | Repairs and Maintenance Expense | 1,770.00 Dr | 0.00  | -1,770.00 | PDF absent; assumed zero |
| 33 | Miscellaneous Expense | 920.00 Dr | 0.00  | -920.00 | PDF absent; assumed zero |
| 34 | Depreciation Expense | 262.00 Dr | 0.00  | -262.00 | PDF absent; assumed zero |
| 35 | M/S SAMBIT RAUT / SAMBIT RAUT | 1,143,942.00 Cr | 743,942.00 Cr | 400,000.00 | PDF printed |
| 41 | BUILDING A/C | 650,000.00 Dr | 325,000.00 Dr | -325,000.00 | PDF printed |
| 42 | FURNITURE | 153,976.00 Dr | 76,988.00 Dr | -76,988.00 | PDF printed |
| 43 | GOLAK DONATION | 57,173.00 Cr | 23,003.00 Cr | 34,170.00 | PDF printed |
| 44 | MUSIC SYSTEM | 160,000.00 Dr | 80,000.00 Dr | -80,000.00 | PDF printed |
| 45 | TENT & CORCKERY | 70,000.00 Dr | 35,000.00 Dr | -35,000.00 | PDF printed |
| 46 | RAJWINDER KAUR | 100.00 Cr | 0.00  | 100.00 | PDF absent; assumed zero |
| 47 | HDFC BANK A/C NO 50100882772080 | 5,475.60 Cr | 326.40 Dr | 5,802.00 | PDF printed |
| 48 | SOMA | 5,088.00 Cr | 5,088.00 Cr | 0.00 | PDF printed |
| 49 | BANK INTEREST | 51.00 Cr | 51.00 Cr | 0.00 | PDF printed |
| 50 | EXPS PAYABLE | 6,150.00 Cr | 6,150.00 Cr | 0.00 | PDF printed |
| 51 | DONATION BY BANK | 2,700.00 Cr | 2,800.00 Cr | -100.00 | PDF printed |
| 52 | GROSS PROFIT | 0.01 Cr | 0.00  | 0.01 | PDF absent; assumed zero |
| 53 | CLOSING STOCK | 0.01 Dr | 0.00  | -0.01 | PDF absent; assumed zero |

## Eight PDF rows without a live account/date/amount match

| PDF page | Date | Voucher | PDF account | Debit | Credit | Finding |
|---:|---|---|---|---:|---:|---|
| 1 | 2026-05-27 | J-2 | DONATION BY BANK | 0.00 | 100.00 | 100 is classified to RAJWINDER KAUR in live books |
| 1 | 2026-04-01 | C-5 | EASTER DAY MEETING EXPS | 660.00 | 0.00 | 660 exists on 05-Apr instead of 01-Apr |
| 2 | 2026-08-23 | C-3 | GOLAK DONATION | 2,460.00 | 0.00 | Printed donation reversal is absent |
| 5 | 2026-08-29 | C-1 | MEETING EXPS | 290.00 | 0.00 | Meeting expense missing |
| 7 | 2026-04-01 | C-4 | SAMBIT RAUT | 0.00 | 35,000.00 | Cash funding credit to Sambit absent |
| 7 | 2026-04-01 | J-2 | SAMBIT RAUT | 0.00 | 10,000.00 | Direct Easter funding credited to legacy cash instead |
| 7 | 2026-04-06 | J-2 | SAMBIT RAUT | 0.00 | 3,500.00 | Direct Easter funding credited to legacy cash instead |
| 7 | 2026-04-06 | J-3 | SAMBIT RAUT | 0.00 | 32,000.00 | Direct Easter funding credited to legacy cash instead |

## What changed from the previous supplied ledger

The previous saved source schedule is not used as the current system baseline. Comparing it with this new PDF shows 16 added vouchers (15 Easter expense vouchers plus the 35,000 funding receipt) and one reclassification of the 27-May 100 donation. Opening balances are unchanged.
Easter expense rises by 83,800, Sambit credit rises by 80,500, and inferred cash falls by 3,300 (4,002 to 702). Donation by Bank rises by 100 while Rajwinder income falls by 100. Total income stays 25,854; loss rises from 311,821.60 to 395,621.60. The old reconciliation proposal must not be reused unchanged.

## Import file and verification

- File: `Fin_12_09_corrections_REVIEW_ONLY.csv`. 110 insert-only adjustment vouchers. No deletes or updates. Each description carries a unique FIN1209-V1 reference.
- Account 16 (Opening Balance Equity) is a temporary same-day clearing account for each named account adjustment. Its net movement is exactly zero on every correction date. The amounts come from PDF daily net movement minus observed live daily net movement; no balancing plug is used.
- 13 adjustments restate the opening at 31-Mar-2026. Remaining corrections are dated on the affected April-August days. Earlier original journals remain, but 31-Mar closing and prior-year P&L change. No correction is dated after 31-Aug.
- Validation: CSV round-trip, exact eight-column schema, valid existing account IDs, positive amounts, two-decimal precision, debit=credit for every row, valid dates, and description length limits.
- Independent simulation: all 48 accounts agree with the reconstructed source on all 153 calendar-day closes from 01-Apr to 31-Aug, plus opening. All five month-end closes and the final trial balance agree to the paisa. This proves the stated net-balance result under the source assumptions; it does not validate omitted real-world transactions.
- Before any import, compare the current ledger to the saved baseline controls. The system changed since the earlier snapshot: generic Bank decreased by 38,929, payroll expense increased by 370.37, and payroll payable decreased by 38,558.63. This CSV was built from the refreshed values.
- Import only once after the source decisions are resolved. Blank EntryId inserts are not idempotent, even in Upsert mode. The importer may skip invalid rows while saving valid ones; require zero skipped/errors and the exact planned insert count. Do not retry the whole file after a partial load. The app creates a pre-import snapshot.
- Accounting corrections do not modify payroll module run/payment statuses. Posting a restatement while payroll remains authoritative can cause future reconciliation drift. Resolve that basis first.

## Monthly result controls

| Month | Live income | PDF income | Live expense | PDF expense | PDF net loss |
|---|---:|---:|---:|---:|---:|
| 2026-04 | 6,535.00 | 6,535.00 | 203,089.20 | 101,350.00 | 94,815.00 |
| 2026-05 | 4,820.00 | 4,820.00 | 202,867.94 | 95,303.00 | 90,483.00 |
| 2026-06 | 9,448.00 | 4,448.00 | 179,959.98 | 50,482.00 | 46,034.00 |
| 2026-07 | 5,691.00 | 3,811.00 | 244,236.81 | 74,643.60 | 70,832.60 |
| 2026-08 | 33,600.01 | 6,240.00 | 307,705.71 | 99,697.00 | 93,457.00 |

## PDF row audit (all 198 printed transactions)

Live copies count the same account/date/signed amount; Expected copies counts that signature in the PDF. Counts can include legitimate same-value entries, so a repeated signature alone is not definitive proof of a duplicate. Narrative examples above provide supporting evidence. Missing status is allocated by occurrence.

| Page | Date | Voucher | PDF account | Debit | Credit | Live copies | Expected copies | Check |
|---:|---|---|---|---:|---:|---:|---:|---|
| 1 | 2026-07-01 | J-1 | BANK INTEREST | 0.00 | 51.00 | 1 | 1 | Amount/date match |
| 1 | 2026-05-27 | J-2 | DONATION BY BANK | 0.00 | 100.00 | 0 | 1 | No allocated match |
| 1 | 2026-08-11 | J-5 | DONATION BY BANK | 0.00 | 500.00 | 1 | 1 | Amount/date match |
| 1 | 2026-08-12 | J-3 | DONATION BY BANK | 0.00 | 2,000.00 | 1 | 1 | Amount/date match |
| 1 | 2026-08-16 | J-1 | DONATION BY BANK | 0.00 | 100.00 | 2 | 2 | Amount/date match |
| 1 | 2026-08-16 | J-2 | DONATION BY BANK | 0.00 | 100.00 | 2 | 2 | Amount/date match |
| 1 | 2026-04-01 | C-5 | EASTER DAY MEETING EXPS | 660.00 | 0.00 | 0 | 1 | No allocated match |
| 1 | 2026-04-01 | J-2 | EASTER DAY MEETING EXPS | 10,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-03 | C-1 | EASTER DAY MEETING EXPS | 1,650.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-03 | C-2 | EASTER DAY MEETING EXPS | 1,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-04 | C-2 | EASTER DAY MEETING EXPS | 2,790.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-05 | C-2 | EASTER DAY MEETING EXPS | 1,325.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-05 | C-3 | EASTER DAY MEETING EXPS | 3,485.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-05 | C-4 | EASTER DAY MEETING EXPS | 1,450.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-05 | C-5 | EASTER DAY MEETING EXPS | 9,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-05 | C-6 | EASTER DAY MEETING EXPS | 2,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-05 | C-7 | EASTER DAY MEETING EXPS | 500.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-06 | C-1 | EASTER DAY MEETING EXPS | 4,445.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-06 | J-2 | EASTER DAY MEETING EXPS | 3,500.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-06 | J-3 | EASTER DAY MEETING EXPS | 32,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 1 | 2026-04-16 | C-1 | EASTER DAY MEETING EXPS | 9,995.00 | 0.00 | 1 | 1 | Amount/date match |
| 2 | 2026-04-05 | C-1 | GOLAK DONATION | 0.00 | 3,760.00 | 1 | 1 | Amount/date match |
| 2 | 2026-04-11 | C-1 | GOLAK DONATION | 0.00 | 700.00 | 1 | 1 | Amount/date match |
| 2 | 2026-04-18 | C-1 | GOLAK DONATION | 0.00 | 910.00 | 1 | 1 | Amount/date match |
| 2 | 2026-04-25 | C-1 | GOLAK DONATION | 0.00 | 1,165.00 | 1 | 1 | Amount/date match |
| 2 | 2026-05-02 | C-1 | GOLAK DONATION | 0.00 | 1,000.00 | 1 | 1 | Amount/date match |
| 2 | 2026-05-10 | C-4 | GOLAK DONATION | 0.00 | 1,900.00 | 1 | 1 | Amount/date match |
| 2 | 2026-05-16 | C-2 | GOLAK DONATION | 0.00 | 650.00 | 1 | 1 | Amount/date match |
| 2 | 2026-05-23 | C-3 | GOLAK DONATION | 0.00 | 330.00 | 1 | 1 | Amount/date match |
| 2 | 2026-05-30 | C-1 | GOLAK DONATION | 0.00 | 840.00 | 1 | 1 | Amount/date match |
| 2 | 2026-06-06 | C-1 | GOLAK DONATION | 0.00 | 1,021.00 | 1 | 1 | Amount/date match |
| 2 | 2026-06-13 | C-6 | GOLAK DONATION | 0.00 | 2,087.00 | 1 | 1 | Amount/date match |
| 2 | 2026-06-20 | C-1 | GOLAK DONATION | 0.00 | 320.00 | 1 | 1 | Amount/date match |
| 2 | 2026-06-27 | C-2 | GOLAK DONATION | 0.00 | 1,020.00 | 1 | 1 | Amount/date match |
| 2 | 2026-07-04 | C-2 | GOLAK DONATION | 0.00 | 780.00 | 1 | 1 | Amount/date match |
| 2 | 2026-07-12 | C-2 | GOLAK DONATION | 0.00 | 1,000.00 | 1 | 1 | Amount/date match |
| 2 | 2026-07-19 | C-2 | GOLAK DONATION | 0.00 | 1,040.00 | 1 | 1 | Amount/date match |
| 2 | 2026-07-25 | C-2 | GOLAK DONATION | 0.00 | 940.00 | 3 | 1 | Extra live copies |
| 2 | 2026-08-02 | C-2 | GOLAK DONATION | 0.00 | 310.00 | 3 | 1 | Extra live copies |
| 2 | 2026-08-09 | C-2 | GOLAK DONATION | 0.00 | 4,420.00 | 3 | 1 | Extra live copies |
| 2 | 2026-08-16 | C-4 | GOLAK DONATION | 0.00 | 680.00 | 3 | 1 | Extra live copies |
| 2 | 2026-08-23 | C-2 | GOLAK DONATION | 0.00 | 590.00 | 3 | 1 | Extra live copies |
| 2 | 2026-08-23 | C-3 | GOLAK DONATION | 2,460.00 | 0.00 | 0 | 1 | No allocated match |
| 2 | 2026-05-16 | J-1 | HDFC BANK A/C NO 50100882772080 | 50,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 2 | 2026-05-23 | J-2 | HDFC BANK A/C NO 50100882772080 | 1.00 | 0.00 | 1 | 1 | Amount/date match |
| 2 | 2026-05-27 | J-1 | HDFC BANK A/C NO 50100882772080 | 100.00 | 0.00 | 2 | 2 | Amount/date match |
| 3 | 2026-05-27 | J-2 | HDFC BANK A/C NO 50100882772080 | 100.00 | 0.00 | 2 | 2 | Amount/date match |
| 3 | 2026-05-27 | J-3 | HDFC BANK A/C NO 50100882772080 | 0.00 | 7,000.00 | 1 | 1 | Amount/date match |
| 3 | 2026-05-27 | J-4 | HDFC BANK A/C NO 50100882772080 | 0.00 | 5,564.00 | 1 | 1 | Amount/date match |
| 3 | 2026-05-27 | J-5 | HDFC BANK A/C NO 50100882772080 | 0.00 | 12,000.00 | 1 | 1 | Amount/date match |
| 3 | 2026-05-27 | J-6 | HDFC BANK A/C NO 50100882772080 | 0.00 | 20,000.00 | 1 | 1 | Amount/date match |
| 3 | 2026-06-13 | J-1 | HDFC BANK A/C NO 50100882772080 | 1.00 | 0.00 | 1 | 1 | Amount/date match |
| 3 | 2026-06-13 | J-2 | HDFC BANK A/C NO 50100882772080 | 25,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 3 | 2026-06-13 | J-3 | HDFC BANK A/C NO 50100882772080 | 0.00 | 8,832.00 | 1 | 1 | Amount/date match |
| 3 | 2026-06-13 | J-4 | HDFC BANK A/C NO 50100882772080 | 0.00 | 13,000.00 | 1 | 1 | Amount/date match |
| 3 | 2026-06-13 | J-5 | HDFC BANK A/C NO 50100882772080 | 0.00 | 4,800.00 | 1 | 1 | Amount/date match |
| 3 | 2026-06-19 | J-1 | HDFC BANK A/C NO 50100882772080 | 5,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 3 | 2026-06-19 | J-2 | HDFC BANK A/C NO 50100882772080 | 0.00 | 7,000.00 | 1 | 1 | Amount/date match |
| 3 | 2026-06-26 | J-1 | HDFC BANK A/C NO 50100882772080 | 1.00 | 0.00 | 1 | 1 | Amount/date match |
| 3 | 2026-07-01 | J-1 | HDFC BANK A/C NO 50100882772080 | 51.00 | 0.00 | 1 | 1 | Amount/date match |
| 3 | 2026-07-11 | J-1 | HDFC BANK A/C NO 50100882772080 | 30,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 3 | 2026-07-11 | J-2 | HDFC BANK A/C NO 50100882772080 | 0.00 | 9,600.00 | 1 | 1 | Amount/date match |
| 3 | 2026-07-11 | J-3 | HDFC BANK A/C NO 50100882772080 | 0.00 | 13,000.00 | 1 | 1 | Amount/date match |
| 3 | 2026-07-11 | J-4 | HDFC BANK A/C NO 50100882772080 | 0.00 | 4,230.60 | 1 | 1 | Amount/date match |
| 3 | 2026-07-11 | J-5 | HDFC BANK A/C NO 50100882772080 | 0.00 | 7,000.00 | 1 | 1 | Amount/date match |
| 3 | 2026-07-11 | J-6 | HDFC BANK A/C NO 50100882772080 | 5,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 3 | 2026-07-16 | J-1 | HDFC BANK A/C NO 50100882772080 | 2,000.00 | 0.00 | 3 | 1 | Extra live copies |
| 3 | 2026-07-16 | J-2 | HDFC BANK A/C NO 50100882772080 | 0.00 | 4,300.00 | 3 | 1 | Extra live copies |
| 3 | 2026-08-01 | J-1 | HDFC BANK A/C NO 50100882772080 | 0.00 | 1.00 | 3 | 1 | Extra live copies |
| 3 | 2026-08-05 | J-1 | HDFC BANK A/C NO 50100882772080 | 0.00 | 900.00 | 3 | 1 | Extra live copies |
| 3 | 2026-08-11 | J-1 | HDFC BANK A/C NO 50100882772080 | 50,000.00 | 0.00 | 3 | 1 | Extra live copies |
| 3 | 2026-08-11 | J-2 | HDFC BANK A/C NO 50100882772080 | 0.00 | 9,200.00 | 2 | 1 | Extra live copies |
| 3 | 2026-08-11 | J-3 | HDFC BANK A/C NO 50100882772080 | 0.00 | 10,000.00 | 2 | 1 | Extra live copies |
| 3 | 2026-08-11 | J-4 | HDFC BANK A/C NO 50100882772080 | 0.00 | 5,000.00 | 2 | 1 | Extra live copies |
| 3 | 2026-08-11 | J-5 | HDFC BANK A/C NO 50100882772080 | 500.00 | 0.00 | 3 | 1 | Extra live copies |
| 3 | 2026-08-12 | J-1 | HDFC BANK A/C NO 50100882772080 | 0.00 | 1,300.00 | 3 | 1 | Extra live copies |
| 3 | 2026-08-12 | J-2 | HDFC BANK A/C NO 50100882772080 | 0.00 | 20,000.00 | 2 | 1 | Extra live copies |
| 3 | 2026-08-12 | J-3 | HDFC BANK A/C NO 50100882772080 | 2,000.00 | 0.00 | 3 | 1 | Extra live copies |
| 3 | 2026-08-12 | J-4 | HDFC BANK A/C NO 50100882772080 | 40,000.00 | 0.00 | 3 | 1 | Extra live copies |
| 3 | 2026-08-12 | J-5 | HDFC BANK A/C NO 50100882772080 | 0.00 | 13,000.00 | 5 | 2 | Extra live copies |
| 4 | 2026-08-12 | J-6 | HDFC BANK A/C NO 50100882772080 | 0.00 | 7,000.00 | 2 | 1 | Extra live copies |
| 4 | 2026-08-12 | J-7 | HDFC BANK A/C NO 50100882772080 | 0.00 | 900.00 | 3 | 1 | Extra live copies |
| 4 | 2026-08-12 | J-8 | HDFC BANK A/C NO 50100882772080 | 0.00 | 13,000.00 | 5 | 2 | Extra live copies |
| 4 | 2026-08-13 | J-1 | HDFC BANK A/C NO 50100882772080 | 0.00 | 3,000.00 | 2 | 1 | Extra live copies |
| 4 | 2026-08-13 | J-2 | HDFC BANK A/C NO 50100882772080 | 0.00 | 7,000.00 | 2 | 1 | Extra live copies |
| 4 | 2026-08-14 | J-1 | HDFC BANK A/C NO 50100882772080 | 3,000.00 | 0.00 | 3 | 1 | Extra live copies |
| 4 | 2026-08-14 | J-2 | HDFC BANK A/C NO 50100882772080 | 0.00 | 6,000.00 | 3 | 1 | Extra live copies |
| 4 | 2026-08-16 | J-1 | HDFC BANK A/C NO 50100882772080 | 100.00 | 0.00 | 6 | 2 | Extra live copies |
| 4 | 2026-08-16 | J-2 | HDFC BANK A/C NO 50100882772080 | 100.00 | 0.00 | 6 | 2 | Extra live copies |
| 4 | 2026-04-04 | C-1 | MEETING EXPS | 900.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-04-11 | C-2 | MEETING EXPS | 1,050.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-04-18 | C-2 | MEETING EXPS | 1,250.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-04-25 | C-2 | MEETING EXPS | 1,350.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-05-02 | C-2 | MEETING EXPS | 500.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-05-09 | C-1 | MEETING EXPS | 3,050.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-05-16 | C-3 | MEETING EXPS | 700.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-05-23 | C-4 | MEETING EXPS | 1,060.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-05-30 | C-2 | MEETING EXPS | 790.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-06-06 | C-2 | MEETING EXPS | 920.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-06-13 | C-7 | MEETING EXPS | 1,100.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-06-20 | C-2 | MEETING EXPS | 680.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-06-27 | C-1 | MEETING EXPS | 1,150.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-07-04 | C-1 | MEETING EXPS | 1,050.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-07-11 | C-7 | MEETING EXPS | 9,050.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-07-12 | C-1 | MEETING EXPS | 2,100.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-07-16 | J-2 | MEETING EXPS | 4,300.00 | 0.00 | 3 | 1 | Extra live copies |
| 4 | 2026-07-19 | C-1 | MEETING EXPS | 1,215.00 | 0.00 | 1 | 1 | Amount/date match |
| 4 | 2026-07-25 | C-1 | MEETING EXPS | 1,410.00 | 0.00 | 3 | 1 | Extra live copies |
| 4 | 2026-08-02 | C-1 | MEETING EXPS | 600.00 | 0.00 | 3 | 1 | Extra live copies |
| 4 | 2026-08-05 | J-1 | MEETING EXPS | 900.00 | 0.00 | 3 | 1 | Extra live copies |
| 4 | 2026-08-09 | C-1 | MEETING EXPS | 930.00 | 0.00 | 3 | 1 | Extra live copies |
| 4 | 2026-08-12 | J-1 | MEETING EXPS | 1,300.00 | 0.00 | 3 | 1 | Extra live copies |
| 4 | 2026-08-12 | J-7 | MEETING EXPS | 900.00 | 0.00 | 3 | 1 | Extra live copies |
| 4 | 2026-08-16 | C-3 | MEETING EXPS | 1,286.00 | 0.00 | 3 | 1 | Extra live copies |
| 4 | 2026-08-23 | C-1 | MEETING EXPS | 290.00 | 0.00 | 3 | 1 | Extra live copies |
| 5 | 2026-08-29 | C-1 | MEETING EXPS | 290.00 | 0.00 | 0 | 1 | No allocated match |
| 5 | 2026-07-09 | J-1 | PRINTING & STY | 4,988.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-04-15 | J-1 | RENT | 13,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-05-13 | J-3 | RENT | 13,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-06-14 | J-1 | RENT | 13,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-07-15 | J-1 | RENT | 13,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-08-12 | J-5 | RENT | 13,000.00 | 0.00 | 3 | 1 | Extra live copies |
| 5 | 2026-05-10 | J-1 | SALARY A/C | 8,832.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-05-10 | J-2 | SALARY A/C | 9,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-05-10 | J-3 | SALARY A/C | 4,807.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-05-13 | J-1 | SALARY A/C | 7,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-05-13 | J-2 | SALARY A/C | 2,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-05-27 | J-3 | SALARY A/C | 7,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-05-27 | J-4 | SALARY A/C | 5,564.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-05-27 | J-5 | SALARY A/C | 12,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-05-27 | J-6 | SALARY A/C | 20,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-06-13 | J-3 | SALARY A/C | 8,832.00 | 0.00 | 1 | 1 | Amount/date match |
| 5 | 2026-06-13 | J-4 | SALARY A/C | 13,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-06-13 | J-5 | SALARY A/C | 4,800.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-06-19 | J-2 | SALARY A/C | 7,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-07-10 | J-1 | SALARY A/C | 2,700.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-07-11 | J-2 | SALARY A/C | 9,600.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-07-11 | J-3 | SALARY A/C | 13,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-07-11 | J-4 | SALARY A/C | 4,230.60 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-07-11 | J-5 | SALARY A/C | 7,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-07-15 | J-2 | SALARY A/C | 1,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-08-01 | J-1 | SALARY A/C | 1.00 | 0.00 | 2 | 1 | Extra live copies |
| 6 | 2026-08-11 | J-2 | SALARY A/C | 9,200.00 | 0.00 | 2 | 1 | Extra live copies |
| 6 | 2026-08-11 | J-3 | SALARY A/C | 10,000.00 | 0.00 | 2 | 1 | Extra live copies |
| 6 | 2026-08-11 | J-4 | SALARY A/C | 5,000.00 | 0.00 | 2 | 1 | Extra live copies |
| 6 | 2026-08-12 | J-2 | SALARY A/C | 20,000.00 | 0.00 | 2 | 1 | Extra live copies |
| 6 | 2026-08-12 | J-6 | SALARY A/C | 7,000.00 | 0.00 | 2 | 1 | Extra live copies |
| 6 | 2026-08-12 | J-8 | SALARY A/C | 13,000.00 | 0.00 | 2 | 1 | Extra live copies |
| 6 | 2026-08-13 | J-1 | SALARY A/C | 3,000.00 | 0.00 | 2 | 1 | Extra live copies |
| 6 | 2026-08-13 | J-2 | SALARY A/C | 7,000.00 | 0.00 | 2 | 1 | Extra live copies |
| 6 | 2026-08-14 | J-2 | SALARY A/C | 6,000.00 | 0.00 | 2 | 1 | Extra live copies |
| 6 | 2026-04-10 | J-1 | SALARY PAYABLE | 10,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-04-10 | J-2 | SALARY PAYABLE | 7,000.00 | 0.00 | 3 | 3 | Amount/date match |
| 6 | 2026-04-10 | J-3 | SALARY PAYABLE | 7,000.00 | 0.00 | 3 | 3 | Amount/date match |
| 6 | 2026-04-10 | J-4 | SALARY PAYABLE | 15,600.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-04-10 | J-5 | SALARY PAYABLE | 5,000.00 | 0.00 | 2 | 2 | Amount/date match |
| 6 | 2026-04-10 | J-6 | SALARY PAYABLE | 6,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-04-10 | J-7 | SALARY PAYABLE | 13,000.00 | 0.00 | 1 | 1 | Amount/date match |
| 6 | 2026-04-10 | J-8 | SALARY PAYABLE | 5,000.00 | 0.00 | 2 | 2 | Amount/date match |
| 6 | 2026-04-10 | J-9 | SALARY PAYABLE | 7,000.00 | 0.00 | 3 | 3 | Amount/date match |
| 7 | 2026-04-01 | C-4 | SAMBIT RAUT | 0.00 | 35,000.00 | 0 | 1 | No allocated match |
| 7 | 2026-04-01 | J-2 | SAMBIT RAUT | 0.00 | 10,000.00 | 0 | 1 | No allocated match |
| 7 | 2026-04-06 | J-2 | SAMBIT RAUT | 0.00 | 3,500.00 | 0 | 1 | No allocated match |
| 7 | 2026-04-06 | J-3 | SAMBIT RAUT | 0.00 | 32,000.00 | 0 | 1 | No allocated match |
| 7 | 2026-04-10 | J-1 | SAMBIT RAUT | 0.00 | 10,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-04-10 | J-2 | SAMBIT RAUT | 0.00 | 7,000.00 | 3 | 3 | Amount/date match |
| 7 | 2026-04-10 | J-3 | SAMBIT RAUT | 0.00 | 7,000.00 | 3 | 3 | Amount/date match |
| 7 | 2026-04-10 | J-4 | SAMBIT RAUT | 0.00 | 15,600.00 | 1 | 1 | Amount/date match |
| 7 | 2026-04-10 | J-5 | SAMBIT RAUT | 0.00 | 5,000.00 | 2 | 2 | Amount/date match |
| 7 | 2026-04-10 | J-6 | SAMBIT RAUT | 0.00 | 6,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-04-10 | J-7 | SAMBIT RAUT | 0.00 | 13,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-04-10 | J-8 | SAMBIT RAUT | 0.00 | 5,000.00 | 2 | 2 | Amount/date match |
| 7 | 2026-04-10 | J-9 | SAMBIT RAUT | 0.00 | 7,000.00 | 3 | 3 | Amount/date match |
| 7 | 2026-04-15 | J-1 | SAMBIT RAUT | 0.00 | 13,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-05-10 | J-1 | SAMBIT RAUT | 0.00 | 8,832.00 | 1 | 1 | Amount/date match |
| 7 | 2026-05-10 | J-2 | SAMBIT RAUT | 0.00 | 9,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-05-10 | J-3 | SAMBIT RAUT | 0.00 | 4,807.00 | 1 | 1 | Amount/date match |
| 7 | 2026-05-13 | J-1 | SAMBIT RAUT | 0.00 | 7,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-05-13 | J-2 | SAMBIT RAUT | 0.00 | 2,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-05-13 | J-3 | SAMBIT RAUT | 0.00 | 13,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-05-16 | J-1 | SAMBIT RAUT | 0.00 | 50,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-05-23 | J-2 | SAMBIT RAUT | 0.00 | 1.00 | 1 | 1 | Amount/date match |
| 7 | 2026-06-13 | J-1 | SAMBIT RAUT | 0.00 | 1.00 | 1 | 1 | Amount/date match |
| 7 | 2026-06-13 | J-2 | SAMBIT RAUT | 0.00 | 25,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-06-14 | J-1 | SAMBIT RAUT | 0.00 | 13,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-06-19 | J-1 | SAMBIT RAUT | 0.00 | 5,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-06-26 | J-1 | SAMBIT RAUT | 0.00 | 1.00 | 1 | 1 | Amount/date match |
| 7 | 2026-07-10 | J-1 | SAMBIT RAUT | 0.00 | 2,700.00 | 1 | 1 | Amount/date match |
| 7 | 2026-07-11 | J-1 | SAMBIT RAUT | 0.00 | 30,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-07-11 | J-6 | SAMBIT RAUT | 0.00 | 5,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-07-15 | J-1 | SAMBIT RAUT | 0.00 | 13,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-07-15 | J-2 | SAMBIT RAUT | 0.00 | 1,000.00 | 1 | 1 | Amount/date match |
| 7 | 2026-07-16 | J-1 | SAMBIT RAUT | 0.00 | 2,000.00 | 3 | 1 | Extra live copies |
| 7 | 2026-08-11 | J-1 | SAMBIT RAUT | 0.00 | 50,000.00 | 3 | 1 | Extra live copies |
| 7 | 2026-08-12 | J-4 | SAMBIT RAUT | 0.00 | 40,000.00 | 3 | 1 | Extra live copies |
| 8 | 2026-08-14 | J-1 | SAMBIT RAUT | 0.00 | 3,000.00 | 3 | 1 | Extra live copies |
| 8 | 2026-05-27 | J-1 | SOMA | 0.00 | 100.00 | 1 | 1 | Amount/date match |
| 8 | 2026-07-09 | J-2 | SOMA | 0.00 | 4,988.00 | 1 | 1 | Amount/date match |

## Reconstructed source vouchers (not an additional import file)

Each voucher appears once. Cash-inferred rows are explicitly marked.

| Date | Voucher | Pages | Debit account | Credit account | Amount | Narration | Cash inferred |
|---|---|---|---|---|---:|---|---|
| 2026-04-01 | C-4 | 7 | CASH IN HAND | SAMBIT RAUT | 35,000.00 | CASH RECVD FROM SAMBIT RAUT | Yes |
| 2026-04-01 | C-5 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 660.00 | CASH FOR PURCHASE VEGETABLE | Yes |
| 2026-04-01 | J-2 | 1/7 | EASTER DAY MEETING EXPS | SAMBIT RAUT | 10,000.00 | ADV PAID FOR PALACE RENT | No |
| 2026-04-03 | C-1 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 1,650.00 | CASH PAID FOR STY GOODS | Yes |
| 2026-04-03 | C-2 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 1,000.00 | CASH PAID FOR SHAWAL PURCHASE | Yes |
| 2026-04-04 | C-1 | 4 | MEETING EXPS | CASH IN HAND | 900.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-04-04 | C-2 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 2,790.00 | CASH PAID FOR DISPOSABLE PLATE PURCHASE ETC | Yes |
| 2026-04-05 | C-1 | 2 | CASH IN HAND | GOLAK DONATION | 3,760.00 | CASH | Yes |
| 2026-04-05 | C-2 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 1,325.00 | CASH PAID FOR GROCERY | Yes |
| 2026-04-05 | C-3 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 3,485.00 | CASH FOR PURCHASE VEGETABLE | Yes |
| 2026-04-05 | C-4 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 1,450.00 | CASH FOR ATTA PURCHASE | Yes |
| 2026-04-05 | C-5 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 9,000.00 | CASH PAID TO HALWAI | Yes |
| 2026-04-05 | C-6 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 2,000.00 | CASH PAID FOR CYLINDER | Yes |
| 2026-04-05 | C-7 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 500.00 | CASH FOR PETROL+AUTO RENT | Yes |
| 2026-04-06 | C-1 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 4,445.00 | CASH FOR PURCHASE MILK+MAKHAN+DAHI +CREAM | Yes |
| 2026-04-06 | J-2 | 1/7 | EASTER DAY MEETING EXPS | SAMBIT RAUT | 3,500.00 | FOR SOUND | No |
| 2026-04-06 | J-3 | 1/7 | EASTER DAY MEETING EXPS | SAMBIT RAUT | 32,000.00 | PALACE 18000+4000 CYLINDER+5500 LCD+3000 GENERTOT OIL+1500 CHAIR | No |
| 2026-04-10 | J-1 | 6/7 | SALARY PAYABLE | SAMBIT RAUT | 10,000.00 | SALARY PAID TO RAJWINDER | No |
| 2026-04-10 | J-2 | 6/7 | SALARY PAYABLE | SAMBIT RAUT | 7,000.00 | SALARY PAID TO BALVIR | No |
| 2026-04-10 | J-3 | 6/7 | SALARY PAYABLE | SAMBIT RAUT | 7,000.00 | SALARY PAID TO PAWAN | No |
| 2026-04-10 | J-4 | 6/7 | SALARY PAYABLE | SAMBIT RAUT | 15,600.00 | SALARY PAID TO ANKUSH | No |
| 2026-04-10 | J-5 | 6/7 | SALARY PAYABLE | SAMBIT RAUT | 5,000.00 | SALARY PAID TO JOHN | No |
| 2026-04-10 | J-6 | 6/7 | SALARY PAYABLE | SAMBIT RAUT | 6,000.00 | SALARY PAID TO SANDEEP | No |
| 2026-04-10 | J-7 | 6/7 | SALARY PAYABLE | SAMBIT RAUT | 13,000.00 | SALARY PAID TO RUPESH | No |
| 2026-04-10 | J-8 | 6/7 | SALARY PAYABLE | SAMBIT RAUT | 5,000.00 | SALARY PAID TO LAKSHMI | No |
| 2026-04-10 | J-9 | 6/7 | SALARY PAYABLE | SAMBIT RAUT | 7,000.00 | SALARY PAID TO KULWANT SINGH BUNTY | No |
| 2026-04-11 | C-1 | 2 | CASH IN HAND | GOLAK DONATION | 700.00 | CASH | Yes |
| 2026-04-11 | C-2 | 4 | MEETING EXPS | CASH IN HAND | 1,050.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-04-15 | J-1 | 5/7 | RENT | SAMBIT RAUT | 13,000.00 | AMT TSFR FROM SAMBIT RAUT FOR RENT PAID | No |
| 2026-04-16 | C-1 | 1 | EASTER DAY MEETING EXPS | CASH IN HAND | 9,995.00 | CASH FOR CHANA DAL | Yes |
| 2026-04-18 | C-1 | 2 | CASH IN HAND | GOLAK DONATION | 910.00 | CASH | Yes |
| 2026-04-18 | C-2 | 4 | MEETING EXPS | CASH IN HAND | 1,250.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-04-25 | C-1 | 2 | CASH IN HAND | GOLAK DONATION | 1,165.00 | CASH | Yes |
| 2026-04-25 | C-2 | 4 | MEETING EXPS | CASH IN HAND | 1,350.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-05-02 | C-1 | 2 | CASH IN HAND | GOLAK DONATION | 1,000.00 | CASH | Yes |
| 2026-05-02 | C-2 | 4 | MEETING EXPS | CASH IN HAND | 500.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-05-09 | C-1 | 4 | MEETING EXPS | CASH IN HAND | 3,050.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-05-10 | C-4 | 2 | CASH IN HAND | GOLAK DONATION | 1,900.00 | CASH | Yes |
| 2026-05-10 | J-1 | 5/7 | SALARY A/C | SAMBIT RAUT | 8,832.00 | SALARY PAID TO RAJWINDER FOR MONTH OF APRIL 2026 | No |
| 2026-05-10 | J-2 | 5/7 | SALARY A/C | SAMBIT RAUT | 9,000.00 | SALARY PAID TO RUPESH FOR MONTH OF APRIL 2026 | No |
| 2026-05-10 | J-3 | 5/7 | SALARY A/C | SAMBIT RAUT | 4,807.00 | SALARY PAID TO LAKSHMI FOR MONTH OF APRIL 2026 | No |
| 2026-05-13 | J-1 | 5/7 | SALARY A/C | SAMBIT RAUT | 7,000.00 | SALARY PAID TO KULWANT SINGH FOR MONTH OF APRIL 2026 | No |
| 2026-05-13 | J-2 | 5/7 | SALARY A/C | SAMBIT RAUT | 2,000.00 | ADVANCE PAID TO JOHN FOR MONTH OF APRIL | No |
| 2026-05-13 | J-3 | 5/7 | RENT | SAMBIT RAUT | 13,000.00 | AMT TSFR FROM SAMBIT RAUT FOR RENT PAID | No |
| 2026-05-16 | C-2 | 2 | CASH IN HAND | GOLAK DONATION | 650.00 | CASH | Yes |
| 2026-05-16 | C-3 | 4 | MEETING EXPS | CASH IN HAND | 700.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-05-16 | J-1 | 2/7 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 50,000.00 | CHQ NO 000079 FROM SAMBIT RAUT | No |
| 2026-05-23 | C-3 | 2 | CASH IN HAND | GOLAK DONATION | 330.00 | CASH | Yes |
| 2026-05-23 | C-4 | 4 | MEETING EXPS | CASH IN HAND | 1,060.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-05-23 | J-2 | 2/7 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 1.00 | UPI | No |
| 2026-05-27 | J-1 | 2/8 | HDFC BANK A/C NO 50100882772080 | SOMA | 100.00 | AMT TSFR FROM SISTER SOMA | No |
| 2026-05-27 | J-2 | 1/3 | HDFC BANK A/C NO 50100882772080 | DONATION BY BANK | 100.00 | AMT TSFR FROM SISTER SOMA | No |
| 2026-05-27 | J-3 | 3/5 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 7,000.00 | SALARY PAID TO BALVIR APRIL MONTH | No |
| 2026-05-27 | J-4 | 3/5 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 5,564.00 | SALARY PAID TO SANDEEP APRIL MONTH | No |
| 2026-05-27 | J-5 | 3/5 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 12,000.00 | SALARY PAID TO PAWAN APRIL MONTH | No |
| 2026-05-27 | J-6 | 3/5 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 20,000.00 | SALARY PAID TO ANKUSH APRIL MONTH | No |
| 2026-05-30 | C-1 | 2 | CASH IN HAND | GOLAK DONATION | 840.00 | CASH | Yes |
| 2026-05-30 | C-2 | 4 | MEETING EXPS | CASH IN HAND | 790.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-06-06 | C-1 | 2 | CASH IN HAND | GOLAK DONATION | 1,021.00 | CASH | Yes |
| 2026-06-06 | C-2 | 4 | MEETING EXPS | CASH IN HAND | 920.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-06-13 | C-6 | 2 | CASH IN HAND | GOLAK DONATION | 2,087.00 | CASH | Yes |
| 2026-06-13 | C-7 | 4 | MEETING EXPS | CASH IN HAND | 1,100.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-06-13 | J-1 | 3/7 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 1.00 | UPI FROM SAMBIT RAUT | No |
| 2026-06-13 | J-2 | 3/7 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 25,000.00 | UPI FROM SAMBIT RAUT | No |
| 2026-06-13 | J-3 | 3/5 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 8,832.00 | SALARY PAID TO RAJWINDER FOR THE MONTH OF MAY 2026 | No |
| 2026-06-13 | J-4 | 3/5 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 13,000.00 | SALARY PAID TO RUPESH FOR THE MONTH OF MAY 2026 | No |
| 2026-06-13 | J-5 | 3/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 4,800.00 | SALARY PAID TO LAKSHMI FOR THE MONTH OF MAY 2026 | No |
| 2026-06-14 | J-1 | 5/7 | RENT | SAMBIT RAUT | 13,000.00 | AMT TSFR FROM SAMBIT RAUT FOR RENT PAID | No |
| 2026-06-19 | J-1 | 3/7 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 5,000.00 | UPI FROM SAMBIT | No |
| 2026-06-19 | J-2 | 3/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 7,000.00 | SALRY PAID TO KULWANT SINGH BUNTY FOR THE MONTH OF MAY 2026 | No |
| 2026-06-20 | C-1 | 2 | CASH IN HAND | GOLAK DONATION | 320.00 | CASH | Yes |
| 2026-06-20 | C-2 | 4 | MEETING EXPS | CASH IN HAND | 680.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-06-26 | J-1 | 3/7 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 1.00 | UPI FROM SAMBIT | No |
| 2026-06-27 | C-1 | 4 | MEETING EXPS | CASH IN HAND | 1,150.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-06-27 | C-2 | 2 | CASH IN HAND | GOLAK DONATION | 1,020.00 | CASH | Yes |
| 2026-07-01 | J-1 | 1/3 | HDFC BANK A/C NO 50100882772080 | BANK INTEREST | 51.00 | INTT FROM HDFC BANK | No |
| 2026-07-04 | C-1 | 4 | MEETING EXPS | CASH IN HAND | 1,050.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-07-04 | C-2 | 2 | CASH IN HAND | GOLAK DONATION | 780.00 | CASH | Yes |
| 2026-07-09 | J-1/J-2 | 5/8 | PRINTING & STY | SOMA | 4,988.00 | AMT FOR PAMPHLET PRINTING | No |
| 2026-07-10 | J-1 | 6/7 | SALARY A/C | SAMBIT RAUT | 2,700.00 | AMT PAID AS ADVANCE TO JOHN | No |
| 2026-07-11 | C-7 | 4 | MEETING EXPS | CASH IN HAND | 9,050.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-07-11 | J-1 | 3/7 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 30,000.00 | UPI FROM SAMBIT RAUT | No |
| 2026-07-11 | J-2 | 3/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 9,600.00 | SALARY PAID TO RAJWINDER FOR THE MONTH OF JUNE 2026 | No |
| 2026-07-11 | J-3 | 3/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 13,000.00 | SALARY PAID TO RUPESH FOR THE MONTH OF JUNE 2026 | No |
| 2026-07-11 | J-4 | 3/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 4,230.60 | SALARY PAID TO LAKSHMI FOR THE MONTH OF JUNE 2026 | No |
| 2026-07-11 | J-5 | 3/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 7,000.00 | SALARY PAID TO BALVIR FOR THE MONTH OF MAY-2026 | No |
| 2026-07-11 | J-6 | 3/7 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 5,000.00 | UPI FROM SAMBIT (BALTWS 3227.40 ) AS ON 15.7.26 | No |
| 2026-07-12 | C-1 | 4 | MEETING EXPS | CASH IN HAND | 2,100.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-07-12 | C-2 | 2 | CASH IN HAND | GOLAK DONATION | 1,000.00 | CASH | Yes |
| 2026-07-15 | J-1 | 5/7 | RENT | SAMBIT RAUT | 13,000.00 | AMT TSFR FROM SAMBIT RAUT FOR RENT PAID | No |
| 2026-07-15 | J-2 | 6/7 | SALARY A/C | SAMBIT RAUT | 1,000.00 | AMT PAID AS ADVANCE TO JOHN | No |
| 2026-07-16 | J-1 | 3/7 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 2,000.00 | AMT TSFR FROM SAMBIT RAUT | No |
| 2026-07-16 | J-2 | 3/4 | MEETING EXPS | HDFC BANK A/C NO 50100882772080 | 4,300.00 | TENT CHJARGES PAID | No |
| 2026-07-19 | C-1 | 4 | MEETING EXPS | CASH IN HAND | 1,215.00 | CASH PAID FOR GROCERY EXPS | Yes |
| 2026-07-19 | C-2 | 2 | CASH IN HAND | GOLAK DONATION | 1,040.00 | CASH | Yes |
| 2026-07-25 | C-1 | 4 | MEETING EXPS | CASH IN HAND | 1,410.00 | CASH PAID FOR MEETING EXPS | Yes |
| 2026-07-25 | C-2 | 2 | CASH IN HAND | GOLAK DONATION | 940.00 | CASH | Yes |
| 2026-08-01 | J-1 | 3/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 1.00 | RUPESH | No |
| 2026-08-02 | C-1 | 4 | MEETING EXPS | CASH IN HAND | 600.00 | CASH PAID FOR MEETING EXPS | Yes |
| 2026-08-02 | C-2 | 2 | CASH IN HAND | GOLAK DONATION | 310.00 | CASH | Yes |
| 2026-08-05 | J-1 | 3/4 | MEETING EXPS | HDFC BANK A/C NO 50100882772080 | 900.00 | CHG PAID TO RAKESH KUAMR | No |
| 2026-08-09 | C-1 | 4 | MEETING EXPS | CASH IN HAND | 930.00 | CASH PAID FOR MEETING EXPS | Yes |
| 2026-08-09 | C-2 | 2 | CASH IN HAND | GOLAK DONATION | 4,420.00 | CASH | Yes |
| 2026-08-11 | J-1 | 3/7 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 50,000.00 | AMT TSFR FROM SAMBIT RAUT | No |
| 2026-08-11 | J-2 | 3/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 9,200.00 | SALARY PAID TO KULWANT SINGH (BUNTY) | No |
| 2026-08-11 | J-3 | 3/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 10,000.00 | JULY MONTH SALARY PAID TO RAJWINDER | No |
| 2026-08-11 | J-4 | 3/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 5,000.00 | JULY MONTH SALARY PAID TO LAKSHMI | No |
| 2026-08-11 | J-5 | 1/3 | HDFC BANK A/C NO 50100882772080 | DONATION BY BANK | 500.00 | DONATION FROM LAKSHMI | No |
| 2026-08-12 | J-1 | 3/4 | MEETING EXPS | HDFC BANK A/C NO 50100882772080 | 1,300.00 | GENERTOR EXPS PAID | No |
| 2026-08-12 | J-2 | 3/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 20,000.00 | SALARY PAID TO ANKUSH (PS.JOEL) | No |
| 2026-08-12 | J-3 | 1/3 | HDFC BANK A/C NO 50100882772080 | DONATION BY BANK | 2,000.00 | AMT RECVD FROM RAJWINDER | No |
| 2026-08-12 | J-4 | 3/7 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 40,000.00 | AMT TSFR FROM SAMBIT RAUT | No |
| 2026-08-12 | J-5 | 3/5 | RENT | HDFC BANK A/C NO 50100882772080 | 13,000.00 | RENT PAID | No |
| 2026-08-12 | J-6 | 4/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 7,000.00 | SALARY PAID TO BALVIR | No |
| 2026-08-12 | J-7 | 4 | MEETING EXPS | HDFC BANK A/C NO 50100882772080 | 900.00 | PAID TO RAKESH KUMAR | No |
| 2026-08-12 | J-8 | 4/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 13,000.00 | JULY MONTH SALARY PAID TO RUPESH | No |
| 2026-08-13 | J-1 | 4/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 3,000.00 | SALARY PAID TO JOHN | No |
| 2026-08-13 | J-2 | 4/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 7,000.00 | SALARY PAID TO DEEPIKA | No |
| 2026-08-14 | J-1 | 4/8 | HDFC BANK A/C NO 50100882772080 | SAMBIT RAUT | 3,000.00 | AMT TSFR FROM SAMBIT RAUT | No |
| 2026-08-14 | J-2 | 4/6 | SALARY A/C | HDFC BANK A/C NO 50100882772080 | 6,000.00 | SALARY PAID TO SANDEEP PART PMT | No |
| 2026-08-16 | C-3 | 4 | MEETING EXPS | CASH IN HAND | 1,286.00 | CASH PAID FOR MEETING EXPS | Yes |
| 2026-08-16 | C-4 | 2 | CASH IN HAND | GOLAK DONATION | 680.00 | CASH | Yes |
| 2026-08-16 | J-1 | 1/4 | HDFC BANK A/C NO 50100882772080 | DONATION BY BANK | 100.00 | DONATION BY BANK | No |
| 2026-08-16 | J-2 | 1/4 | HDFC BANK A/C NO 50100882772080 | DONATION BY BANK | 100.00 | DONATION BY BANK | No |
| 2026-08-23 | C-1 | 4 | MEETING EXPS | CASH IN HAND | 290.00 | CASH PAID FOR MEETING EXPS | Yes |
| 2026-08-23 | C-2 | 2 | CASH IN HAND | GOLAK DONATION | 590.00 | CASH | Yes |
| 2026-08-23 | C-3 | 2 | GOLAK DONATION | CASH IN HAND | 2,460.00 | CASH RECVD | Yes |
| 2026-08-29 | C-1 | 5 | MEETING EXPS | CASH IN HAND | 290.00 | CASH PAID | Yes |
