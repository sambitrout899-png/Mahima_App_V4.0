"""Prepare a review-only CSV and reconciliation audit. Never connects to the system."""
from collections import Counter, defaultdict
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
import csv
import hashlib
import json

ROOT=Path(__file__).resolve().parents[1]
TMP=ROOT/'tmp/fin_12_09'
OUT=ROOT/'imports/2026-09-12-fin-reconciliation'
OUT.mkdir(parents=True,exist_ok=True)
source=json.loads((TMP/'source_analysis.json').read_text())
live=json.loads((TMP/'live_snapshot.json').read_text())
daily=json.loads((TMP/'live_daily.json').read_text())
occurrences=json.loads((TMP/'live_pdf_occurrences.json').read_text())
assert len(occurrences)==len(source['rows'])==198
accounts={str(a):dict(type=t,name=n) for a,t,n in live['accounts']}
mapping={'BANK INTEREST':49,'BUILDING A/C':41,'CAPITAL FUND':2,'DONATION BY BANK':51,
 'EASTER DAY MEETING EXPS':4,'EXPS PAYABLE':50,'FURNITURE':42,'GOLAK DONATION':43,
 'HDFC BANK A/C NO 50100882772080':47,'MEETING EXPS':26,'MUSIC SYSTEM':44,
 'PRINTING & STY':29,'RENT':5,'SALARY A/C':24,'SALARY PAYABLE':13,
 'SAMBIT RAUT':35,'SOMA':48,'TENT & CORCKERY':45,'CASH IN HAND':7}
def cents(v):
    c=Decimal(str(v))*100
    assert c==c.to_integral_value()
    return int(c)
def money(v): return f'{Decimal(v)/100:,.2f}'
def cell(v): return str(v).replace('|','/').replace('\n',' ')
def balance(v): return f'{money(abs(v))} '+('Dr' if v>0 else 'Cr' if v<0 else '')
def add(target,movement):
    for a,v in movement.items(): target[a]+=v
    return target
source_daily=defaultdict(lambda:defaultdict(int))
for j in source['journals']:
    for l in j['lines']:
        source_daily[j['date']][str(mapping[l['account']])]+=cents(l['debit'])-cents(l['credit'])
source_open={str(mapping[a]):cents(v) for a,v in source['openings'].items()}
assert sum(source_open.values())==0
assert all(sum(v.values())==0 for v in daily.values())
assert all(sum(v.values())==0 for v in source_daily.values())
# Cross-check daily transcription against separately captured monthly controls.
for cutoff,expected in live['monthly'].items():
    actual=defaultdict(int,live['monthly']['2026-03-31'])
    for day,movement in daily.items():
        if day<=cutoff: add(actual,movement)
    assert all(actual[a]==expected.get(a,0) for a in accounts),(cutoff,actual,expected)

delta={}
delta['2026-03-31']={a:source_open.get(a,0)-live['monthly']['2026-03-31'].get(a,0) for a in accounts}
for day in sorted(set(daily)|set(source_daily)):
    delta[day]={a:source_daily[day].get(a,0)-daily.get(day,{}).get(a,0) for a in accounts}
entries=[]
for day,changes in sorted(delta.items()):
    assert sum(changes.values())==0
    assert changes.get('16',0)==0
    for a,v in sorted(changes.items(),key=lambda x:int(x[0])):
        if not v: continue
        kind='Restate opening carried into 01-Apr' if day=='2026-03-31' else 'Align daily net movement'
        desc=f"[FIN1209-V1-{len(entries)+1:03}] {kind}; {accounts[a]['name']}; Fin_12_09_1.pdf; review-only PDF supersession"
        entries.append(dict(Action='insert',EntryId='',Date=day,Description=desc,
            DebitAccountId=a if v>0 else '16',DebitAmount=f'{Decimal(abs(v))/100:.2f}',
            CreditAccountId='16' if v>0 else a,CreditAmount=f'{Decimal(abs(v))/100:.2f}'))

# Simulate every calendar-day close, every account, using integer paisa.
projected=defaultdict(int,live['monthly']['2026-03-31'])
expected=defaultdict(int,source_open)
add(projected,delta['2026-03-31'])
assert all(projected[a]==expected[a] for a in accounts)
checks=[]
day=date(2026,4,1)
while day<=date(2026,8,31):
    key=day.isoformat()
    add(projected,daily.get(key,{}));add(projected,delta.get(key,{}));add(expected,source_daily.get(key,{}))
    assert all(projected[a]==expected[a] for a in accounts),key
    assert sum(projected.values())==0 and projected['16']==0,key
    if key in live['monthly']:checks.append(dict(date=key,expected_closing_paisa=dict(expected)))
    day+=timedelta(days=1)
