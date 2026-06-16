BEGIN;

-- Append-only import for FY 2025-26 PDF statements.
-- Scope: Dec 2025 through Mar 2026.
-- This script does not delete or update existing April/May 2026 data.

CREATE TEMP TABLE import_accounts (
    name text PRIMARY KEY,
    type text NOT NULL
) ON COMMIT DROP;

INSERT INTO import_accounts (name, type) VALUES
    ('Cash', 'ASSET'),
    ('Capital Fund', 'EQUITY'),
    ('Donations', 'INCOME'),
    ('Ministry Events Expense', 'EXPENSE'),
    ('Repairs and Maintenance Expense', 'EXPENSE'),
    ('Office and Administration Expense', 'EXPENSE'),
    ('Miscellaneous Expense', 'EXPENSE'),
    ('Depreciation Expense', 'EXPENSE'),
    ('Fixed Assets', 'ASSET'),
    ('M/S SAMBIT RAUT', 'LIABILITY')
ON CONFLICT (name) DO NOTHING;

INSERT INTO accounts (name, type, created_at)
SELECT ia.name, ia.type, now()
FROM import_accounts ia
WHERE NOT EXISTS (
    SELECT 1 FROM accounts a WHERE lower(a.name) = lower(ia.name)
);

CREATE TEMP TABLE import_expenses (
    expense_date date NOT NULL,
    description text NOT NULL,
    category varchar(64) NOT NULL,
    amount numeric(12,2) NOT NULL,
    source text NOT NULL,
    detail text NOT NULL
) ON COMMIT DROP;

INSERT INTO import_expenses (expense_date, description, category, amount, source, detail) VALUES
    ('2025-12-24', 'Christmas meeting - disposable purchase', 'MINISTRY_EVENT', 4255.00, 'acstatement christmas.pdf', 'DISPOSBLE PURCHASE'),
    ('2025-12-24', 'Christmas meeting - cash paid', 'MINISTRY_EVENT', 9800.00, 'acstatement christmas.pdf', 'CASH PAID voucher 3C'),
    ('2025-12-25', 'Christmas meeting - rent of patila etc', 'MINISTRY_EVENT', 1205.00, 'acstatement christmas.pdf', 'FOR RENT OF PATILA ETC'),
    ('2025-12-25', 'Christmas meeting - cash paid', 'MINISTRY_EVENT', 9361.00, 'acstatement christmas.pdf', 'CASH PAID voucher 2C'),
    ('2025-12-25', 'Christmas meeting expense funded by Sambit Raut', 'MINISTRY_EVENT', 45000.00, 'acstatement christmas.pdf', 'AMT RECVD FROM SAMBIT RAUT, journal 3J'),
    ('2025-12-31', 'Repair and maintenance - electric goods', 'UTILITIES', 1220.00, 'acstatement repair.pdf', 'CASH PURCHASE FOR ELEC GOODS'),
    ('2026-01-01', 'Miscellaneous expense - sweets purchase', 'OTHER', 920.00, 'acstatement cash in hand.pdf; tpl-1.pdf', 'CASH PURCHASE FOR SWEETS / P&L misc expense'),
    ('2026-02-27', 'Repair and maintenance - C.M 1402', 'UTILITIES', 550.00, 'acstatement repair.pdf', 'C.M 1402'),
    ('2026-03-12', 'Printing and stationery purchase', 'ADMIN', 270.00, 'acstatement sty.pdf', 'C.M 91 FOR STY PURCHASE'),
    ('2026-03-14', 'Furniture - chair purchase for church', 'ADMIN', 5250.00, 'acstatement furniture.pdf', 'Fixed asset purchase; journalized to Fixed Assets'),
    ('2026-03-31', 'Depreciation for FY 2025-2026', 'OTHER', 262.00, 'acstatement furniture.pdf; depchart-1.pdf', 'DEPR. FOR YEAR 2025-2026');

INSERT INTO expenses (
    description,
    category,
    amount,
    date,
    vendor,
    notes,
    payroll_person,
    payroll_month,
    created_at,
    updated_at,
    created_by_user_id
)
SELECT
    ie.description,
    ie.category,
    ie.amount,
    ie.expense_date,
    NULL,
    'Imported from FY2025-26 PDF statements on 2026-05-27; source=' || ie.source || '; detail=' || ie.detail,
    NULL,
    NULL,
    now(),
    now(),
    NULL
FROM import_expenses ie
WHERE NOT EXISTS (
    SELECT 1
    FROM expenses e
    WHERE e.date = ie.expense_date
      AND e.amount = ie.amount
      AND e.description = ie.description
      AND coalesce(e.notes, '') LIKE '%Imported from FY2025-26 PDF statements on 2026-05-27%'
);

CREATE TEMP TABLE import_journals (
    entry_date timestamptz NOT NULL,
    description text NOT NULL,
    debit_account text NOT NULL,
    credit_account text NOT NULL,
    amount numeric(12,2) NOT NULL
) ON COMMIT DROP;

