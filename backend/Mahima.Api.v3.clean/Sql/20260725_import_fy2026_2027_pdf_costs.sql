-- Imports and reconciles the supplied FY2026-2027 general ledger through 23 August 2026.
-- The FY2025-2026 PDFs reconcile to final_load_fy2025_2026_costs_accounts.sql
-- and are not loaded twice. Safe to rerun: tagged rows are replaced.
-- Formal ledger values take precedence over the handwritten June summary
-- (notably Lakshmi salary: 4,230.60 in the ledger versus rounded 4,230).

BEGIN;

WITH next_version AS (
    SELECT COALESCE(MAX(version), 0) + 1 AS version
    FROM public.accounting_data_snapshots
)
INSERT INTO public.accounting_data_snapshots
    (version, created_at, created_by, source_name, import_mode, before_data, changes)
SELECT
    next_version.version,
    now(),
    current_user,
    'Aug_Fin_Data.pdf, Aug_Fin_Data1.pdf, Monthly Statement.pdf',
    'versioned-pdf-ledger-load',
    jsonb_build_object(
        'accounts', (SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.id), '[]'::jsonb) FROM public.accounts a),
        'journalEntries', (
            SELECT COALESCE(jsonb_agg(entry_snapshot ORDER BY (entry_snapshot->>'id')::bigint), '[]'::jsonb)
            FROM (
                SELECT jsonb_build_object(
                    'id', je.id,
                    'date', je.date,
                    'description', je.description,
                    'createdAt', je.created_at,
                    'lines', COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', jl.id,
                            'accountId', jl.account_id,
                            'debit', jl.debit,
                            'credit', jl.credit
                        ) ORDER BY jl.id
                    ) FILTER (WHERE jl.id IS NOT NULL), '[]'::jsonb)
                ) AS entry_snapshot
                FROM public.journal_entries je
                LEFT JOIN public.journal_lines jl ON jl.journal_entry_id = je.id
                GROUP BY je.id
            ) snapshots
        )
    ),
    '{}'::jsonb
FROM next_version;

INSERT INTO public.accounts (name, type, created_at)
SELECT v.name, v.type, now()
FROM (VALUES
    ('HDFC BANK A/C NO 50100882772080', 'ASSET'),
    ('GOLAK DONATION', 'INCOME'),
    ('BANK INTEREST', 'INCOME'),
    ('M/S SAMBIT RAUT', 'LIABILITY'),
    ('SOMA', 'LIABILITY'),
    ('RAJWINDER KAUR', 'INCOME'),
    ('Payroll Payable', 'LIABILITY'),
    ('Payroll Expense', 'EXPENSE'),
    ('Rent Expense', 'EXPENSE'),
    ('Ministry Events Expense', 'EXPENSE'),
    ('Office and Administration Expense', 'EXPENSE'),
    ('Cash', 'ASSET')
    ,('Opening Balance Equity', 'EQUITY')
    ,('BUILDING A/C', 'ASSET')
    ,('FURNITURE', 'ASSET')
    ,('MUSIC SYSTEM', 'ASSET')
    ,('TENT & CORCKERY', 'ASSET')
    ,('CAPITAL FUND', 'EQUITY')
    ,('EXPS PAYABLE', 'LIABILITY')
    ,('DONATION BY BANK', 'INCOME')
    ,('GROSS PROFIT', 'INCOME')
    ,('CLOSING STOCK', 'ASSET')
) AS v(name, type)
WHERE NOT EXISTS (
    SELECT 1 FROM public.accounts a WHERE lower(a.name) = lower(v.name)
);

