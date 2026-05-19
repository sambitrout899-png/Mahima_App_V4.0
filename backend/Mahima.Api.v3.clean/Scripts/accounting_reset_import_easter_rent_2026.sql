-- Mahima Accounting Reset + PDF Import
-- Source PDFs:
--   1. acstatement easter day meeting.pdf
--   2. acstatement rent account.pdf
--   3. bsheet.pdf
--
-- This script clears ONLY the Cost/Accounting module tables:
--   public.expenses
--   public.journal_lines
--   public.journal_entries
--   public.accounts
--
-- Then it imports the extracted FY 2026-27 accounting data as double-entry journals.
-- Expected validation after import:
--   Easter Day Meeting Expense = INR 83,800 Dr
--   Rent Expense               = INR 13,000 Dr
--   Unidentified Receipts      = INR 10,085 Cr
--   Net P&L loss               = INR 86,715
--   Cash in Hand               = INR 21,785 Dr
--   Capital Fund               = INR 50,000 Cr
--   Sambit Raut Unsecured Loan = INR 58,500 Cr

BEGIN;

TRUNCATE TABLE
    public.journal_lines,
    public.journal_entries,
    public.accounts,
    public.expenses
RESTART IDENTITY CASCADE;

INSERT INTO public.accounts (name, type, created_at) VALUES
    ('Cash in Hand', 'ASSET', now()),
    ('Capital Fund', 'EQUITY', now()),
    ('Sambit Raut Unsecured Loan', 'LIABILITY', now()),
    ('Easter Day Meeting Expense', 'EXPENSE', now()),
    ('Rent Expense', 'EXPENSE', now()),
    ('Unidentified Receipts / Donations', 'INCOME', now());

CREATE TEMP TABLE _mahima_import_journals
(
    sort_order integer not null,
    entry_date timestamptz not null,
    description text not null,
    debit_account text not null,
    debit_amount numeric(12,2) not null,
    credit_account text not null,
    credit_amount numeric(12,2) not null,
    source_pdf text not null
) ON COMMIT DROP;

INSERT INTO _mahima_import_journals
    (sort_order, entry_date, description, debit_account, debit_amount, credit_account, credit_amount, source_pdf)
VALUES
    (  1, '2026-04-01 00:00:00+00', 'Opening capital fund as per balance sheet', 'Cash in Hand', 50000.00, 'Capital Fund', 50000.00, 'bsheet.pdf'),
    (  2, '2026-04-01 00:00:00+00', 'Unsecured loan from Sambit Raut as per balance sheet', 'Cash in Hand', 58500.00, 'Sambit Raut Unsecured Loan', 58500.00, 'bsheet.pdf'),

    (  3, '2026-04-01 00:00:00+00', 'Easter Day Meeting: Advance paid for palace rent', 'Easter Day Meeting Expense', 10000.00, 'Cash in Hand', 10000.00, 'acstatement easter day meeting.pdf'),
    (  4, '2026-04-03 00:00:00+00', 'Easter Day Meeting: Cash paid for stationery goods', 'Easter Day Meeting Expense', 1650.00, 'Cash in Hand', 1650.00, 'acstatement easter day meeting.pdf'),
    (  5, '2026-04-03 00:00:00+00', 'Easter Day Meeting: Cash for shawl purchase', 'Easter Day Meeting Expense', 1000.00, 'Cash in Hand', 1000.00, 'acstatement easter day meeting.pdf'),
    (  6, '2026-04-04 00:00:00+00', 'Easter Day Meeting: Disposable plate etc purchase', 'Easter Day Meeting Expense', 2790.00, 'Cash in Hand', 2790.00, 'acstatement easter day meeting.pdf'),
    (  7, '2026-04-05 00:00:00+00', 'Easter Day Meeting: Cash for grocery', 'Easter Day Meeting Expense', 1325.00, 'Cash in Hand', 1325.00, 'acstatement easter day meeting.pdf'),
    (  8, '2026-04-05 00:00:00+00', 'Easter Day Meeting: Cash for vegetable purchase', 'Easter Day Meeting Expense', 660.00, 'Cash in Hand', 660.00, 'acstatement easter day meeting.pdf'),
    (  9, '2026-04-05 00:00:00+00', 'Easter Day Meeting: Cash for vegetable purchase', 'Easter Day Meeting Expense', 3485.00, 'Cash in Hand', 3485.00, 'acstatement easter day meeting.pdf'),
    ( 10, '2026-04-05 00:00:00+00', 'Easter Day Meeting: Cash for atta purchase', 'Easter Day Meeting Expense', 1450.00, 'Cash in Hand', 1450.00, 'acstatement easter day meeting.pdf'),
    ( 11, '2026-04-05 00:00:00+00', 'Easter Day Meeting: Cash paid for halwai', 'Easter Day Meeting Expense', 9000.00, 'Cash in Hand', 9000.00, 'acstatement easter day meeting.pdf'),
    ( 12, '2026-04-05 00:00:00+00', 'Easter Day Meeting: Cylinder purchase', 'Easter Day Meeting Expense', 2000.00, 'Cash in Hand', 2000.00, 'acstatement easter day meeting.pdf'),
    ( 13, '2026-04-05 00:00:00+00', 'Easter Day Meeting: Petrol and auto rent', 'Easter Day Meeting Expense', 500.00, 'Cash in Hand', 500.00, 'acstatement easter day meeting.pdf'),
    ( 14, '2026-04-06 00:00:00+00', 'Easter Day Meeting: Sound arrangement', 'Easter Day Meeting Expense', 3500.00, 'Cash in Hand', 3500.00, 'acstatement easter day meeting.pdf'),
    ( 15, '2026-04-06 00:00:00+00', 'Easter Day Meeting: Palace, cylinder, LCD, generator oil and chair charges', 'Easter Day Meeting Expense', 32000.00, 'Cash in Hand', 32000.00, 'acstatement easter day meeting.pdf'),
    ( 16, '2026-04-06 00:00:00+00', 'Easter Day Meeting: Milk, makhan, dahi and cream purchase', 'Easter Day Meeting Expense', 4445.00, 'Cash in Hand', 4445.00, 'acstatement easter day meeting.pdf'),
    ( 17, '2026-04-16 00:00:00+00', 'Easter Day Meeting: Cash for chana dal purchase', 'Easter Day Meeting Expense', 9995.00, 'Cash in Hand', 9995.00, 'acstatement easter day meeting.pdf'),

    ( 18, '2026-04-01 00:00:00+00', 'Rent account: Amount paid for rent', 'Rent Expense', 13000.00, 'Cash in Hand', 13000.00, 'acstatement rent account.pdf'),

    -- The balance sheet shows a P&L loss of INR 86,715.
    -- Expense statements total INR 96,800, therefore INR 10,085 of receipts is needed
    -- to reconcile cash in hand INR 21,785 and the P&L loss.
    ( 19, '2027-03-31 00:00:00+00', 'Unidentified receipts / donations inferred from balance sheet reconciliation', 'Cash in Hand', 10085.00, 'Unidentified Receipts / Donations', 10085.00, 'bsheet.pdf');

