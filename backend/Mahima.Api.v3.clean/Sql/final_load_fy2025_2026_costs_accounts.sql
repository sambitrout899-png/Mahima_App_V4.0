-- Load Mahima FY 2025-2026 cost and account data from supplied finance PDFs.
-- Source PDFs:
--   8cd2e80a9deb444fba274473090da5b5.pdf and 65d03fe5e30e4af583ae1c5143593b36.pdf: duplicate General Ledger
--   1164d571e9f046e1907f53f626236fcb.pdf: Trading and Profit & Loss
--   9597461a723a4b82981575a4a16a370f.pdf: Balance Sheet
-- Safe to run repeatedly: deletes and recreates rows marked [FY2025_2026_COST_LOAD].
-- Also replaces the earlier partial PDF import whose notes/descriptions start:
--   Imported from FY2025-26 PDF statements on 2026-05-27

BEGIN;

INSERT INTO public.accounts (name, type, created_at)
SELECT v.name, v.type, now()
FROM (VALUES
    ('BUILDING A/C', 'ASSET'),
    ('Capital Fund', 'EQUITY'),
    ('Cash', 'ASSET'),
    ('Depreciation Expense', 'EXPENSE'),
    ('Donations', 'INCOME'),
    ('FURNITURE', 'ASSET'),
    ('GOLAK DONATION', 'INCOME'),
    ('M/S SAMBIT RAUT', 'LIABILITY'),
    ('MUSIC SYSTEM', 'ASSET'),
    ('Ministry Events Expense', 'EXPENSE'),
    ('Miscellaneous Expense', 'EXPENSE'),
    ('Office and Administration Expense', 'EXPENSE'),
    ('Payroll Expense', 'EXPENSE'),
    ('Payroll Payable', 'LIABILITY'),
    ('Rent Expense', 'EXPENSE'),
    ('Repairs and Maintenance Expense', 'EXPENSE'),
    ('TENT & CORCKERY', 'ASSET')
) AS v(name, type)
WHERE NOT EXISTS (
    SELECT 1 FROM public.accounts a WHERE lower(a.name) = lower(v.name)
);

UPDATE public.accounts a
SET type = v.type
FROM (VALUES
    ('BUILDING A/C', 'ASSET'),
    ('Capital Fund', 'EQUITY'),
    ('Cash', 'ASSET'),
    ('Depreciation Expense', 'EXPENSE'),
    ('Donations', 'INCOME'),
    ('FURNITURE', 'ASSET'),
    ('GOLAK DONATION', 'INCOME'),
    ('M/S SAMBIT RAUT', 'LIABILITY'),
    ('MUSIC SYSTEM', 'ASSET'),
    ('Ministry Events Expense', 'EXPENSE'),
    ('Miscellaneous Expense', 'EXPENSE'),
    ('Office and Administration Expense', 'EXPENSE'),
    ('Payroll Expense', 'EXPENSE'),
    ('Payroll Payable', 'LIABILITY'),
    ('Rent Expense', 'EXPENSE'),
    ('Repairs and Maintenance Expense', 'EXPENSE'),
    ('TENT & CORCKERY', 'ASSET')
) AS v(name, type)
WHERE lower(a.name) = lower(v.name)
  AND a.type IS DISTINCT FROM v.type;

DELETE FROM public.expenses
WHERE notes LIKE '%[FY2025_2026_COST_LOAD]%'
   OR description LIKE '%[FY2025_2026_COST_LOAD]%'
   OR notes LIKE 'Imported from FY2025-26 PDF statements on 2026-05-27%'
   OR description LIKE 'Imported from FY2025-26 PDF statements on 2026-05-27%';

DELETE FROM public.journal_lines jl
USING public.journal_entries je
WHERE jl.journal_entry_id = je.id
  AND (
      je.description LIKE '%[FY2025_2026_COST_LOAD]%'
      OR je.description LIKE 'Imported from FY2025-26 PDF statements on 2026-05-27%'
  );

DELETE FROM public.journal_entries
WHERE description LIKE '%[FY2025_2026_COST_LOAD]%'
   OR description LIKE 'Imported from FY2025-26 PDF statements on 2026-05-27%';