assert all(projected[str(mapping[a])]==cents(v) for a,v in source['closing'].items())
before=live['monthly']['2026-08-31'];opening=live['monthly']['2026-03-31']
live_exp=sum(before.get(a,0)-opening.get(a,0) for a,v in accounts.items() if v['type']=='EXPENSE')
live_inc=-sum(before.get(a,0)-opening.get(a,0) for a,v in accounts.items() if v['type']=='INCOME')
assert live_exp==113785964 and live_inc==6009401
csvpath=OUT/'Fin_12_09_corrections_REVIEW_ONLY.csv'
headers=['Action','EntryId','Date','Description','DebitAccountId','DebitAmount','CreditAccountId','CreditAmount']
with csvpath.open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=headers);writer.writeheader();writer.writerows(entries)
# Re-read the actual deliverable with the importer's two-line journal semantics.
readback=list(csv.DictReader(csvpath.open(encoding='utf-8-sig',newline='')))
assert readback==entries
actual_adjustments=defaultdict(lambda:defaultdict(int))
for r in readback:
    assert r['Action']=='insert' and r['EntryId']==''
    assert r['DebitAccountId'] in accounts and r['CreditAccountId'] in accounts
    assert r['DebitAccountId']!=r['CreditAccountId']
    assert cents(r['DebitAmount'])==cents(r['CreditAmount'])>0
    date.fromisoformat(r['Date'])
    assert len(r['Description'])<500
    actual_adjustments[r['Date']][r['DebitAccountId']]+=cents(r['DebitAmount'])
    actual_adjustments[r['Date']][r['CreditAccountId']]-=cents(r['CreditAmount'])
for key,expected_delta in delta.items():
    assert all(actual_adjustments[key].get(a,0)==expected_delta[a] for a in accounts),key
plan=dict(status='REVIEW_ONLY_NOT_APPLIED',scope='Daily net movement and closing-balance reconciliation; does not replace original vouchers or make gross turnover identical',
  authority_assumption='PDF supersedes all earlier books through 31-Aug-2026, including unmatched August payroll. Not yet confirmed.',
  cash_assumption=source['cash_assumption'],accounts=accounts,mapping=mapping,
  entries=entries,monthly_checks=checks,opening_target_paisa=source_open,
  live_baseline=live,live_daily_paisa=daily,source_daily_paisa=source_daily,
  final_target_paisa=dict(projected),csv_sha256=hashlib.sha256(csvpath.read_bytes()).hexdigest())
(OUT/'reconciliation_controls.json').write_text(json.dumps(plan,indent=2),encoding='utf-8')