UPDATE public.accounts a
SET type = v.type
FROM (VALUES
    ('HDFC BANK A/C NO 50100882772080', 'ASSET'),
    ('GOLAK DONATION', 'INCOME'),
    ('BANK INTEREST', 'INCOME'),
    ('M/S SAMBIT RAUT', 'LIABILITY'),
    ('SOMA', 'LIABILITY'),
    ('RAJWINDER KAUR', 'INCOME'),
    ('Payroll Payable', 'LIABILITY'),
    ('Payroll Expense', 'EXPENSE'),
    ('Rent Expense', 'EXPENSE'),
    ('Ministry Events Expense', 'EXPENSE'),
    ('Office and Administration Expense', 'EXPENSE'),
    ('Cash', 'ASSET')
    ,('Opening Balance Equity', 'EQUITY')
    ,('BUILDING A/C', 'ASSET')
    ,('FURNITURE', 'ASSET')
    ,('MUSIC SYSTEM', 'ASSET')
    ,('TENT & CORCKERY', 'ASSET')
    ,('CAPITAL FUND', 'EQUITY')
    ,('EXPS PAYABLE', 'LIABILITY')
    ,('DONATION BY BANK', 'INCOME')
    ,('GROSS PROFIT', 'INCOME')
    ,('CLOSING STOCK', 'ASSET')
) AS v(name, type)
WHERE lower(a.name) = lower(v.name)
  AND a.type IS DISTINCT FROM v.type;

DELETE FROM public.journal_lines jl
USING public.journal_entries je
WHERE jl.journal_entry_id = je.id
  AND je.description LIKE '%[FY2026_2027_PDF_LOAD]%';

DELETE FROM public.journal_entries
WHERE description LIKE '%[FY2026_2027_PDF_LOAD]%';