WITH source_entries(source_key, entry_date, description) AS (
    VALUES
    ('CAP-CASH-001', DATE '2025-12-03', 'Cash received from Pastor Sambit Raut - capital fund [FY2025_2026_COST_LOAD] [CAP-CASH-001]'),
    ('CAP-MUSIC-001', DATE '2025-12-03', 'Amount of music system - capital fund [FY2025_2026_COST_LOAD] [CAP-MUSIC-001]'),
    ('CAP-FURNITURE-001', DATE '2025-12-03', 'Amount of furniture - capital fund [FY2025_2026_COST_LOAD] [CAP-FURNITURE-001]'),
    ('CAP-TENT-001', DATE '2025-12-03', 'Amount of tent crockery - capital fund [FY2025_2026_COST_LOAD] [CAP-TENT-001]'),
    ('CAP-BUILDING-001', DATE '2025-12-03', 'Amount of building - capital fund [FY2025_2026_COST_LOAD] [CAP-BUILDING-001]'),
    ('DON-20251206', DATE '2025-12-06', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20251206]'),
    ('DON-20251213', DATE '2025-12-13', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20251213]'),
    ('DON-20251220', DATE '2025-12-20', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20251220]'),
    ('DON-20251227', DATE '2025-12-27', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20251227]'),
    ('DON-20260103', DATE '2026-01-03', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260103]'),
    ('DON-20260110', DATE '2026-01-10', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260110]'),
    ('DON-20260117', DATE '2026-01-17', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260117]'),
    ('DON-20260124', DATE '2026-01-24', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260124]'),
    ('DON-20260131', DATE '2026-01-31', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260131]'),
    ('DON-20260207', DATE '2026-02-07', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260207]'),
    ('DON-20260214', DATE '2026-02-14', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260214]'),
    ('DON-20260221', DATE '2026-02-21', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260221]'),
    ('DON-20260228', DATE '2026-02-28', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260228]'),
    ('DON-20260307', DATE '2026-03-07', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260307]'),
    ('DON-20260314', DATE '2026-03-14', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260314]'),
    ('DON-20260321', DATE '2026-03-21', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260321]'),
    ('DON-20260328', DATE '2026-03-28', 'Cash donation received [FY2025_2026_COST_LOAD] [DON-20260328]'),
    ('GOLAK-20251206', DATE '2025-12-06', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20251206]'),
    ('GOLAK-20251213', DATE '2025-12-13', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20251213]'),
    ('GOLAK-20251220A', DATE '2025-12-20', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20251220A]'),
    ('GOLAK-20251220B', DATE '2025-12-20', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20251220B]'),
    ('GOLAK-20260103', DATE '2026-01-03', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260103]'),
    ('GOLAK-20260110', DATE '2026-01-10', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260110]'),
    ('GOLAK-20260117', DATE '2026-01-17', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260117]'),
    ('GOLAK-20260124', DATE '2026-01-24', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260124]'),
    ('GOLAK-20260131', DATE '2026-01-31', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260131]'),
    ('GOLAK-20260207', DATE '2026-02-07', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260207]'),
    ('GOLAK-20260214', DATE '2026-02-14', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260214]'),
    ('GOLAK-20260221', DATE '2026-02-21', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260221]'),
    ('GOLAK-20260228', DATE '2026-02-28', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260228]'),
    ('GOLAK-20260307', DATE '2026-03-07', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260307]'),
    ('GOLAK-20260314', DATE '2026-03-14', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260314]'),
    ('GOLAK-20260321', DATE '2026-03-21', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260321]'),
    ('GOLAK-20260328', DATE '2026-03-28', 'Cash received - golak donation [FY2025_2026_COST_LOAD] [GOLAK-20260328]'),
    ('XMAS-20251215', DATE '2025-12-15', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251215]'),
    ('XMAS-20251218', DATE '2025-12-18', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251218]'),
    ('XMAS-20251220', DATE '2025-12-20', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251220]'),
    ('XMAS-20251224A', DATE '2025-12-24', 'Cash paid for grocery purchase [FY2025_2026_COST_LOAD] [XMAS-20251224A]'),
    ('XMAS-20251224B', DATE '2025-12-24', 'Cash for disposable items purchase [FY2025_2026_COST_LOAD] [XMAS-20251224B]'),
    ('XMAS-20251225A', DATE '2025-12-25', 'Cash paid for grocery purchase [FY2025_2026_COST_LOAD] [XMAS-20251225A]'),
    ('XMAS-20251225B', DATE '2025-12-25', 'Cash paid for paneer, milk etc purchase [FY2025_2026_COST_LOAD] [XMAS-20251225B]'),
    ('XMAS-20251225C', DATE '2025-12-25', 'Cash paid for rent patila etc [FY2025_2026_COST_LOAD] [XMAS-20251225C]'),
    ('XMAS-20251225D', DATE '2025-12-25', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251225D]'),
    ('XMAS-20251226', DATE '2025-12-26', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251226]'),
    ('XMAS-SAMBIT-20251225', DATE '2025-12-25', 'Amount received from Sambit Raut and paid for grocery items purchase [FY2025_2026_COST_LOAD] [XMAS-SAMBIT-20251225]'),
    ('FURN-CHAIRS-20260314', DATE '2026-03-14', 'Cash paid for chair purchase [FY2025_2026_COST_LOAD] [FURN-CHAIRS-20260314]'),
    ('DEP-FURNITURE-20260331', DATE '2026-03-31', 'Depreciation for year 2025-2026 of furniture [FY2025_2026_COST_LOAD] [DEP-FURNITURE-20260331]'),
    ('MISC-SWEETS-20260101', DATE '2026-01-01', 'C.M 653577 for sweets purchase [FY2025_2026_COST_LOAD] [MISC-SWEETS-20260101]'),
    ('PRINT-STY-20260312', DATE '2026-03-12', 'C.M 91 for stationery goods [FY2025_2026_COST_LOAD] [PRINT-STY-20260312]'),
    ('RENT-20251215', DATE '2025-12-15', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20251215]'),
    ('RENT-20260115', DATE '2026-01-15', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20260115]'),
    ('RENT-20260215', DATE '2026-02-15', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20260215]'),
    ('RENT-20260315', DATE '2026-03-15', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20260315]'),
    ('REPAIR-ELEC-20251231', DATE '2025-12-31', 'Cash for electrical goods purchase [FY2025_2026_COST_LOAD] [REPAIR-ELEC-20251231]'),
    ('REPAIR-CABLE-20260227', DATE '2026-02-27', 'C.M 1402 for cable karlin purchase from Calcuta Music House [FY2025_2026_COST_LOAD] [REPAIR-CABLE-20260227]'),
    ('SAL-20260102-RAJWINDER', DATE '2026-01-02', 'Amount transferred to RAJWINDER SISTER by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-RAJWINDER]'),
    ('SAL-20260102-BALVIR', DATE '2026-01-02', 'Amount transferred to BALVIR KUMAR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-BALVIR]'),
    ('SAL-20260102-PAWAN', DATE '2026-01-02', 'Amount transferred to PAWAN KUMAR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-PAWAN]'),
    ('SAL-20260102-ANKUSH', DATE '2026-01-02', 'Amount transferred to ANKUSH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-ANKUSH]'),
    ('SAL-20260102-SANDEEP', DATE '2026-01-02', 'Amount transferred to SANDEEP by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-SANDEEP]'),
    ('SAL-20260102-JOHN', DATE '2026-01-02', 'Amount transferred to JOHN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-JOHN]'),
    ('SAL-20260102-LAKSMI', DATE '2026-01-02', 'Amount transferred to LAKSMI by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-LAKSMI]'),
    ('SAL-20260110-ANDRIAS', DATE '2026-01-10', 'Amount transferred to ANDRIAS by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260110-ANDRIAS]'),
    ('SAL-20260205-RAJWINDER', DATE '2026-02-05', 'Amount transferred to RAJWINDER SISTER by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-RAJWINDER]'),
    ('SAL-20260205-BALVIR', DATE '2026-02-05', 'Amount transferred to BALVIR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-BALVIR]'),
    ('SAL-20260205-PAWAN', DATE '2026-02-05', 'Amount transferred to PAWAN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-PAWAN]'),
    ('SAL-20260205-ANKUSH', DATE '2026-02-05', 'Amount transferred to ANKUSH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-ANKUSH]'),
    ('SAL-20260205-JOHN', DATE '2026-02-05', 'Amount transferred to JOHN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-JOHN]'),
    ('SAL-20260205-SANDEEP', DATE '2026-02-05', 'Amount transferred to SANDEEP by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-SANDEEP]'),
    ('SAL-20260205-RUPESH', DATE '2026-02-05', 'Amount transferred to RUPESH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-RUPESH]'),
    ('SAL-20260205-LAKSHMI', DATE '2026-02-05', 'Amount transferred to LAKSHMI by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-LAKSHMI]'),
    ('SAL-20260205-ANDRIAS', DATE '2026-02-05', 'Amount transferred to ANDRIAS by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-ANDRIAS]'),
    ('SAL-20260305-RAJWINDER', DATE '2026-03-05', 'Amount transferred to RAJWINDER SISTER by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-RAJWINDER]'),
    ('SAL-20260305-BALVIR', DATE '2026-03-05', 'Amount transferred to BALVIR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-BALVIR]'),
    ('SAL-20260305-PAWAN', DATE '2026-03-05', 'Amount transferred to PAWAN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-PAWAN]'),
    ('SAL-20260305-ANKUSH', DATE '2026-03-05', 'Amount transferred to ANKUSH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-ANKUSH]'),
    ('SAL-20260305-RUPESH', DATE '2026-03-05', 'Amount transferred to RUPESH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-RUPESH]'),
    ('SAL-20260305-JOHN', DATE '2026-03-05', 'Amount transferred to JOHN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-JOHN]'),
    ('SAL-20260305-SANDEEP', DATE '2026-03-05', 'Amount transferred to SANDEEP by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-SANDEEP]'),
    ('SAL-20260305-LAKSHMI', DATE '2026-03-05', 'Amount transferred to LAKSHMI by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-LAKSHMI]'),
    ('SAL-PAYABLE-20260331', DATE '2026-03-31', 'Payable salary [FY2025_2026_COST_LOAD] [SAL-PAYABLE-20260331]')
),
created_entries AS (
    INSERT INTO public.journal_entries (date, description, created_at)
    SELECT entry_date::timestamp with time zone, description, now()
    FROM source_entries
    RETURNING id, description
),
entry_map AS (
    SELECT ce.id AS journal_entry_id, se.source_key
    FROM created_entries ce
    JOIN source_entries se ON ce.description LIKE '%' || '[' || se.source_key || ']' || '%'
),
source_lines(source_key, account_name, debit, credit) AS (
    VALUES
    ('CAP-CASH-001', 'Cash', 55000.00, 0.00),
    ('CAP-CASH-001', 'Capital Fund', 0.00, 55000.00),
    ('CAP-MUSIC-001', 'MUSIC SYSTEM', 80000.00, 0.00),
    ('CAP-MUSIC-001', 'Capital Fund', 0.00, 80000.00),
    ('CAP-FURNITURE-001', 'FURNITURE', 72000.00, 0.00),
    ('CAP-FURNITURE-001', 'Capital Fund', 0.00, 72000.00),
    ('CAP-TENT-001', 'TENT & CORCKERY', 35000.00, 0.00),
    ('CAP-TENT-001', 'Capital Fund', 0.00, 35000.00),
    ('CAP-BUILDING-001', 'BUILDING A/C', 325000.00, 0.00),
    ('CAP-BUILDING-001', 'Capital Fund', 0.00, 325000.00),
    ('DON-20251206', 'Cash', 1691.00, 0.00),
    ('DON-20251206', 'Donations', 0.00, 1691.00),
    ('DON-20251213', 'Cash', 1350.00, 0.00),
    ('DON-20251213', 'Donations', 0.00, 1350.00),
    ('DON-20251220', 'Cash', 1450.00, 0.00),
    ('DON-20251220', 'Donations', 0.00, 1450.00),
    ('DON-20251227', 'Cash', 1650.00, 0.00),
    ('DON-20251227', 'Donations', 0.00, 1650.00),
    ('DON-20260103', 'Cash', 870.00, 0.00),
    ('DON-20260103', 'Donations', 0.00, 870.00),
    ('DON-20260110', 'Cash', 1020.00, 0.00),
    ('DON-20260110', 'Donations', 0.00, 1020.00),
    ('DON-20260117', 'Cash', 1360.00, 0.00),
    ('DON-20260117', 'Donations', 0.00, 1360.00),
    ('DON-20260124', 'Cash', 970.00, 0.00),
    ('DON-20260124', 'Donations', 0.00, 970.00),
    ('DON-20260131', 'Cash', 560.00, 0.00),
    ('DON-20260131', 'Donations', 0.00, 560.00),
    ('DON-20260207', 'Cash', 1120.00, 0.00),
    ('DON-20260207', 'Donations', 0.00, 1120.00),
    ('DON-20260214', 'Cash', 560.00, 0.00),
    ('DON-20260214', 'Donations', 0.00, 560.00),
    ('DON-20260221', 'Cash', 650.00, 0.00),
    ('DON-20260221', 'Donations', 0.00, 650.00),
    ('DON-20260228', 'Cash', 1060.00, 0.00),
    ('DON-20260228', 'Donations', 0.00, 1060.00),
    ('DON-20260307', 'Cash', 880.00, 0.00),
    ('DON-20260307', 'Donations', 0.00, 880.00),
    ('DON-20260314', 'Cash', 960.00, 0.00),
    ('DON-20260314', 'Donations', 0.00, 960.00),
    ('DON-20260321', 'Cash', 660.00, 0.00),
    ('DON-20260321', 'Donations', 0.00, 660.00),
    ('DON-20260328', 'Cash', 1020.00, 0.00),
    ('DON-20260328', 'Donations', 0.00, 1020.00),
    ('GOLAK-20251206', 'Cash', 1690.00, 0.00),
    ('GOLAK-20251206', 'GOLAK DONATION', 0.00, 1690.00),
    ('GOLAK-20251213', 'Cash', 1350.00, 0.00),
    ('GOLAK-20251213', 'GOLAK DONATION', 0.00, 1350.00),
    ('GOLAK-20251220A', 'Cash', 1450.00, 0.00),
    ('GOLAK-20251220A', 'GOLAK DONATION', 0.00, 1450.00),
    ('GOLAK-20251220B', 'Cash', 1650.00, 0.00),
    ('GOLAK-20251220B', 'GOLAK DONATION', 0.00, 1650.00),
    ('GOLAK-20260103', 'Cash', 870.00, 0.00),
    ('GOLAK-20260103', 'GOLAK DONATION', 0.00, 870.00),
    ('GOLAK-20260110', 'Cash', 1020.00, 0.00),
    ('GOLAK-20260110', 'GOLAK DONATION', 0.00, 1020.00),
    ('GOLAK-20260117', 'Cash', 1360.00, 0.00),
    ('GOLAK-20260117', 'GOLAK DONATION', 0.00, 1360.00),
    ('GOLAK-20260124', 'Cash', 970.00, 0.00),
    ('GOLAK-20260124', 'GOLAK DONATION', 0.00, 970.00),
    ('GOLAK-20260131', 'Cash', 560.00, 0.00),
    ('GOLAK-20260131', 'GOLAK DONATION', 0.00, 560.00),
    ('GOLAK-20260207', 'Cash', 1120.00, 0.00),
    ('GOLAK-20260207', 'GOLAK DONATION', 0.00, 1120.00),
    ('GOLAK-20260214', 'Cash', 560.00, 0.00),
    ('GOLAK-20260214', 'GOLAK DONATION', 0.00, 560.00),
    ('GOLAK-20260221', 'Cash', 650.00, 0.00),
    ('GOLAK-20260221', 'GOLAK DONATION', 0.00, 650.00),
    ('GOLAK-20260228', 'Cash', 1060.00, 0.00),
    ('GOLAK-20260228', 'GOLAK DONATION', 0.00, 1060.00),
    ('GOLAK-20260307', 'Cash', 880.00, 0.00),
    ('GOLAK-20260307', 'GOLAK DONATION', 0.00, 880.00),
    ('GOLAK-20260314', 'Cash', 960.00, 0.00),
    ('GOLAK-20260314', 'GOLAK DONATION', 0.00, 960.00),
    ('GOLAK-20260321', 'Cash', 660.00, 0.00),
    ('GOLAK-20260321', 'GOLAK DONATION', 0.00, 660.00),
    ('GOLAK-20260328', 'Cash', 1020.00, 0.00),
    ('GOLAK-20260328', 'GOLAK DONATION', 0.00, 1020.00),
    ('XMAS-20251215', 'Ministry Events Expense', 10000.00, 0.00),
    ('XMAS-20251215', 'Cash', 0.00, 10000.00),
    ('XMAS-20251218', 'Ministry Events Expense', 10000.00, 0.00),
    ('XMAS-20251218', 'Cash', 0.00, 10000.00),
    ('XMAS-20251220', 'Ministry Events Expense', 10000.00, 0.00),
    ('XMAS-20251220', 'Cash', 0.00, 10000.00),
    ('XMAS-20251224A', 'Ministry Events Expense', 10000.00, 0.00),
    ('XMAS-20251224A', 'Cash', 0.00, 10000.00),
    ('XMAS-20251224B', 'Ministry Events Expense', 4255.00, 0.00),
    ('XMAS-20251224B', 'Cash', 0.00, 4255.00),
    ('XMAS-20251225A', 'Ministry Events Expense', 200.00, 0.00),
    ('XMAS-20251225A', 'Cash', 0.00, 200.00),
    ('XMAS-20251225B', 'Ministry Events Expense', 9240.00, 0.00),
    ('XMAS-20251225B', 'Cash', 0.00, 9240.00),
    ('XMAS-20251225C', 'Ministry Events Expense', 1205.00, 0.00),
    ('XMAS-20251225C', 'Cash', 0.00, 1205.00),
    ('XMAS-20251225D', 'Ministry Events Expense', 10000.00, 0.00),
    ('XMAS-20251225D', 'Cash', 0.00, 10000.00),
    ('XMAS-20251226', 'Ministry Events Expense', 6000.00, 0.00),
    ('XMAS-20251226', 'Cash', 0.00, 6000.00),
    ('XMAS-SAMBIT-20251225', 'Ministry Events Expense', 5700.00, 0.00),
    ('XMAS-SAMBIT-20251225', 'M/S SAMBIT RAUT', 0.00, 5700.00),
    ('FURN-CHAIRS-20260314', 'FURNITURE', 5250.00, 0.00),
    ('FURN-CHAIRS-20260314', 'Cash', 0.00, 5250.00),
    ('DEP-FURNITURE-20260331', 'Depreciation Expense', 262.00, 0.00),
    ('DEP-FURNITURE-20260331', 'FURNITURE', 0.00, 262.00),
    ('MISC-SWEETS-20260101', 'Miscellaneous Expense', 920.00, 0.00),
    ('MISC-SWEETS-20260101', 'Cash', 0.00, 920.00),
    ('PRINT-STY-20260312', 'Office and Administration Expense', 270.00, 0.00),
    ('PRINT-STY-20260312', 'Cash', 0.00, 270.00),
    ('RENT-20251215', 'Rent Expense', 13000.00, 0.00),
    ('RENT-20251215', 'M/S SAMBIT RAUT', 0.00, 13000.00),
    ('RENT-20260115', 'Rent Expense', 13000.00, 0.00),
    ('RENT-20260115', 'M/S SAMBIT RAUT', 0.00, 13000.00),
    ('RENT-20260215', 'Rent Expense', 13000.00, 0.00),
    ('RENT-20260215', 'M/S SAMBIT RAUT', 0.00, 13000.00),
    ('RENT-20260315', 'Rent Expense', 13000.00, 0.00),
    ('RENT-20260315', 'M/S SAMBIT RAUT', 0.00, 13000.00),
    ('REPAIR-ELEC-20251231', 'Repairs and Maintenance Expense', 1220.00, 0.00),
    ('REPAIR-ELEC-20251231', 'Cash', 0.00, 1220.00),
    ('REPAIR-CABLE-20260227', 'Repairs and Maintenance Expense', 550.00, 0.00),
    ('REPAIR-CABLE-20260227', 'Cash', 0.00, 550.00),
    ('SAL-20260102-RAJWINDER', 'Payroll Expense', 10000.00, 0.00),
    ('SAL-20260102-RAJWINDER', 'M/S SAMBIT RAUT', 0.00, 10000.00),
    ('SAL-20260102-BALVIR', 'Payroll Expense', 7000.00, 0.00),
    ('SAL-20260102-BALVIR', 'M/S SAMBIT RAUT', 0.00, 7000.00),
    ('SAL-20260102-PAWAN', 'Payroll Expense', 7000.00, 0.00),
    ('SAL-20260102-PAWAN', 'M/S SAMBIT RAUT', 0.00, 7000.00),
    ('SAL-20260102-ANKUSH', 'Payroll Expense', 15600.00, 0.00),
    ('SAL-20260102-ANKUSH', 'M/S SAMBIT RAUT', 0.00, 15600.00),
    ('SAL-20260102-SANDEEP', 'Payroll Expense', 6000.00, 0.00),
    ('SAL-20260102-SANDEEP', 'M/S SAMBIT RAUT', 0.00, 6000.00),
    ('SAL-20260102-JOHN', 'Payroll Expense', 5000.00, 0.00),
    ('SAL-20260102-JOHN', 'M/S SAMBIT RAUT', 0.00, 5000.00),
    ('SAL-20260102-LAKSMI', 'Payroll Expense', 5000.00, 0.00),
    ('SAL-20260102-LAKSMI', 'M/S SAMBIT RAUT', 0.00, 5000.00),
    ('SAL-20260110-ANDRIAS', 'Payroll Expense', 20000.00, 0.00),
    ('SAL-20260110-ANDRIAS', 'M/S SAMBIT RAUT', 0.00, 20000.00),
    ('SAL-20260205-RAJWINDER', 'Payroll Expense', 10000.00, 0.00),
    ('SAL-20260205-RAJWINDER', 'M/S SAMBIT RAUT', 0.00, 10000.00),
    ('SAL-20260205-BALVIR', 'Payroll Expense', 7000.00, 0.00),
    ('SAL-20260205-BALVIR', 'M/S SAMBIT RAUT', 0.00, 7000.00),
    ('SAL-20260205-PAWAN', 'Payroll Expense', 7000.00, 0.00),
    ('SAL-20260205-PAWAN', 'M/S SAMBIT RAUT', 0.00, 7000.00),
    ('SAL-20260205-ANKUSH', 'Payroll Expense', 15600.00, 0.00),
    ('SAL-20260205-ANKUSH', 'M/S SAMBIT RAUT', 0.00, 15600.00),
    ('SAL-20260205-JOHN', 'Payroll Expense', 5000.00, 0.00),
    ('SAL-20260205-JOHN', 'M/S SAMBIT RAUT', 0.00, 5000.00),
    ('SAL-20260205-SANDEEP', 'Payroll Expense', 6000.00, 0.00),
    ('SAL-20260205-SANDEEP', 'M/S SAMBIT RAUT', 0.00, 6000.00),
    ('SAL-20260205-RUPESH', 'Payroll Expense', 13000.00, 0.00),
    ('SAL-20260205-RUPESH', 'M/S SAMBIT RAUT', 0.00, 13000.00),
    ('SAL-20260205-LAKSHMI', 'Payroll Expense', 5000.00, 0.00),
    ('SAL-20260205-LAKSHMI', 'M/S SAMBIT RAUT', 0.00, 5000.00),
    ('SAL-20260205-ANDRIAS', 'Payroll Expense', 20000.00, 0.00),
    ('SAL-20260205-ANDRIAS', 'M/S SAMBIT RAUT', 0.00, 20000.00),
    ('SAL-20260305-RAJWINDER', 'Payroll Expense', 10000.00, 0.00),
    ('SAL-20260305-RAJWINDER', 'M/S SAMBIT RAUT', 0.00, 10000.00),
    ('SAL-20260305-BALVIR', 'Payroll Expense', 7000.00, 0.00),
    ('SAL-20260305-BALVIR', 'M/S SAMBIT RAUT', 0.00, 7000.00),
    ('SAL-20260305-PAWAN', 'Payroll Expense', 7000.00, 0.00),
    ('SAL-20260305-PAWAN', 'M/S SAMBIT RAUT', 0.00, 7000.00),
    ('SAL-20260305-ANKUSH', 'Payroll Expense', 15600.00, 0.00),
    ('SAL-20260305-ANKUSH', 'M/S SAMBIT RAUT', 0.00, 15600.00),
    ('SAL-20260305-RUPESH', 'Payroll Expense', 13000.00, 0.00),
    ('SAL-20260305-RUPESH', 'M/S SAMBIT RAUT', 0.00, 13000.00),
    ('SAL-20260305-JOHN', 'Payroll Expense', 5000.00, 0.00),
    ('SAL-20260305-JOHN', 'M/S SAMBIT RAUT', 0.00, 5000.00),
    ('SAL-20260305-SANDEEP', 'Payroll Expense', 6000.00, 0.00),
    ('SAL-20260305-SANDEEP', 'M/S SAMBIT RAUT', 0.00, 6000.00),
    ('SAL-20260305-LAKSHMI', 'Payroll Expense', 5000.00, 0.00),
    ('SAL-20260305-LAKSHMI', 'M/S SAMBIT RAUT', 0.00, 5000.00),
    ('SAL-PAYABLE-20260331', 'Payroll Expense', 76100.00, 0.00),
    ('SAL-PAYABLE-20260331', 'Payroll Payable', 0.00, 76100.00)
)
INSERT INTO public.journal_lines (journal_entry_id, account_id, debit, credit)
SELECT em.journal_entry_id, a.id, sl.debit::numeric(12,2), sl.credit::numeric(12,2)
FROM source_lines sl
JOIN entry_map em ON em.source_key = sl.source_key
JOIN public.accounts a ON lower(a.name) = lower(sl.account_name);