lines=['# Fin_12_09_1.pdf versus live cost module','',
'Prepared 12 September 2026. **Review draft only. Nothing has been imported or changed in the system.**','',
'The attached CSV is a conditional adjustment proposal. It reconciles daily net movements and closing balances to the PDF. It is not a voucher-for-voucher replacement and does not make gross debit/credit turnover, journal count, narration or voucher IDs identical. Do not import until the scope and source questions below are resolved.','',
'## Scope and evidence','',
'- Source: Fin_12_09_1.pdf, all 8 pages. Printed financial-year header: 01-Apr-2026 to 31-Mar-2027. Actual transaction dates: 01-Apr-2026 to 29-Aug-2026. No September transactions are supplied.',
'- Working cutoff: 31-Aug-2026, inferred from the August statement content. The PDF does not explicitly certify completeness through that date.',
'- Live authenticated Mahima cost module inspected on 12-Sep-2026. All 48 account ledgers and 682 rows from 01-Jan-1900 through 31-Aug-2026 were read; 510 rows fall in April-August. All 48 account IDs were read from the journal form without saving.',
'- Live captured gross debits and credits both equal INR 3,976,806.35. The six independently captured month-end control vectors balance exactly, and the daily extraction reproduces all six.',
'- PDF: 198 printed transaction rows, 128 reconstructed vouchers, 18 printed ledgers. Every printed running balance, debit total, credit total and closing balance was recalculated. All pass. Both sides of a voucher were paired once, not imported twice.',
'- 190 of 198 PDF rows have an available live match by account/date/signed amount after allocating occurrences. Eight do not. This is a financial-signature match, not proof of voucher identity: journal IDs are not exposed in the ledger UI. Repeated live signatures are separately flagged below.',
'- The application reported a journal export, but the browser did not produce a retrievable download. The audit therefore uses the visible ledger data, not a claimed journal-ID export.','',
'## Major differences','',
'Period measures below use April-August activity, excluding prior-year expense balances. INR.','',
'| Measure | Live system | PDF-derived | Live minus PDF |','|---|---:|---:|---:|',
f"| Income | {money(live_inc)} | {money(cents(source['income']))} | {money(live_inc-cents(source['income']))} |",
f"| Expenses | {money(live_exp)} | {money(cents(source['expenses']))} | {money(live_exp-cents(source['expenses']))} |",
f"| Net loss | {money(live_exp-live_inc)} | {money(cents(source['loss']))} | {money(live_exp-live_inc-cents(source['loss']))} |",'',
'1. **Fixed assets are doubled by opening imports.** Building 650,000 versus 325,000; furniture 153,976 versus 76,988; music system 160,000 versus 80,000; tent/crockery 70,000 versus 35,000. Combined excess: 516,988. The ledger retains the 2025 purchases and adds the same brought-forward balances again on 01-Apr-2026.',
'2. **Payroll contains both imported salary payments and payroll-run entries.** April-August payroll expense is 865,208.64 versus PDF salary expense of 227,566.60, a difference of 637,642.04. The all-time payroll account balance is 1,174,108.64 because it also includes 308,900 of prior-year expense. Payroll payable is 360,577.74 Cr versus 7,500 Cr. These differences require payroll-basis review, not a blanket conclusion that every unmatched payroll is erroneous.',
'3. **August month-end payroll is absent from this PDF.** Seven payroll runs dated 31-Aug produce 89,685.41 expense, 44,929.00 generic-bank payments, and 44,756.41 additional payable. A separate 0.30 rounding adjustment is also present. PDF salary payments end on 14-Aug and mostly describe July or older salary. The draft reverses the net effect of unmatched payroll to achieve PDF agreement; if these are valid later records they must be retained and the PDF updated instead.',
'4. **Rent contains repeated imports and prior-year carry-forward.** April-August rent is 117,000 versus PDF 65,000, an excess of 52,000. The all-time closing rent account is 169,000 because it includes 52,000 of prior-year expense. The 12-Aug rent payment appears three times at 13,000.',
'5. **HDFC and generic-bank accounts overlap.** HDFC is 5,475.60 Cr instead of PDF 326.40 Dr, a signed difference of 5,802.00. Generic Bank separately holds 195,262.30 Cr. Several July/August payments and receipts have two or three imported copies; August also contains a 74,200 HDFC reclassification.',
'6. **Easter expense already totals 83,800 correctly, but its funding and one date differ.** All 83,800 was credited to legacy Cash in Hand. The PDF credits Sambit Raut for 10,000 on 01-Apr and 3,500 plus 32,000 on 06-Apr (45,500 total), leaving 38,300 cash-funded. The 660 vegetable purchase is dated 05-Apr in the system but 01-Apr in the PDF. Do not add another 83,800 expense.',
'7. **Sambit Raut closing balance is 1,143,942 Cr versus PDF 743,942 Cr**, a 400,000 excess in the mapped account. A separate legacy loan liability of 71,500 is also present. The PDF explicitly records 35,000 cash funding plus the 45,500 direct Easter payments; those four credit-side rows have no matching live financial signature.',
'8. **Golak and other income contain duplicates and classification differences.** Golak April-August net income is 39,343 versus PDF 23,003, a difference of 16,340. The 23-Aug cash offering of 590 appears three times. The PDF debit reversal of 2,460 is absent. The 27-May 100 donation is in RAJWINDER KAUR in the system but DONATION BY BANK in the PDF.',
'9. **The 29-Aug meeting expense of 290 is missing.** The system instead has a separate 7,500 donation on that date, which the PDF does not include. Absence from this PDF does not independently prove that donation invalid.',
'10. **Opening and legacy balances are not comparable without restatement.** Capital Fund is 767,958 Cr versus PDF 150,958 Cr. Prior-year income/expense accounts remain open in the live balance display. The draft explicitly restates 31-Mar-2026 closing balances; this changes prior-year reported totals and must be reviewed.','',
'## Source ambiguities and decisions required','',
'- Confirm whether the PDF is the complete, authoritative replacement through 31-Aug, or whether unmatched real payroll/payments/donations should remain. This changes the correction amounts materially.',
'- Cash ledger is absent. Inferred opening cash is 13,720, the residual required to balance the printed opening accounts. With 58 inferred cash counterparts, closing cash is 702. No negative end-of-day cash balance arises under this reconstruction. These are conditional derived amounts, not a printed cash confirmation.',
'- 23-Aug C-3 in Golak says CASH RECVD but debits donation 2,460. The draft preserves the printed direction, implying a cash outflow/donation reversal. Confirm the intended entry with the statement preparer.',
'- 09-Jul printing of 4,988 is J-1 in Printing & Sty and J-2 in Soma. It is paired once by date and exact amount. Both references remain in the source schedule.',
'- Two 27-May HDFC receipts of 100 (J-1 and J-2) are distinct in the PDF: one credits SOMA and one credits DONATION BY BANK. Likewise the two 16-Aug donations of 100 are distinct. They must not be collapsed merely because amount/date match.',
'- The one-paisa GROSS PROFIT / CLOSING STOCK entry in the system is absent from the new PDF and is removed by the draft; no rounding amount has been invented.',
'- The draft preserves all original journals and all post-August postings. Therefore gross ledger debit/credit totals and voucher lists remain different from the PDF even when daily net movements and closing balances agree. If exact voucher/gross-turnover replacement is required, obtain a retrievable current journal export with EntryIds and prepare an explicit update/delete migration instead.','',
'## Account comparison at 31 August','',
'Balances are signed by Dr/Cr. All-time live balances include prior-year carry-forward. For PDF-absent accounts, zero is a **draft supersession assumption**, not proof that their balances are invalid.','',
'| ID | Live account / PDF account | Live closing | PDF/draft target | Signed adjustment (Dr positive) | Basis |',
'|---|---|---:|---:|---:|---|']
reverse_map={str(v):k for k,v in mapping.items()}
for a,info in sorted(accounts.items(),key=lambda p:int(p[0])):
    target=projected[a];base=before.get(a,0)
    basis='PDF printed' if a in reverse_map and a!='7' else 'Cash inferred' if a=='7' else 'PDF absent; assumed zero' if base else 'Zero; no net change'
    label=info['name']+(f" / {reverse_map[a]}" if a in reverse_map and info['name']!=reverse_map[a] else '')
    lines.append(f'| {a} | {label} | {balance(base)} | {balance(target)} | {money(target-base)} | {basis} |')
