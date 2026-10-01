"""Build a reversible proposal from observed live balances and supplied reports.

No live writes. Superseding unmatched existing books requires the user's answer.
"""
from collections import defaultdict
from decimal import Decimal
from pathlib import Path
import json

OUT = Path(__file__).resolve().parent
source = json.loads((OUT / 'source-ledger-reconciled.json').read_text())
baseline = json.loads((OUT / 'live-baseline-paisa.json').read_text())
mapping = {'BUILDING A/C':41, 'CAPITAL FUND':2, 'EXPS PAYABLE':50,
           'FURNITURE':42, 'MUSIC SYSTEM':44, 'SALARY PAYABLE':13,
           'SAMBIT RAUT':35, 'TENT & CORCKERY':45, 'CASH IN HAND':7,
           'MEETING EXPS':26, 'GOLAK DONATION':43, 'RENT':5, 'SALARY A/C':24,
           'HDFC BANK A/C NO 50100882772080':47, 'SOMA':48,
           'RAJWINDER KAUR':46, 'BANK INTEREST':49, 'PRINTING & STY':29,
           'DONATION BY BANK':51}
names = {str(v):k for k,v in mapping.items()}
names.update({'1':'Cash in Hand (legacy)', '3':'Sambit Raut Unsecured Loan (legacy)',
              '4':'Easter Day Meeting Expense', '8':'Bank (legacy)', '11':'Fixed Assets (legacy)',
              '20':'Donations (legacy)', '31':'SISTER SOMA (legacy)', '32':'Repairs and Maintenance Expense',
              '33':'Miscellaneous Expense', '34':'Depreciation Expense',
              '52':'GROSS PROFIT', '53':'CLOSING STOCK', '16':'Opening Balance Equity clearing'})
def cents(value):
    v = Decimal(str(value))*100
    assert v == v.to_integral_value()
    return int(v)
entries = []
def pair(date, description, debit, credit, value, kind):
    assert debit != credit and value > 0
    entries.append(dict(date=date, description=description, debitAccountId=int(debit),
                        creditAccountId=int(credit), amountPaisa=value, kind=kind))
def clearing(date, description, amounts, kind):
    assert sum(amounts.values()) == 0, (date, amounts)
    assert amounts.get('16',0) == 0
    for account, value in sorted(amounts.items(), key=lambda p:int(p[0])):
        if value:
            pair(date, f'{description}; {names.get(account,account)}',
                 account if value>0 else '16', '16' if value>0 else account, abs(value),kind)

previous = {}
for cutoff, balances in sorted(baseline.items()):
    assert sum(balances.values()) == 0, cutoff
    movement = {a:balances.get(a,0)-previous.get(a,0) for a in set(balances)|set(previous)}
    label = ('Reverse superseded brought-forward balances before replacement opening' if cutoff=='2026-03-31'
             else f'Reverse superseded net postings for {cutoff[:7]}; originals retained')
    clearing(cutoff, f'[RECON-202608-V1] {label}', {a:-v for a,v in movement.items()}, 'reversal')
    previous = balances

opening = {str(mapping[a]):cents(v) for a,v in source['opening_balances'].items()}
clearing('2026-03-31','[RECON-202608-V1] Replacement opening carried into 01-Apr-2026 per Ledger -1.pdf; cash inferred and reconciled',opening,'opening')
for journal in source['journals']:
    debit = [l for l in journal['lines'] if cents(l['debit'])>0]
    credit = [l for l in journal['lines'] if cents(l['credit'])>0]
    assert len(debit)==len(credit)==1
    assert cents(debit[0]['debit'])==cents(credit[0]['credit'])
    pages = '/'.join(str(p) for p in sorted(set(r['page'] for r in journal['source_references'])))
    description=f"[RECON-202608-V1] {journal['description']} [Ledger -1.pdf p{pages}; {journal['voucher']}]"
    if journal['cash_counterpart_inferred']:
        description+=' [cash counterpart inferred from source voucher]'
    pair(journal['date'], description,mapping[debit[0]['account']],mapping[credit[0]['account']],cents(debit[0]['debit']),'source')

monthly = []
for cutoff, balances in sorted(baseline.items()):
    projected=defaultdict(int,balances)
    for entry in entries:
        if entry['date']<=cutoff:
            projected[str(entry['debitAccountId'])]+=entry['amountPaisa']
            projected[str(entry['creditAccountId'])]-=entry['amountPaisa']
    expected=defaultdict(int,opening)
    for journal in source['journals']:
        if journal['date']<=cutoff:
            for line in journal['lines']:
                expected[str(mapping[line['account']])]+=cents(line['debit'])-cents(line['credit'])
    assert all(projected[a]==expected[a] for a in set(projected)|set(expected)),cutoff
    assert sum(projected.values())==0
    assert projected['16']==0
    monthly.append(dict(cutoff=cutoff, expectedClosingPaisa=dict(expected)))

expense_ids={'24','26','5','29'}
income_ids={'43','49','51','46'}
closing=monthly[-1]['expectedClosingPaisa']
expense=sum(closing.get(a,0) for a in expense_ids)
income=-sum(closing.get(a,0) for a in income_ids)
assert expense==33767560 and income==2585400
assert expense-income==31182160
counts={kind:sum(e['kind']==kind for e in entries) for kind in ['reversal','opening','source']}
plan=dict(status='PROPOSAL_NOT_APPLIED', supersession_approval='pending',
          rounding_choice='User selected ledger: no 0.01 closing stock or gross profit',
          method='Retain original records; reverse superseded balances and monthly net postings; import supplied opening and 112 source vouchers.',
          prior_period_effect='31 March closing balances are restated to the supplied 1 April opening. Earlier original entries remain.',
          later_period_effect='No journal dated after 31 August is modified; later opening balances inherit the reconciled August close.',
          counts=counts, total_entries=len(entries), account_mapping=mapping,
          entries=entries, monthly_checks=monthly)
(OUT/'restatement-proposal.json').write_text(json.dumps(plan,indent=2),encoding='utf-8')
lines=['# August 2026 reconciliation proposal','',
       'Not applied. Pending confirmation that the supplied reports supersede the existing books through August.', '',
       'The user selected ledger totals without the inconsistent one-paisa stock entry.', '',
       '| Measure | Current April-August | Reconciled |','|---|---:|---:|',
       '| Income | 60,094.01 | 25,854.00 |', '| Expenses | 1,137,489.27 | 337,675.60 |',
       '| Net loss | 1,077,395.26 | 311,821.60 |','',
       '| Account | Current closing debit/(credit) | Reconciled closing debit/(credit) |',
       '|---|---:|---:|']
for a in sorted(set(baseline['2026-08-31'])|set(closing),key=int):
    before=baseline['2026-08-31'].get(a,0); after=closing.get(a,0)
    if before or after:
        lines.append(f'| {names.get(a,a)} | {before/100:,.2f} | {after/100:,.2f} |')
lines+=['','## Method','',plan['method'],'',plan['prior_period_effect'],'',plan['later_period_effect'],'',
        f"Proposed entries: {len(entries)} ({counts['reversal']} reversals, {counts['opening']} opening balances, {counts['source']} source vouchers).",'',
        'Each proposed voucher balances to the paisa. All six monthly closing checks match the reconstructed source ledger.', '',
        '## Source qualifications','']+['- '+n for n in source['notes']]
(OUT/'reconciliation-preview.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps(dict(counts=counts, total=len(entries), monthly_checks=len(monthly)),indent=2))