INSERT INTO public.expenses
    (date, description, category, amount, vendor, notes, payroll_person, payroll_month, created_at, updated_at)
VALUES
    ('2025-12-15', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251215]', 'MINISTRY_EVENT', 10000.00, 'Prabhakar Palace', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251215]', NULL, NULL, now(), now()),
    ('2025-12-18', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251218]', 'MINISTRY_EVENT', 10000.00, 'Prabhakar Palace', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251218]', NULL, NULL, now(), now()),
    ('2025-12-20', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251220]', 'MINISTRY_EVENT', 10000.00, 'Prabhakar Palace', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251220]', NULL, NULL, now(), now()),
    ('2025-12-24', 'Cash paid for grocery purchase [FY2025_2026_COST_LOAD] [XMAS-20251224A]', 'MINISTRY_EVENT', 10000.00, NULL, 'Cash paid for grocery purchase [FY2025_2026_COST_LOAD] [XMAS-20251224A]', NULL, NULL, now(), now()),
    ('2025-12-24', 'Cash for disposable items purchase [FY2025_2026_COST_LOAD] [XMAS-20251224B]', 'MINISTRY_EVENT', 4255.00, NULL, 'Cash for disposable items purchase [FY2025_2026_COST_LOAD] [XMAS-20251224B]', NULL, NULL, now(), now()),
    ('2025-12-25', 'Cash paid for grocery purchase [FY2025_2026_COST_LOAD] [XMAS-20251225A]', 'MINISTRY_EVENT', 200.00, NULL, 'Cash paid for grocery purchase [FY2025_2026_COST_LOAD] [XMAS-20251225A]', NULL, NULL, now(), now()),
    ('2025-12-25', 'Cash paid for paneer, milk etc purchase [FY2025_2026_COST_LOAD] [XMAS-20251225B]', 'MINISTRY_EVENT', 9240.00, NULL, 'Cash paid for paneer, milk etc purchase [FY2025_2026_COST_LOAD] [XMAS-20251225B]', NULL, NULL, now(), now()),
    ('2025-12-25', 'Cash paid for rent patila etc [FY2025_2026_COST_LOAD] [XMAS-20251225C]', 'MINISTRY_EVENT', 1205.00, NULL, 'Cash paid for rent patila etc [FY2025_2026_COST_LOAD] [XMAS-20251225C]', NULL, NULL, now(), now()),
    ('2025-12-25', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251225D]', 'MINISTRY_EVENT', 10000.00, 'Prabhakar Palace', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251225D]', NULL, NULL, now(), now()),
    ('2025-12-26', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251226]', 'MINISTRY_EVENT', 6000.00, 'Prabhakar Palace', 'Cash paid as per voucher for Prabhakar Palace rent [FY2025_2026_COST_LOAD] [XMAS-20251226]', NULL, NULL, now(), now()),
    ('2025-12-25', 'Amount received from Sambit Raut and paid for grocery items purchase [FY2025_2026_COST_LOAD] [XMAS-SAMBIT-20251225]', 'MINISTRY_EVENT', 5700.00, 'SAMBIT RAUT', 'Amount received from Sambit Raut and paid for grocery items purchase [FY2025_2026_COST_LOAD] [XMAS-SAMBIT-20251225]', NULL, NULL, now(), now()),
    ('2026-03-31', 'Depreciation for year 2025-2026 of furniture [FY2025_2026_COST_LOAD] [DEP-FURNITURE-20260331]', 'DEPRECIATION', 262.00, NULL, 'Depreciation for year 2025-2026 of furniture [FY2025_2026_COST_LOAD] [DEP-FURNITURE-20260331]', NULL, NULL, now(), now()),
    ('2026-01-01', 'C.M 653577 for sweets purchase [FY2025_2026_COST_LOAD] [MISC-SWEETS-20260101]', 'OTHER', 920.00, NULL, 'C.M 653577 for sweets purchase [FY2025_2026_COST_LOAD] [MISC-SWEETS-20260101]', NULL, NULL, now(), now()),
    ('2026-03-12', 'C.M 91 for stationery goods [FY2025_2026_COST_LOAD] [PRINT-STY-20260312]', 'ADMIN', 270.00, NULL, 'C.M 91 for stationery goods [FY2025_2026_COST_LOAD] [PRINT-STY-20260312]', NULL, NULL, now(), now()),
    ('2025-12-15', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20251215]', 'RENT', 13000.00, 'SAMBIT RAUT', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20251215]', NULL, NULL, now(), now()),
    ('2026-01-15', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20260115]', 'RENT', 13000.00, 'SAMBIT RAUT', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20260115]', NULL, NULL, now(), now()),
    ('2026-02-15', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20260215]', 'RENT', 13000.00, 'SAMBIT RAUT', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20260215]', NULL, NULL, now(), now()),
    ('2026-03-15', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20260315]', 'RENT', 13000.00, 'SAMBIT RAUT', 'Rent paid by Sambit Raut [FY2025_2026_COST_LOAD] [RENT-20260315]', NULL, NULL, now(), now()),
    ('2025-12-31', 'Cash for electrical goods purchase [FY2025_2026_COST_LOAD] [REPAIR-ELEC-20251231]', 'REPAIR_MAINTENANCE', 1220.00, NULL, 'Cash for electrical goods purchase [FY2025_2026_COST_LOAD] [REPAIR-ELEC-20251231]', NULL, NULL, now(), now()),
    ('2026-02-27', 'C.M 1402 for cable karlin purchase from Calcuta Music House [FY2025_2026_COST_LOAD] [REPAIR-CABLE-20260227]', 'REPAIR_MAINTENANCE', 550.00, 'CALCUTA MUSIC HOUSE', 'C.M 1402 for cable karlin purchase [FY2025_2026_COST_LOAD] [REPAIR-CABLE-20260227]', NULL, NULL, now(), now()),
    ('2026-01-02', 'Amount transferred to RAJWINDER SISTER by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-RAJWINDER]', 'PAYROLL', 10000.00, 'SAMBIT RAUT', 'Amount transferred to RAJWINDER SISTER by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-RAJWINDER]', 'RAJWINDER SISTER', '2026-01', now(), now()),
    ('2026-01-02', 'Amount transferred to BALVIR KUMAR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-BALVIR]', 'PAYROLL', 7000.00, 'SAMBIT RAUT', 'Amount transferred to BALVIR KUMAR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-BALVIR]', 'BALVIR KUMAR', '2026-01', now(), now()),
    ('2026-01-02', 'Amount transferred to PAWAN KUMAR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-PAWAN]', 'PAYROLL', 7000.00, 'SAMBIT RAUT', 'Amount transferred to PAWAN KUMAR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-PAWAN]', 'PAWAN KUMAR', '2026-01', now(), now()),
    ('2026-01-02', 'Amount transferred to ANKUSH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-ANKUSH]', 'PAYROLL', 15600.00, 'SAMBIT RAUT', 'Amount transferred to ANKUSH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-ANKUSH]', 'ANKUSH', '2026-01', now(), now()),
    ('2026-01-02', 'Amount transferred to SANDEEP by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-SANDEEP]', 'PAYROLL', 6000.00, 'SAMBIT RAUT', 'Amount transferred to SANDEEP by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-SANDEEP]', 'SANDEEP', '2026-01', now(), now()),
    ('2026-01-02', 'Amount transferred to JOHN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-JOHN]', 'PAYROLL', 5000.00, 'SAMBIT RAUT', 'Amount transferred to JOHN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-JOHN]', 'JOHN', '2026-01', now(), now()),
    ('2026-01-02', 'Amount transferred to LAKSMI by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-LAKSMI]', 'PAYROLL', 5000.00, 'SAMBIT RAUT', 'Amount transferred to LAKSMI by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260102-LAKSMI]', 'LAKSMI', '2026-01', now(), now()),
    ('2026-01-10', 'Amount transferred to ANDRIAS by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260110-ANDRIAS]', 'PAYROLL', 20000.00, 'SAMBIT RAUT', 'Amount transferred to ANDRIAS by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260110-ANDRIAS]', 'ANDRIAS', '2026-01', now(), now()),
    ('2026-02-05', 'Amount transferred to RAJWINDER SISTER by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-RAJWINDER]', 'PAYROLL', 10000.00, 'SAMBIT RAUT', 'Amount transferred to RAJWINDER SISTER by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-RAJWINDER]', 'RAJWINDER SISTER', '2026-02', now(), now()),
    ('2026-02-05', 'Amount transferred to BALVIR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-BALVIR]', 'PAYROLL', 7000.00, 'SAMBIT RAUT', 'Amount transferred to BALVIR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-BALVIR]', 'BALVIR', '2026-02', now(), now()),
    ('2026-02-05', 'Amount transferred to PAWAN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-PAWAN]', 'PAYROLL', 7000.00, 'SAMBIT RAUT', 'Amount transferred to PAWAN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-PAWAN]', 'PAWAN', '2026-02', now(), now()),
    ('2026-02-05', 'Amount transferred to ANKUSH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-ANKUSH]', 'PAYROLL', 15600.00, 'SAMBIT RAUT', 'Amount transferred to ANKUSH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-ANKUSH]', 'ANKUSH', '2026-02', now(), now()),
    ('2026-02-05', 'Amount transferred to JOHN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-JOHN]', 'PAYROLL', 5000.00, 'SAMBIT RAUT', 'Amount transferred to JOHN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-JOHN]', 'JOHN', '2026-02', now(), now()),
    ('2026-02-05', 'Amount transferred to SANDEEP by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-SANDEEP]', 'PAYROLL', 6000.00, 'SAMBIT RAUT', 'Amount transferred to SANDEEP by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-SANDEEP]', 'SANDEEP', '2026-02', now(), now()),
    ('2026-02-05', 'Amount transferred to RUPESH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-RUPESH]', 'PAYROLL', 13000.00, 'SAMBIT RAUT', 'Amount transferred to RUPESH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-RUPESH]', 'RUPESH', '2026-02', now(), now()),
    ('2026-02-05', 'Amount transferred to LAKSHMI by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-LAKSHMI]', 'PAYROLL', 5000.00, 'SAMBIT RAUT', 'Amount transferred to LAKSHMI by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-LAKSHMI]', 'LAKSHMI', '2026-02', now(), now()),
    ('2026-02-05', 'Amount transferred to ANDRIAS by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-ANDRIAS]', 'PAYROLL', 20000.00, 'SAMBIT RAUT', 'Amount transferred to ANDRIAS by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260205-ANDRIAS]', 'ANDRIAS', '2026-02', now(), now()),
    ('2026-03-05', 'Amount transferred to RAJWINDER SISTER by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-RAJWINDER]', 'PAYROLL', 10000.00, 'SAMBIT RAUT', 'Amount transferred to RAJWINDER SISTER by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-RAJWINDER]', 'RAJWINDER SISTER', '2026-03', now(), now()),
    ('2026-03-05', 'Amount transferred to BALVIR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-BALVIR]', 'PAYROLL', 7000.00, 'SAMBIT RAUT', 'Amount transferred to BALVIR by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-BALVIR]', 'BALVIR', '2026-03', now(), now()),
    ('2026-03-05', 'Amount transferred to PAWAN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-PAWAN]', 'PAYROLL', 7000.00, 'SAMBIT RAUT', 'Amount transferred to PAWAN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-PAWAN]', 'PAWAN', '2026-03', now(), now()),
    ('2026-03-05', 'Amount transferred to ANKUSH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-ANKUSH]', 'PAYROLL', 15600.00, 'SAMBIT RAUT', 'Amount transferred to ANKUSH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-ANKUSH]', 'ANKUSH', '2026-03', now(), now()),
    ('2026-03-05', 'Amount transferred to RUPESH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-RUPESH]', 'PAYROLL', 13000.00, 'SAMBIT RAUT', 'Amount transferred to RUPESH by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-RUPESH]', 'RUPESH', '2026-03', now(), now()),
    ('2026-03-05', 'Amount transferred to JOHN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-JOHN]', 'PAYROLL', 5000.00, 'SAMBIT RAUT', 'Amount transferred to JOHN by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-JOHN]', 'JOHN', '2026-03', now(), now()),
    ('2026-03-05', 'Amount transferred to SANDEEP by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-SANDEEP]', 'PAYROLL', 6000.00, 'SAMBIT RAUT', 'Amount transferred to SANDEEP by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-SANDEEP]', 'SANDEEP', '2026-03', now(), now()),
    ('2026-03-05', 'Amount transferred to LAKSHMI by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-LAKSHMI]', 'PAYROLL', 5000.00, 'SAMBIT RAUT', 'Amount transferred to LAKSHMI by Sambit Raut [FY2025_2026_COST_LOAD] [SAL-20260305-LAKSHMI]', 'LAKSHMI', '2026-03', now(), now()),
    ('2026-03-31', 'Payable salary [FY2025_2026_COST_LOAD] [SAL-PAYABLE-20260331]', 'PAYROLL', 76100.00, 'SALARY PAYABLE', 'Payable salary [FY2025_2026_COST_LOAD] [SAL-PAYABLE-20260331]', NULL, '2026-03', now(), now());

