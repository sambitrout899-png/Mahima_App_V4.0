"""Extract and reconcile the supplied ledger; does not write to the live app."""
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp' / 'fin_12_09'
OUT.mkdir(exist_ok=True)
text = (ROOT / 'tmp/fin_12_09/pdf_text.txt').read_text(encoding='utf-8')
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
    if line.startswith('=== PAGE '):
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

groups = defaultdict(list)
for r in rows:
    groups[(r['date'], r['voucher'])].append(r)
pa = groups.pop(('2026-07-09','J-1'))
pb = groups.pop(('2026-07-09','J-2'))
assert len(pa)==len(pb)==1
assert pa[0]['account']=='PRINTING & STY' and pa[0]['debit']==Decimal('4988')
assert pb[0]['account']=='SOMA' and pb[0]['credit']==Decimal('4988')
groups[('2026-07-09','J-1/J-2')] = pa+pb
journals=[]
for (date,voucher), entries in sorted(groups.items()):
    lines=[dict(account=r['account'],debit=r['debit'],credit=r['credit']) for r in entries]
    difference=sum((r['debit']-r['credit'] for r in lines),Decimal(0))
    inferred=bool(difference)
    if inferred:
        assert voucher.startswith('C-') and len(entries)==1,(date,voucher,entries)
        lines.append(dict(account='CASH IN HAND',debit=max(-difference,0),credit=max(difference,0)))
    assert sum(r['debit'] for r in lines)==sum(r['credit'] for r in lines)
    assert len(lines)==2
    journals.append(dict(date=date,voucher=voucher,description=entries[0]['narration'],lines=lines,
                         cash_counterpart_inferred=inferred,pages=sorted(set(r['page'] for r in entries))))
opening_cash=-sum(openings.values())
opening_all=dict(openings,**{'CASH IN HAND':opening_cash})
closing=defaultdict(Decimal,opening_all)
for j in journals:
    for l in j['lines']:
        closing[l['account']]+=l['debit']-l['credit']
assert sum(closing.values())==0
expense_accounts=['EASTER DAY MEETING EXPS','MEETING EXPS','PRINTING & STY','RENT','SALARY A/C']
income_accounts=['BANK INTEREST','DONATION BY BANK','GOLAK DONATION']
expenses=sum(closing[a] for a in expense_accounts)
income=-sum(closing[a] for a in income_accounts)
old=json.loads((ROOT/'imports/2026-08-report-reconciliation/source-ledger-reconciled.json').read_text())
oldj={(j['date'],j['voucher']):j for j in old['journals']}
diff=[]
for j in journals:
    previous=oldj.pop((j['date'],j['voucher']),None)
    def signature(x):
        return sorted((l['account'],str(amount(str(l['debit']))),str(amount(str(l['credit'])))) for l in x['lines'])
    if previous is None or signature(previous)!=signature(j):
        diff.append(dict(date=j['date'],voucher=j['voucher'],old=previous,new=j))
payload=dict(status='SOURCE_VERIFIED_LIVE_COMPARISON_PENDING',source_pdf='Fin_12_09_1.pdf',
    source_rows=len(rows),voucher_count=len(journals),printed_ledger_count=len(totals),
    earliest_date=min(j['date'] for j in journals),latest_date=max(j['date'] for j in journals),
    openings=opening_all,closing=dict(closing),income=income,expenses=expenses,loss=expenses-income,
    rows=rows,journals=journals,changes_from_previous_pdf=diff,removed_from_previous_pdf=list(oldj.values()),
    cash_assumption='Cash ledger omitted. Opening cash is inferred as balancing residual, conditional on completeness of all other opening accounts; cash counterparts inferred for single-sided C vouchers.')
(OUT/'source_analysis.json').write_text(json.dumps(payload,indent=2,default=str),encoding='utf-8')
print(json.dumps({k:v for k,v in payload.items() if k not in ['rows','journals','changes_from_previous_pdf','removed_from_previous_pdf']},indent=2,default=str))
print('Changed/new vouchers:',len(diff),'Removed:',len(oldj))
for d in diff:
    print(d['date'],d['voucher'],'OLD',d['old'] and d['old']['lines'],'NEW',d['new']['lines'])