lines+=['','## Eight PDF rows without a live account/date/amount match','',
'| PDF page | Date | Voucher | PDF account | Debit | Credit | Finding |','|---:|---|---|---|---:|---:|---|']
reasons={1:'100 is classified to RAJWINDER KAUR in live books',6:'660 exists on 05-Apr instead of 01-Apr',42:'Printed donation reversal is absent',115:'Meeting expense missing',160:'Cash funding credit to Sambit absent',161:'Direct Easter funding credited to legacy cash instead',162:'Direct Easter funding credited to legacy cash instead',163:'Direct Easter funding credited to legacy cash instead'}
for i in live['missing_pdf_row_indices_zero_based']:
    r=source['rows'][i]
    lines.append(f"| {r['page']} | {r['date']} | {r['voucher']} | {r['account']} | {money(cents(r['debit']))} | {money(cents(r['credit']))} | {reasons[i]} |")
lines+=['','## What changed from the previous supplied ledger','',
'The previous saved source schedule is not used as the current system baseline. Comparing it with this new PDF shows 16 added vouchers (15 Easter expense vouchers plus the 35,000 funding receipt) and one reclassification of the 27-May 100 donation. Opening balances are unchanged.',
'Easter expense rises by 83,800, Sambit credit rises by 80,500, and inferred cash falls by 3,300 (4,002 to 702). Donation by Bank rises by 100 while Rajwinder income falls by 100. Total income stays 25,854; loss rises from 311,821.60 to 395,621.60. The old reconciliation proposal must not be reused unchanged.','',
'## Import file and verification','',
f'- File: `{csvpath.name}`. {len(entries)} insert-only adjustment vouchers. No deletes or updates. Each description carries a unique FIN1209-V1 reference.',
'- Account 16 (Opening Balance Equity) is a temporary same-day clearing account for each named account adjustment. Its net movement is exactly zero on every correction date. The amounts come from PDF daily net movement minus observed live daily net movement; no balancing plug is used.',
f"- {sum(r['Date']=='2026-03-31' for r in entries)} adjustments restate the opening at 31-Mar-2026. Remaining corrections are dated on the affected April-August days. Earlier original journals remain, but 31-Mar closing and prior-year P&L change. No correction is dated after 31-Aug.",
'- Validation: CSV round-trip, exact eight-column schema, valid existing account IDs, positive amounts, two-decimal precision, debit=credit for every row, valid dates, and description length limits.',
'- Independent simulation: all 48 accounts agree with the reconstructed source on all 153 calendar-day closes from 01-Apr to 31-Aug, plus opening. All five month-end closes and the final trial balance agree to the paisa. This proves the stated net-balance result under the source assumptions; it does not validate omitted real-world transactions.',
'- Before any import, compare the current ledger to the saved baseline controls. The system changed since the earlier snapshot: generic Bank decreased by 38,929, payroll expense increased by 370.37, and payroll payable decreased by 38,558.63. This CSV was built from the refreshed values.',
'- Import only once after the source decisions are resolved. Blank EntryId inserts are not idempotent, even in Upsert mode. The importer may skip invalid rows while saving valid ones; require zero skipped/errors and the exact planned insert count. Do not retry the whole file after a partial load. The app creates a pre-import snapshot.',
'- Accounting corrections do not modify payroll module run/payment statuses. Posting a restatement while payroll remains authoritative can cause future reconciliation drift. Resolve that basis first.','',
'## Monthly result controls','',
'| Month | Live income | PDF income | Live expense | PDF expense | PDF net loss |','|---|---:|---:|---:|---:|---:|']
previous=live['monthly']['2026-03-31']
for check in checks:
    key=check['date'];curr=live['monthly'][key];month=key[:7]
    si=-sum(v for d,m in source_daily.items() if d.startswith(month) for a,v in m.items() if accounts[a]['type']=='INCOME')
    se=sum(v for d,m in source_daily.items() if d.startswith(month) for a,v in m.items() if accounts[a]['type']=='EXPENSE')
    li=-sum(curr[a]-previous[a] for a in accounts if accounts[a]['type']=='INCOME')
    le=sum(curr[a]-previous[a] for a in accounts if accounts[a]['type']=='EXPENSE')
    lines.append(f'| {month} | {money(li)} | {money(si)} | {money(le)} | {money(se)} | {money(se-si)} |')
    previous=curr