WITH source(entry_date, source_key, description, debit_account, credit_account, amount) AS (
    VALUES
    (DATE '2026-04-01','OPEN-BUILDING','Opening balance - Building','BUILDING A/C','Opening Balance Equity',325000.00),
    (DATE '2026-04-01','OPEN-FURNITURE','Opening balance - Furniture','FURNITURE','Opening Balance Equity',76988.00),
    (DATE '2026-04-01','OPEN-MUSIC','Opening balance - Music system','MUSIC SYSTEM','Opening Balance Equity',80000.00),
    (DATE '2026-04-01','OPEN-TENT','Opening balance - Tent and crockery','TENT & CORCKERY','Opening Balance Equity',35000.00),
    (DATE '2026-04-01','OPEN-CASH','Opening balance - Cash in hand','Cash','Opening Balance Equity',13720.00),
    (DATE '2026-04-01','OPEN-CAPITAL','Opening balance - Capital fund','Opening Balance Equity','CAPITAL FUND',150958.00),
    (DATE '2026-04-01','OPEN-SAMBIT','Opening balance - Sambit Raut loan','Opening Balance Equity','M/S SAMBIT RAUT',290500.00),
    (DATE '2026-04-01','OPEN-EXP-PAYABLE','Opening balance - Expenses payable','Opening Balance Equity','EXPS PAYABLE',6150.00),
    (DATE '2026-04-01','OPEN-SAL-PAYABLE','Opening balance - Salary payable','Opening Balance Equity','Payroll Payable',83100.00),
    (DATE '2026-08-23','CLOSING-STOCK-20260823','Closing stock and gross profit per source P&L','CLOSING STOCK','GROSS PROFIT',0.01),
    (DATE '2026-04-05','GOLAK-20260405','Cash offering received','Cash','GOLAK DONATION',3760.00),
    (DATE '2026-04-11','GOLAK-20260411','Cash offering received','Cash','GOLAK DONATION',700.00),
    (DATE '2026-04-18','GOLAK-20260418','Cash offering received','Cash','GOLAK DONATION',910.00),
    (DATE '2026-04-25','GOLAK-20260425','Cash offering received','Cash','GOLAK DONATION',1165.00),
    (DATE '2026-05-02','GOLAK-20260502','Cash offering received','Cash','GOLAK DONATION',1000.00),
    (DATE '2026-05-10','GOLAK-20260510','Cash offering received','Cash','GOLAK DONATION',1900.00),
    (DATE '2026-05-16','GOLAK-20260516','Cash offering received','Cash','GOLAK DONATION',650.00),
    (DATE '2026-05-23','GOLAK-20260523','Cash offering received','Cash','GOLAK DONATION',330.00),
    (DATE '2026-05-30','GOLAK-20260530','Cash offering received','Cash','GOLAK DONATION',840.00),
    (DATE '2026-06-06','GOLAK-20260606','Cash offering received','Cash','GOLAK DONATION',1021.00),
    (DATE '2026-06-13','GOLAK-20260613','Cash offering received','Cash','GOLAK DONATION',2087.00),
    (DATE '2026-06-20','GOLAK-20260620','Cash offering received','Cash','GOLAK DONATION',320.00),
    (DATE '2026-06-27','GOLAK-20260627','Cash offering received','Cash','GOLAK DONATION',1020.00),
    (DATE '2026-07-04','GOLAK-20260704','Cash offering received','Cash','GOLAK DONATION',780.00),
    (DATE '2026-07-12','GOLAK-20260712','Cash offering received','Cash','GOLAK DONATION',1000.00),
    (DATE '2026-07-19','GOLAK-20260719','Cash offering received','Cash','GOLAK DONATION',1040.00),
    (DATE '2026-07-25','GOLAK-20260725','Cash offering received','Cash','GOLAK DONATION',940.00),
    (DATE '2026-08-02','GOLAK-20260802','Cash offering received','Cash','GOLAK DONATION',310.00),
    (DATE '2026-08-09','GOLAK-20260809','Cash offering received','Cash','GOLAK DONATION',4420.00),
    (DATE '2026-08-16','GOLAK-20260816','Cash offering received','Cash','GOLAK DONATION',680.00),
    (DATE '2026-08-23','GOLAK-20260823','Cash offering received','Cash','GOLAK DONATION',590.00),

    (DATE '2026-04-04','MEET-20260404','Cash paid for grocery expenses','Ministry Events Expense','Cash',900.00),
    (DATE '2026-04-11','MEET-20260411','Cash paid for grocery expenses','Ministry Events Expense','Cash',1050.00),
    (DATE '2026-04-18','MEET-20260418','Cash paid for grocery expenses','Ministry Events Expense','Cash',1250.00),
    (DATE '2026-04-25','MEET-20260425','Cash paid for grocery expenses','Ministry Events Expense','Cash',1350.00),
    (DATE '2026-05-02','MEET-20260502','Cash paid for grocery expenses','Ministry Events Expense','Cash',500.00),
    (DATE '2026-05-09','MEET-20260509','Cash paid for grocery expenses','Ministry Events Expense','Cash',3050.00),
    (DATE '2026-05-16','MEET-20260516','Cash paid for grocery expenses','Ministry Events Expense','Cash',700.00),
    (DATE '2026-05-23','MEET-20260523','Cash paid for grocery expenses','Ministry Events Expense','Cash',1060.00),
    (DATE '2026-05-30','MEET-20260530','Cash paid for grocery expenses','Ministry Events Expense','Cash',790.00),
    (DATE '2026-06-06','MEET-20260606','Cash paid for grocery expenses','Ministry Events Expense','Cash',920.00),
    (DATE '2026-06-13','MEET-20260613','Cash paid for grocery expenses','Ministry Events Expense','Cash',1100.00),
    (DATE '2026-06-20','MEET-20260620','Cash paid for grocery expenses','Ministry Events Expense','Cash',680.00),
    (DATE '2026-06-27','MEET-20260627','Cash paid for grocery expenses','Ministry Events Expense','Cash',1150.00),
    (DATE '2026-07-04','MEET-20260704','Cash paid for grocery expenses','Ministry Events Expense','Cash',1050.00),
    (DATE '2026-07-11','MEET-20260711','Cash paid for grocery expenses','Ministry Events Expense','Cash',9050.00),
    (DATE '2026-07-12','MEET-20260712','Cash paid for grocery expenses','Ministry Events Expense','Cash',2100.00),
    (DATE '2026-07-19','MEET-20260719','Cash paid for grocery expenses','Ministry Events Expense','Cash',1215.00),
    (DATE '2026-07-16','MEET-20260716-TENT','Tent charges paid','Ministry Events Expense','HDFC BANK A/C NO 50100882772080',4300.00),
    (DATE '2026-07-25','MEET-20260725','Cash paid for meeting expenses','Ministry Events Expense','Cash',1410.00),
    (DATE '2026-08-02','MEET-20260802','Cash paid for meeting expenses','Ministry Events Expense','Cash',600.00),
    (DATE '2026-08-05','MEET-20260805','Charges paid to Rakesh Kumar','Ministry Events Expense','HDFC BANK A/C NO 50100882772080',900.00),
    (DATE '2026-08-09','MEET-20260809','Cash paid for meeting expenses','Ministry Events Expense','Cash',930.00),
    (DATE '2026-08-12','MEET-20260812-GEN','Generator expenses paid','Ministry Events Expense','HDFC BANK A/C NO 50100882772080',1300.00),
    (DATE '2026-08-12','MEET-20260812-RAKESH','Paid to Rakesh Kumar','Ministry Events Expense','HDFC BANK A/C NO 50100882772080',900.00),
    (DATE '2026-08-16','MEET-20260816','Cash paid for meeting expenses','Ministry Events Expense','Cash',1286.00),
    (DATE '2026-08-23','MEET-20260823','Cash paid for meeting expenses','Ministry Events Expense','Cash',290.00),

    (DATE '2026-04-10','PAYABLE-RAJWINDER','Prior-year salary payable settled for Rajwinder','Payroll Payable','M/S SAMBIT RAUT',10000.00),
    (DATE '2026-04-10','PAYABLE-BALVIR','Prior-year salary payable settled for Balvir','Payroll Payable','M/S SAMBIT RAUT',7000.00),
    (DATE '2026-04-10','PAYABLE-PAWAN','Prior-year salary payable settled for Pawan','Payroll Payable','M/S SAMBIT RAUT',7000.00),
    (DATE '2026-04-10','PAYABLE-ANKUSH','Prior-year salary payable settled for Ankush','Payroll Payable','M/S SAMBIT RAUT',15600.00),
    (DATE '2026-04-10','PAYABLE-JOHN','Prior-year salary payable settled for John','Payroll Payable','M/S SAMBIT RAUT',5000.00),
    (DATE '2026-04-10','PAYABLE-SANDEEP','Prior-year salary payable settled for Sandeep','Payroll Payable','M/S SAMBIT RAUT',6000.00),
    (DATE '2026-04-10','PAYABLE-RUPESH','Prior-year salary payable settled for Rupesh','Payroll Payable','M/S SAMBIT RAUT',13000.00),
    (DATE '2026-04-10','PAYABLE-LAKSHMI','Prior-year salary payable settled for Lakshmi','Payroll Payable','M/S SAMBIT RAUT',5000.00),
    (DATE '2026-04-10','PAYABLE-KULWANT','Prior-year salary payable settled for Kulwant Singh Bunty','Payroll Payable','M/S SAMBIT RAUT',7000.00),

    (DATE '2026-04-15','RENT-20260415','Rent paid by Sambit Raut','Rent Expense','M/S SAMBIT RAUT',13000.00),
    (DATE '2026-05-13','RENT-20260513','Rent paid by Sambit Raut','Rent Expense','M/S SAMBIT RAUT',13000.00),
    (DATE '2026-06-14','RENT-20260614','Rent paid by Sambit Raut','Rent Expense','M/S SAMBIT RAUT',13000.00),
    (DATE '2026-07-15','RENT-20260715','Rent paid by Sambit Raut','Rent Expense','M/S SAMBIT RAUT',13000.00),

    (DATE '2026-05-10','SAL-20260510-RAJWINDER','April salary paid to Rajwinder','Payroll Expense','M/S SAMBIT RAUT',8832.00),
    (DATE '2026-05-10','SAL-20260510-RUPESH','April salary paid to Rupesh','Payroll Expense','M/S SAMBIT RAUT',9000.00),
    (DATE '2026-05-10','SAL-20260510-LAKSHMI','April salary paid to Lakshmi','Payroll Expense','M/S SAMBIT RAUT',4807.00),
    (DATE '2026-05-13','SAL-20260513-KULWANT','April salary paid to Kulwant Singh','Payroll Expense','M/S SAMBIT RAUT',7000.00),
    (DATE '2026-05-13','SAL-20260513-JOHN','April advance paid to John','Payroll Expense','M/S SAMBIT RAUT',2000.00),
    (DATE '2026-05-27','SAL-20260527-BALVIR','April salary paid to Balvir','Payroll Expense','HDFC BANK A/C NO 50100882772080',7000.00),
    (DATE '2026-05-27','SAL-20260527-SANDEEP','April salary paid to Sandeep','Payroll Expense','HDFC BANK A/C NO 50100882772080',5564.00),
    (DATE '2026-05-27','SAL-20260527-PAWAN','April salary paid to Pawan','Payroll Expense','HDFC BANK A/C NO 50100882772080',12000.00),
    (DATE '2026-05-27','SAL-20260527-ANKUSH','April salary paid to Ankush','Payroll Expense','HDFC BANK A/C NO 50100882772080',20000.00),
    (DATE '2026-06-13','SAL-20260613-RAJWINDER','May salary paid to Rajwinder','Payroll Expense','HDFC BANK A/C NO 50100882772080',8832.00),
    (DATE '2026-06-13','SAL-20260613-RUPESH','May salary paid to Rupesh','Payroll Expense','HDFC BANK A/C NO 50100882772080',13000.00),
    (DATE '2026-06-13','SAL-20260613-LAKSHMI','May salary paid to Lakshmi','Payroll Expense','HDFC BANK A/C NO 50100882772080',4800.00),
    (DATE '2026-06-19','SAL-20260619-KULWANT','May salary paid to Kulwant Singh Bunty','Payroll Expense','HDFC BANK A/C NO 50100882772080',7000.00),
    (DATE '2026-07-10','SAL-20260710-JOHN','Advance paid to John','Payroll Expense','M/S SAMBIT RAUT',2700.00),
    (DATE '2026-07-11','SAL-20260711-RAJWINDER','June salary paid to Rajwinder','Payroll Expense','HDFC BANK A/C NO 50100882772080',9600.00),
    (DATE '2026-07-11','SAL-20260711-RUPESH','June salary paid to Rupesh','Payroll Expense','HDFC BANK A/C NO 50100882772080',13000.00),
    (DATE '2026-07-11','SAL-20260711-LAKSHMI','June salary paid to Lakshmi','Payroll Expense','HDFC BANK A/C NO 50100882772080',4230.60),
    (DATE '2026-07-11','SAL-20260711-BALVIR','May salary paid to Balvir','Payroll Expense','HDFC BANK A/C NO 50100882772080',7000.00),
    (DATE '2026-07-15','SAL-20260715-JOHN','Advance paid to John','Payroll Expense','M/S SAMBIT RAUT',1000.00),
    (DATE '2026-08-01','SAL-20260801-RUPESH','Rupesh salary payment','Payroll Expense','HDFC BANK A/C NO 50100882772080',1.00),
    (DATE '2026-08-11','SAL-20260811-KULWANT','July salary paid to Kulwant Singh','Payroll Expense','HDFC BANK A/C NO 50100882772080',9200.00),
    (DATE '2026-08-11','SAL-20260811-RAJWINDER','July salary paid to Rajwinder','Payroll Expense','HDFC BANK A/C NO 50100882772080',10000.00),
    (DATE '2026-08-11','SAL-20260811-LAKSHMI','July salary paid to Lakshmi','Payroll Expense','HDFC BANK A/C NO 50100882772080',5000.00),
    (DATE '2026-08-12','SAL-20260812-ANKUSH','Salary paid to Ankush','Payroll Expense','HDFC BANK A/C NO 50100882772080',20000.00),
    (DATE '2026-08-12','SAL-20260812-BALVIR','Salary paid to Balvir','Payroll Expense','HDFC BANK A/C NO 50100882772080',7000.00),
    (DATE '2026-08-12','SAL-20260812-RUPESH','July salary paid to Rupesh','Payroll Expense','HDFC BANK A/C NO 50100882772080',13000.00),
    (DATE '2026-08-13','SAL-20260813-JOHN','Salary paid to John','Payroll Expense','HDFC BANK A/C NO 50100882772080',3000.00),
    (DATE '2026-08-13','SAL-20260813-DEEPIKA','Salary paid to Deepika','Payroll Expense','HDFC BANK A/C NO 50100882772080',7000.00),
    (DATE '2026-08-14','SAL-20260814-SANDEEP','Part salary paid to Sandeep','Payroll Expense','HDFC BANK A/C NO 50100882772080',6000.00),

    (DATE '2026-05-16','BANK-20260516-SAMBIT','Cheque received from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',50000.00),
    (DATE '2026-05-23','BANK-20260523-SAMBIT','UPI received from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',1.00),
    (DATE '2026-05-27','BANK-20260527-SOMA','Amount transferred from Sister Soma','HDFC BANK A/C NO 50100882772080','SOMA',100.00),
    (DATE '2026-05-27','BANK-20260527-RAJWINDER','Amount transferred from Sister Soma for Rajwinder','HDFC BANK A/C NO 50100882772080','RAJWINDER KAUR',100.00),
    (DATE '2026-06-13','BANK-20260613A-SAMBIT','UPI received from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',1.00),
    (DATE '2026-06-13','BANK-20260613B-SAMBIT','UPI received from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',25000.00),
    (DATE '2026-06-19','BANK-20260619-SAMBIT','UPI received from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',5000.00),
    (DATE '2026-06-26','BANK-20260626-SAMBIT','UPI received from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',1.00),
    (DATE '2026-07-01','BANK-INTEREST-20260701','Interest received from HDFC Bank','HDFC BANK A/C NO 50100882772080','BANK INTEREST',51.00),
    (DATE '2026-07-09','PRINT-20260709','Pamphlet printing paid from Soma account','Office and Administration Expense','SOMA',4988.00),
    (DATE '2026-07-11','BANK-20260711A-SAMBIT','UPI received from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',30000.00),
    (DATE '2026-07-11','BANK-20260711B-SAMBIT','UPI received from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',5000.00)
    ,(DATE '2026-07-16','BANK-20260716-SAMBIT','Amount transferred from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',2000.00)
    ,(DATE '2026-08-11','BANK-20260811-SAMBIT','Amount transferred from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',50000.00)
    ,(DATE '2026-08-12','BANK-20260812-SAMBIT','Amount transferred from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',40000.00)
    ,(DATE '2026-08-14','BANK-20260814-SAMBIT','Amount transferred from Sambit Raut','HDFC BANK A/C NO 50100882772080','M/S SAMBIT RAUT',3000.00)
    ,(DATE '2026-08-11','DONATION-20260811-LAKSHMI','Donation received from Lakshmi','HDFC BANK A/C NO 50100882772080','DONATION BY BANK',500.00)
    ,(DATE '2026-08-12','DONATION-20260812-RAJWINDER','Donation received from Rajwinder','HDFC BANK A/C NO 50100882772080','DONATION BY BANK',2000.00)
    ,(DATE '2026-08-16','DONATION-20260816A','Donation received by bank','HDFC BANK A/C NO 50100882772080','DONATION BY BANK',100.00)
    ,(DATE '2026-08-16','DONATION-20260816B','Donation received by bank','HDFC BANK A/C NO 50100882772080','DONATION BY BANK',100.00)
    ,(DATE '2026-08-12','RENT-20260812','Rent paid','Rent Expense','HDFC BANK A/C NO 50100882772080',13000.00)
),
created AS (
    INSERT INTO public.journal_entries(date, description, created_at)
    SELECT
        entry_date::timestamp with time zone,
        description || ' [FY2026_2027_PDF_LOAD] [' || source_key || ']',
        now()
    FROM source
    RETURNING id, description
),
mapped AS (
    SELECT c.id, s.debit_account, s.credit_account, s.amount
    FROM created c
    JOIN source s ON c.description LIKE '%[' || s.source_key || ']%'
),
lines AS (
    SELECT id, debit_account AS account_name, amount AS debit, 0.00::numeric AS credit FROM mapped
    UNION ALL
    SELECT id, credit_account AS account_name, 0.00::numeric AS debit, amount AS credit FROM mapped
)
INSERT INTO public.journal_lines(journal_entry_id, account_id, debit, credit)
SELECT l.id, a.id, l.debit, l.credit
FROM lines l
JOIN public.accounts a ON lower(a.name) = lower(l.account_name);

UPDATE public.accounting_data_snapshots
SET changes = jsonb_build_object(
    'inserted', (SELECT COUNT(*) FROM public.journal_entries WHERE description LIKE '%[FY2026_2027_PDF_LOAD]%'),
    'updated', 0,
    'deleted', 0,
    'skipped', 0,
    'sourceDocuments', 3,
    'reconciledThrough', '2026-08-23',
    'sourcePnlExpense', 337385.60,
    'sourcePnlIncome', 28314.01,
    'sourceNetLoss', 309071.59,
    'sourceClosingCash', 6752.00,
    'sourceClosingBank', 326.40,
    'sourceBalanceSheetDifference', 0.01
)
WHERE version = (SELECT MAX(version) FROM public.accounting_data_snapshots);

COMMIT;