INSERT INTO import_journals (entry_date, description, debit_account, credit_account, amount) VALUES
    ('2025-12-03 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Cash received from Sambit Raut as capital fund, source=acstatement capital fund.pdf', 'Cash', 'Capital Fund', 65000.00),
    ('2025-12-06 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=1691.00', 'Cash', 'Donations', 1691.00),
    ('2025-12-13 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=1350.00', 'Cash', 'Donations', 1350.00),
    ('2025-12-20 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=1450.00', 'Cash', 'Donations', 1450.00),
    ('2025-12-27 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=1650.00', 'Cash', 'Donations', 1650.00),
    ('2026-01-03 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=870.00', 'Cash', 'Donations', 870.00),
    ('2026-01-10 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=1020.00', 'Cash', 'Donations', 1020.00),
    ('2026-01-17 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=1360.00', 'Cash', 'Donations', 1360.00),
    ('2026-01-24 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=970.00', 'Cash', 'Donations', 970.00),
    ('2026-01-31 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=560.00', 'Cash', 'Donations', 560.00),
    ('2026-02-07 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=1120.00', 'Cash', 'Donations', 1120.00),
    ('2026-02-14 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=560.00', 'Cash', 'Donations', 560.00),
    ('2026-02-21 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=650.00', 'Cash', 'Donations', 650.00),
    ('2026-02-28 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=1060.00', 'Cash', 'Donations', 1060.00),
    ('2026-03-07 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=880.00', 'Cash', 'Donations', 880.00),
    ('2026-03-14 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=960.00', 'Cash', 'Donations', 960.00),
    ('2026-03-21 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=660.00', 'Cash', 'Donations', 660.00),
    ('2026-03-28 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Donation received, source=acstatement donation.pdf, amount=1020.00', 'Cash', 'Donations', 1020.00),
    ('2025-12-24 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Christmas meeting disposable purchase, source=acstatement christmas.pdf', 'Ministry Events Expense', 'Cash', 4255.00),
    ('2025-12-24 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Christmas meeting cash paid voucher 3C, source=acstatement christmas.pdf', 'Ministry Events Expense', 'Cash', 9800.00),
    ('2025-12-25 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Christmas meeting rent of patila etc, source=acstatement christmas.pdf', 'Ministry Events Expense', 'Cash', 1205.00),
    ('2025-12-25 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Christmas meeting cash paid voucher 2C, source=acstatement christmas.pdf', 'Ministry Events Expense', 'Cash', 9361.00),
    ('2025-12-25 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Christmas meeting expense funded by Sambit Raut loan, source=acstatement christmas.pdf', 'Ministry Events Expense', 'M/S SAMBIT RAUT', 45000.00),
    ('2025-12-31 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Repair and maintenance electric goods, source=acstatement repair.pdf', 'Repairs and Maintenance Expense', 'Cash', 1220.00),
    ('2026-01-01 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Miscellaneous sweets purchase, source=acstatement cash in hand.pdf', 'Miscellaneous Expense', 'Cash', 920.00),
    ('2026-02-27 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Repair and maintenance C.M 1402, source=acstatement repair.pdf', 'Repairs and Maintenance Expense', 'Cash', 550.00),
    ('2026-03-12 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Printing and stationery purchase, source=acstatement sty.pdf', 'Office and Administration Expense', 'Cash', 270.00),
    ('2026-03-14 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Chair purchase for church, source=acstatement furniture.pdf', 'Fixed Assets', 'Cash', 5250.00),
    ('2026-03-31 00:00:00+00', 'Imported from FY2025-26 PDF statements on 2026-05-27; Depreciation for FY 2025-2026, source=acstatement furniture.pdf; depchart-1.pdf', 'Depreciation Expense', 'Fixed Assets', 262.00);

INSERT INTO journal_entries (date, description, created_at)
SELECT DISTINCT ij.entry_date, ij.description, now()
FROM import_journals ij
WHERE NOT EXISTS (
    SELECT 1 FROM journal_entries je WHERE je.description = ij.description
);

INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
SELECT je.id, a.id, ij.amount, 0.00
FROM import_journals ij
JOIN journal_entries je ON je.description = ij.description
JOIN accounts a ON lower(a.name) = lower(ij.debit_account)
WHERE NOT EXISTS (
    SELECT 1
    FROM journal_lines jl
    WHERE jl.journal_entry_id = je.id
      AND jl.account_id = a.id
      AND jl.debit = ij.amount
      AND jl.credit = 0.00
);

INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
SELECT je.id, a.id, 0.00, ij.amount
FROM import_journals ij
JOIN journal_entries je ON je.description = ij.description
JOIN accounts a ON lower(a.name) = lower(ij.credit_account)
WHERE NOT EXISTS (
    SELECT 1
    FROM journal_lines jl
    WHERE jl.journal_entry_id = je.id
      AND jl.account_id = a.id
      AND jl.debit = 0.00
      AND jl.credit = ij.amount
);

COMMIT;

-- Quick checks after running:
-- SELECT count(*) FROM expenses WHERE notes LIKE '%Imported from FY2025-26 PDF statements on 2026-05-27%';
-- SELECT count(*) FROM journal_entries WHERE description LIKE 'Imported from FY2025-26 PDF statements on 2026-05-27%';
-- SELECT account_name, amount FROM (
--   SELECT 'expense rows total'::text AS account_name, sum(amount) AS amount
--   FROM expenses
--   WHERE notes LIKE '%Imported from FY2025-26 PDF statements on 2026-05-27%'
-- ) x;