lines+=['','## PDF row audit (all 198 printed transactions)','',
'Live copies count the same account/date/signed amount; Expected copies counts that signature in the PDF. Counts can include legitimate same-value entries, so a repeated signature alone is not definitive proof of a duplicate. Narrative examples above provide supporting evidence. Missing status is allocated by occurrence.','',
'| Page | Date | Voucher | PDF account | Debit | Credit | Live copies | Expected copies | Check |','|---:|---|---|---|---:|---:|---:|---:|---|']
signature=lambda r:(r['account'],r['date'],cents(r['debit'])-cents(r['credit']))
expected_counts=Counter(signature(r) for r in source['rows'])
for i,r in enumerate(source['rows']):
    ec=expected_counts[signature(r)];lc=occurrences[i]
    status='No allocated match' if i in live['missing_pdf_row_indices_zero_based'] else 'Extra live copies' if lc>ec else 'Amount/date match'
    lines.append(f"| {r['page']} | {r['date']} | {r['voucher']} | {r['account']} | {money(cents(r['debit']))} | {money(cents(r['credit']))} | {lc} | {ec} | {status} |")
lines+=['','## Reconstructed source vouchers (not an additional import file)','',
'Each voucher appears once. Cash-inferred rows are explicitly marked.','',
'| Date | Voucher | Pages | Debit account | Credit account | Amount | Narration | Cash inferred |','|---|---|---|---|---|---:|---|---|']
for j in source['journals']:
    dr=next(l for l in j['lines'] if cents(l['debit'])>0);cr=next(l for l in j['lines'] if cents(l['credit'])>0)
    lines.append(f"| {j['date']} | {j['voucher']} | {'/'.join(map(str,j['pages']))} | {dr['account']} | {cr['account']} | {money(cents(dr['debit']))} | {cell(j['description'])} | {'Yes' if j['cash_counterpart_inferred'] else 'No'} |")
(OUT/'Fin_12_09_discrepancy_report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps(dict(csv=str(csvpath),report=str(OUT/'Fin_12_09_discrepancy_report.md'),entries=len(entries),correction_dates=sum(any(v.values()) for v in delta.values()),opening_entries=sum(r['Date']=='2026-03-31' for r in entries),total_csv_debit=sum(Decimal(r['DebitAmount']) for r in entries),income=money(live_inc),expenses=money(live_exp),source_expenses=source['expenses'],csv_sha256=plan['csv_sha256']),indent=2,default=str))