DO $$
DECLARE
    r record;
    entry_id bigint;
    debit_account_id bigint;
    credit_account_id bigint;
BEGIN
    FOR r IN
        SELECT *
        FROM _mahima_import_journals
        ORDER BY sort_order
    LOOP
        SELECT id INTO debit_account_id
        FROM public.accounts
        WHERE name = r.debit_account;

        SELECT id INTO credit_account_id
        FROM public.accounts
        WHERE name = r.credit_account;

        IF debit_account_id IS NULL OR credit_account_id IS NULL THEN
            RAISE EXCEPTION 'Import failed: missing account for journal %', r.description;
        END IF;

        INSERT INTO public.journal_entries (date, description, created_at)
        VALUES (r.entry_date, r.description || ' [' || r.source_pdf || ']', now())
        RETURNING id INTO entry_id;

        INSERT INTO public.journal_lines (journal_entry_id, account_id, debit, credit)
        VALUES
            (entry_id, debit_account_id, r.debit_amount, 0.00),
            (entry_id, credit_account_id, 0.00, r.credit_amount);
    END LOOP;
END $$;

-- Validation 1: every journal must balance.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.journal_lines
        GROUP BY journal_entry_id
        HAVING round(sum(debit) - sum(credit), 2) <> 0
    ) THEN
        RAISE EXCEPTION 'Import failed: one or more journal entries are not balanced.';
    END IF;
END $$;

-- Validation 2: final trial balance must balance.
DO $$
DECLARE
    diff numeric(12,2);
BEGIN
    SELECT round(sum(debit) - sum(credit), 2)
    INTO diff
    FROM public.journal_lines;

    IF coalesce(diff, 0) <> 0 THEN
        RAISE EXCEPTION 'Import failed: trial balance difference is %', diff;
    END IF;
END $$;

COMMIT;

-- Review output after import.
SELECT
    a.type,
    a.name,
    round(sum(jl.debit), 2) AS total_debit,
    round(sum(jl.credit), 2) AS total_credit,
    round(sum(jl.debit - jl.credit), 2) AS raw_debit_minus_credit
FROM public.accounts a
LEFT JOIN public.journal_lines jl ON jl.account_id = a.id
GROUP BY a.type, a.name
ORDER BY a.type, a.name;