-- Reconcile imported balances against the supplied P&L and Balance Sheet.
DO $$
DECLARE
    income_total numeric(12,2);
    expense_total numeric(12,2);
    cash_balance numeric(12,2);
    fixed_assets numeric(12,2);
BEGIN
    SELECT COALESCE(SUM(jl.credit - jl.debit), 0)
    INTO income_total
    FROM public.journal_lines jl
    JOIN public.accounts a ON a.id = jl.account_id
    JOIN public.journal_entries je ON je.id = jl.journal_entry_id
    WHERE je.description LIKE '%[FY2025_2026_COST_LOAD]%'
      AND a.type = 'INCOME';

    SELECT COALESCE(SUM(jl.debit - jl.credit), 0)
    INTO expense_total
    FROM public.journal_lines jl
    JOIN public.accounts a ON a.id = jl.account_id
    JOIN public.journal_entries je ON je.id = jl.journal_entry_id
    WHERE je.description LIKE '%[FY2025_2026_COST_LOAD]%'
      AND a.type = 'EXPENSE';

    SELECT COALESCE(SUM(jl.debit - jl.credit), 0)
    INTO cash_balance
    FROM public.journal_lines jl
    JOIN public.accounts a ON a.id = jl.account_id
    JOIN public.journal_entries je ON je.id = jl.journal_entry_id
    WHERE je.description LIKE '%[FY2025_2026_COST_LOAD]%'
      AND lower(a.name) = lower('Cash');

    SELECT COALESCE(SUM(jl.debit - jl.credit), 0)
    INTO fixed_assets
    FROM public.journal_lines jl
    JOIN public.accounts a ON a.id = jl.account_id
    JOIN public.journal_entries je ON je.id = jl.journal_entry_id
    WHERE je.description LIKE '%[FY2025_2026_COST_LOAD]%'
      AND a.name IN ('BUILDING A/C', 'FURNITURE', 'MUSIC SYSTEM', 'TENT & CORCKERY');

    IF income_total <> 35661.00 THEN
        RAISE EXCEPTION 'Imported income total % does not match expected 35661.00', income_total;
    END IF;
    IF expense_total <> 440722.00 THEN
        RAISE EXCEPTION 'Imported expense total % does not match expected 440722.00', expense_total;
    END IF;
    IF cash_balance <> 11551.00 THEN
        RAISE EXCEPTION 'Imported cash balance % does not match expected 11551.00', cash_balance;
    END IF;
    IF fixed_assets <> 516988.00 THEN
        RAISE EXCEPTION 'Imported fixed assets % does not match expected 516988.00', fixed_assets;
    END IF;
END $$;

COMMIT;
