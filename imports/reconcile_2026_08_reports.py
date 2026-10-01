"""Extract and reconcile the supplied ledger; does not write to the live app."""
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'imports' / '2026-08-report-reconciliation'
OUT.mkdir(exist_ok=True)
text = (ROOT / 'tmp/pdfs/cost-reconciliation/ledger.txt').read_text(encoding='utf-8')
money = r'(?:[\d,]+\.\d{2}|-)'
row_re = re.compile(rf'^(\d{{2}}/\d{{2}}/\d{{4}}) ([CJ]-\d+) (.*?) ({money}) ({money}) ([\d,]+\.\d{{2}}) (Dr\.|Cr\.)$')
opening_re = re.compile(rf'^Opening Balance ({money}) ({money}) ([\d,]+\.\d{{2}}) (Dr\.|Cr\.)$')
total_re = re.compile(r'^Total : ([\d,]+\.\d{2}) ([\d,]+\.\d{2}) ([\d,]+\.\d{2}) (Dr\.|Cr\.)$')
def amount(value):
    return Decimal(value.replace(',', '')) if value != '-' else Decimal('0')

rows, openings, totals = [], {}, {}
account, page, pending = None, 0, None
for line in text.splitlines():
    line = line.strip()
    if not line:
        continue
    if line.startswith('--- PAGE '):
        page = int(line.split()[2]); pending = None; continue
    if line.startswith('Ledger of '):
        account = line.split('Ledger of ', 1)[1].split(' From ')[0]; pending = None; continue
    match = row_re.match(line)
    if match:
        date, voucher, narration, debit, credit, balance, side = match.groups()
        pending = dict(account=account, date=datetime.strptime(date, '%d/%m/%Y').date().isoformat(),
                       voucher=voucher, narration=narration, debit=amount(debit), credit=amount(credit),
                       running_balance=amount(balance) * (1 if side == 'Dr.' else -1), page=page)
        rows.append(pending); continue
    match = opening_re.match(line)
    if match:
        debit, credit, _, _ = match.groups()
        openings[account] = amount(debit) - amount(credit); pending = None; continue
    match = total_re.match(line)
    if match:
        debit, credit, balance, side = match.groups()
        totals[account] = (amount(debit), amount(credit), amount(balance) * (1 if side == 'Dr.' else -1))
        pending = None; continue
    if re.match(r'^\d{2}/\d{2}/\d{4}', line):
        raise ValueError(f'Unparsed financial row: {line}')
    if line.startswith(('Balance ', 'Dated ', 'GENERAL ', 'Ledger General', 'Page ', 'MAHIMA ', 'UNIVERSAL ')):
        pending = None; continue
    if pending:
        pending['narration'] += ' ' + line

for account, (dr, cr, closing) in totals.items():
    entries = [r for r in rows if r['account'] == account]
    opening = openings.get(account, Decimal(0))
    assert sum((r['debit'] for r in entries), max(opening, 0)) == dr, account
    assert sum((r['credit'] for r in entries), max(-opening, 0)) == cr, account
    running = opening
    for r in entries:
        running += r['debit'] - r['credit']
        assert running == r['running_balance'], (account, r)
    assert running == closing, account

# Group both sides of each voucher instead of importing each account ledger twice.
groups = defaultdict(list)
for r in rows:
    groups[(r['date'], r['voucher'])].append(r)

notes = [
    'Reports cover 2026-04-01 through 2026-08-31; September records must be preserved.',
    'P&L adds 0.01 closing-stock income absent from the ledger and balance-sheet assets. '
    'Source balance-sheet totals disagree: 521316.41 versus 521316.40. Treatment awaits user selection.',
    'Cash ledger is omitted. Cash counterpart entries and opening cash 13720.00 are inferred '
    'from cash vouchers, opening trial balance, and closing cash 4002.00.',
    'Printing 4988.00 on 2026-07-09 is voucher J-1 in Printing & Sty, but J-2 in Soma. '
    'They are paired once by date and exact amount; both original references are retained.',
    'Golak voucher 2026-08-23 C-3 says CASH RECVD but DEBITS donation 2460.00. '
    'Preserve the printed debit direction (donation reversal); do not treat it as extra income.',
    'Salary payable opening 83100.00 less settlements 75600.00 equals 7500.00. '
    'These settlements are separate from salary expense 227566.60.',
]

print_a = groups.pop(('2026-07-09', 'J-1'))
print_b = groups.pop(('2026-07-09', 'J-2'))
assert len(print_a) == len(print_b) == 1
assert print_a[0]['account'] == 'PRINTING & STY' and print_a[0]['debit'] == Decimal('4988')
assert print_b[0]['account'] == 'SOMA' and print_b[0]['credit'] == Decimal('4988')
groups[('2026-07-09', 'J-1/J-2')] = print_a + print_b

journals = []
for (date, voucher), entries in sorted(groups.items()):
    lines = [dict(account=r['account'], debit=r['debit'], credit=r['credit']) for r in entries]
    difference = sum((r['debit'] - r['credit'] for r in lines), Decimal(0))
    inferred = False
    if difference:
        assert voucher.startswith('C-') and len(entries) == 1, (date, voucher, entries)
        lines.append(dict(account='CASH IN HAND', debit=max(-difference, 0), credit=max(difference, 0)))
        inferred = True
    assert sum(r['debit'] for r in lines) == sum(r['credit'] for r in lines)
    journals.append(dict(source_key=f'Ledger-1:{date}:{voucher}', date=date, voucher=voucher,
                         description=entries[0]['narration'], lines=lines,
                         cash_counterpart_inferred=inferred,
                         source_references=[dict(page=r['page'], account=r['account'], voucher=r['voucher']) for r in entries]))

opening_cash = -sum(openings.values())
assert opening_cash == Decimal('13720')
openings['CASH IN HAND'] = opening_cash
balances = defaultdict(Decimal, openings)
for journal in journals:
    for line in journal['lines']:
        balances[line['account']] += line['debit'] - line['credit']
assert balances['CASH IN HAND'] == Decimal('4002')
assert sum(balances.values()) == 0
expense_accounts = ['MEETING EXPS', 'PRINTING & STY', 'RENT', 'SALARY A/C']
income_accounts = ['BANK INTEREST', 'DONATION BY BANK', 'GOLAK DONATION', 'RAJWINDER KAUR']
expenses = sum(balances[a] for a in expense_accounts)
income = -sum(balances[a] for a in income_accounts)
assert expenses == Decimal('337675.60')
assert income == Decimal('25854')
assert expenses - income == Decimal('311821.60')
payload = dict(status='PREPARED_ONLY_NOT_APPLIED', period=dict(from_date='2026-04-01', to_date='2026-08-31'),
               source_ledger_rows=len(rows), opening_balances=openings, journals=journals,
               closing_balances_debit_positive=dict(balances),
               income=income, expenses=expenses, ledger_net_loss=expenses-income, notes=notes)
(OUT / 'source-ledger-reconciled.json').write_text(json.dumps(payload, indent=2, default=str), encoding='utf-8')
print(json.dumps(dict(source_rows=len(rows), vouchers=len(journals), accounts=len(balances),
                     income=income, expenses=expenses, net_loss=expenses-income,
                     opening_cash=opening_cash, cash_closing=balances['CASH IN HAND'],
                     balances=dict(balances)), indent=2, default=str))
