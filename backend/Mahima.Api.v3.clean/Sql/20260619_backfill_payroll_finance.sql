-- Backfill payroll runs into Costs and Accounting.
-- Safe to run repeatedly: removes only auto-generated [PAYROLL_RUN:<id>] rows,
-- then recreates paid payroll costs and unpaid payroll payables.

ALTER TABLE public.payroll_runs
    ADD COLUMN IF NOT EXISTS previous_arrears numeric(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payable_amount numeric(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paid_amount numeric(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance_amount numeric(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_status varchar(32) NOT NULL DEFAULT 'UNPAID',
    ADD COLUMN IF NOT EXISTS payment_notes text NULL,
    ADD COLUMN IF NOT EXISTS paid_at_utc timestamp with time zone NULL;

UPDATE public.payroll_runs
SET payable_amount = CASE WHEN payable_amount = 0 THEN net_amount + previous_arrears ELSE payable_amount END,
    balance_amount = CASE
        WHEN balance_amount = 0 AND paid_amount = 0 THEN GREATEST(0, net_amount + previous_arrears)
        ELSE GREATEST(0, payable_amount - paid_amount)
    END,
    payment_status = CASE
        WHEN COALESCE(paid_amount, 0) <= 0 THEN 'UNPAID'
        WHEN GREATEST(0, COALESCE(payable_amount, net_amount) - COALESCE(paid_amount, 0)) <= 0 THEN 'PAID'
        ELSE 'PARTIAL'
    END
WHERE payable_amount = 0 OR balance_amount = 0 OR payment_status IS NULL OR payment_status = '';

INSERT INTO public.accounts (name, type, created_at)
SELECT v.name, v.type, now()
FROM (VALUES
    ('Payroll Expense', 'EXPENSE'),
    ('Payroll Payable', 'LIABILITY'),
    ('Bank', 'ASSET')
) AS v(name, type)
WHERE NOT EXISTS (
    SELECT 1 FROM public.accounts a WHERE lower(a.name) = lower(v.name)
);

UPDATE public.accounts SET type = 'EXPENSE' WHERE name = 'Payroll Expense';
UPDATE public.accounts SET type = 'LIABILITY' WHERE name = 'Payroll Payable';
UPDATE public.accounts SET type = 'ASSET' WHERE name = 'Bank';

DELETE FROM public.expenses
WHERE notes LIKE '%[PAYROLL_RUN:%';

DELETE FROM public.journal_lines jl
USING public.journal_entries je
WHERE jl.journal_entry_id = je.id
  AND je.description LIKE '%[PAYROLL_RUN:%';

DELETE FROM public.journal_entries
WHERE description LIKE '%[PAYROLL_RUN:%';

WITH run_rows AS (
    SELECT
        pr.id,
        pr.user_id,
        COALESCE(NULLIF(pr.staff_name, ''), u.displayname, u.username, u.email, pr.user_id) AS staff_name,
        pr.from_date,
        pr.to_date,
        to_char(pr.from_date, 'YYYY-MM') AS payroll_month,
        GREATEST(0, CASE WHEN pr.payable_amount > 0 THEN pr.payable_amount ELSE pr.net_amount + pr.previous_arrears END) AS payable,
        LEAST(GREATEST(0, COALESCE(pr.paid_amount, 0)), GREATEST(0, CASE WHEN pr.payable_amount > 0 THEN pr.payable_amount ELSE pr.net_amount + pr.previous_arrears END)) AS paid,
        GREATEST(0, GREATEST(0, CASE WHEN pr.payable_amount > 0 THEN pr.payable_amount ELSE pr.net_amount + pr.previous_arrears END) - LEAST(GREATEST(0, COALESCE(pr.paid_amount, 0)), GREATEST(0, CASE WHEN pr.payable_amount > 0 THEN pr.payable_amount ELSE pr.net_amount + pr.previous_arrears END))) AS balance,
        COALESCE(pr.paid_at_utc::date, now()::date) AS paid_date
    FROM public.payroll_runs pr
    LEFT JOIN public.users u ON u.id::text = pr.user_id
)
INSERT INTO public.expenses
    (description, category, amount, date, vendor, notes, payroll_person, payroll_month, created_at, updated_at)
SELECT
    'Payroll paid - ' || staff_name || ' - ' || payroll_month,
    'PAYROLL',
    paid,
    paid_date,
    staff_name,
    'Auto generated from payroll run ' || id || ' [PAYROLL_RUN:' || id || ']',
    staff_name,
    payroll_month,
    now(),
    now()
FROM run_rows
WHERE paid > 0;

WITH account_ids AS (
    SELECT
        max(id) FILTER (WHERE name = 'Payroll Expense') AS payroll_expense_id,
        max(id) FILTER (WHERE name = 'Payroll Payable') AS payroll_payable_id,
        max(id) FILTER (WHERE name = 'Bank') AS bank_id
    FROM public.accounts
),
run_rows AS (
    SELECT
        pr.id,
        COALESCE(NULLIF(pr.staff_name, ''), u.displayname, u.username, u.email, pr.user_id) AS staff_name,
        pr.from_date,
        pr.to_date,
        to_char(pr.from_date, 'YYYY-MM') AS payroll_month,
        GREATEST(0, CASE WHEN pr.payable_amount > 0 THEN pr.payable_amount ELSE pr.net_amount + pr.previous_arrears END) AS payable,
        LEAST(GREATEST(0, COALESCE(pr.paid_amount, 0)), GREATEST(0, CASE WHEN pr.payable_amount > 0 THEN pr.payable_amount ELSE pr.net_amount + pr.previous_arrears END)) AS paid,
        GREATEST(0, GREATEST(0, CASE WHEN pr.payable_amount > 0 THEN pr.payable_amount ELSE pr.net_amount + pr.previous_arrears END) - LEAST(GREATEST(0, COALESCE(pr.paid_amount, 0)), GREATEST(0, CASE WHEN pr.payable_amount > 0 THEN pr.payable_amount ELSE pr.net_amount + pr.previous_arrears END))) AS balance
    FROM public.payroll_runs pr
    LEFT JOIN public.users u ON u.id::text = pr.user_id
),
created_entries AS (
    INSERT INTO public.journal_entries (date, description, created_at)
    SELECT
        rr.to_date,
        'Payroll run - ' || rr.staff_name || ' - ' || rr.payroll_month || ' [PAYROLL_RUN:' || rr.id || ']',
        now()
    FROM run_rows rr
    WHERE rr.payable > 0
    RETURNING id, description
),
entry_map AS (
    SELECT
        ce.id AS journal_entry_id,
        rr.id AS payroll_run_id,
        rr.payable,
        rr.paid,
        rr.balance
    FROM created_entries ce
    JOIN run_rows rr ON ce.description LIKE '%[PAYROLL_RUN:' || rr.id || ']%'
)
INSERT INTO public.journal_lines (journal_entry_id, account_id, debit, credit)
SELECT em.journal_entry_id, ai.payroll_expense_id, em.payable, 0
FROM entry_map em CROSS JOIN account_ids ai
UNION ALL
SELECT em.journal_entry_id, ai.bank_id, 0, em.paid
FROM entry_map em CROSS JOIN account_ids ai
WHERE em.paid > 0
UNION ALL
SELECT em.journal_entry_id, ai.payroll_payable_id, 0, em.balance
FROM entry_map em CROSS JOIN account_ids ai
WHERE em.balance > 0;
