import { settingsCommand, saveErrorMessage } from "./requests";
import React, { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Bird, CheckCircle2, ClipboardList, IndianRupee, Package, Plus, RefreshCw, Scale, Sparkles, Store, TrendingUp } from "lucide-react";
import api from "../../api/axios";
import { useChickenAccess } from "./access";
import "./chickenSale.css";
const money = n => n == null ? "—" : new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
}).format(n);
const kg = n => `${Number(n || 0).toFixed(3)} kg`;
const today = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());
const kinds = {
  receive: "Receive raw chicken",
  dress: "Dress / process",
  sale: "Sell dressed meat",
  expense: "Shop expense",
  collection: "Collect customer balance",
  "supplier-payment": "Pay supplier balance",
  "raw-waste": "Raw spoilage / mortality",
  "dressed-waste": "Dressed spoilage",
  "raw-exit": "Raw exit / disposal",
  "dressed-exit": "Dressed exit / disposal"
};
const amountKinds = ["expense", "collection", "supplier-payment"];
const freshEntry = (kind = "receive") => ({
  id: crypto.randomUUID(),
  kind,
  kg: "",
  outputKg: "",
  rate: "",
  amount: "",
  paid: "",
  payment: "cash",
  party: "",
  note: ""
});
function Field({
  label,
  children,
  ...props
}) {
  return <label className="ch-field">
<span>{label}</span>{children || <input {...props} />}</label>;
}
function Stat({
  label,
  value,
  detail,
  icon: Icon,
  tone = ""
}) {
  return <article className={`ch-stat ${tone}`}>
<div>
<span>{label}</span>
<Icon size={19} />
</div>
<strong>{value}</strong>
<small>{detail}</small>
</article>;
}
export default function ChickenSalePage() {
  const access = useChickenAccess();
  const [date, setDate] = useState(today),
    [data, setData] = useState(null),
    [history, setHistory] = useState([]),
    [market, setMarket] = useState(null),
    [advice, setAdvice] = useState(null);
  const [tab, setTab] = useState("overview"),
    [entry, setEntry] = useState(freshEntry),
    [settings, setSettings] = useState({}),
    [closing, setClosing] = useState({
      countedRawKg: "",
      countedDressedKg: "",
      note: ""
    });
  const [locating, setLocating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editReason, setEditReason] = useState("");
  const entryForm = useRef(null);
  const [correction, setCorrection] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [aiBusy, setAiBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const request = useRef(0),
    lock = useRef(false),
    advised = useRef("");
  const day = data?.day,
    t = data?.totals;
  const load = async () => {
    const ticket = ++request.current;
    setLoading(true);
    setError("");
    setData(null);
    setEditing(false);
    setEditReason("");
    setEntry(freshEntry());
    setAdvice(null);
    try {
      const [result, past] = await Promise.all([api.get(`/chicken-sale/days/${date}`).catch(e => {
        if (e.response?.status === 404) return {
          data: null
        };
        throw e;
      }), api.get("/chicken-sale/days")]);
      if (ticket !== request.current) return;
      setData(result.data);
      setSettings(result.data?.day || {});
      setHistory(past.data);
      setClosing({
        countedRawKg: "",
        countedDressedKg: "",
        note: ""
      });
    } catch (e) {
      if (ticket === request.current) setError(e.response?.status === 403 ? "Your access has been removed. Ask an administrator to assign this module." : "Unable to load the shop ledger. Check your connection and that the database migration is installed.");
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  };
  useEffect(() => {
    if (access.enabled) load();else if (!access.loading) setLoading(false);
    return () => {
      request.current++;
    };
  }, [date, access.enabled, access.loading]);
  useEffect(() => {
    let active = true;
    setMarket(null);
    if (day?.city) api.get("/chicken-sale/market", {
      params: {
        city: day.city
      }
    }).then(r => active && setMarket(r.data)).catch(() => active && setMarket({
      status: "Market lookup unavailable. Use your supplier's rate."
    }));
    return () => {
      active = false;
    };
  }, [day?.city, date]);
  const save = async body => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const {
        data: result
      } = await api.post(`/chicken-sale/days/${date}`, {
        version: day?.version || 0,
        ...body
      });
      setData(result);
      setSettings(result.day);
      setAdvice(null);
      setNotice(body.action === "close" ? "Day closed. Remaining stock will carry forward at its recorded cost." : "Saved to the shop ledger.");
      api.get("/chicken-sale/days").then(r => setHistory(r.data)).catch(() => {});
      return true;
    } catch (e) {
      setError(saveErrorMessage(e));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submitEntry = async e => {
    e.preventDefault();
    const normalized = {
      ...entry
    };
    ["kg", "outputKg", "rate", "amount", "paid"].forEach(k => normalized[k] = Number(entry[k] || 0));
    if (await save({
      action: editing ? "edit-entry" : "entry",
      entry: normalized,
      note: editReason
    })) { setEntry(freshEntry(entry.kind)); setEditing(false); setEditReason(""); }

  };
  const startEdit = record => {
    setEntry({ ...record }); setEditing(true); setEditReason(""); setError(""); setNotice("");
    entryForm.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const settlementBalances = [...(t?.balances || [])];
  if (editing && ["collection", "supplier-payment"].includes(entry.kind)) {
    const original = day.entries.find(e => e.id === entry.id);
    const balance = settlementBalances.find(b => b.id === original.referenceId);
    if (!balance) {
      const bill = day.entries.find(e => e.id === original.referenceId) || day.openingBalances?.find(b => b.id === original.referenceId);
      settlementBalances.push({ id: original.referenceId, kind: original.kind === "collection" ? "sale" : "receive", party: bill?.party || "Original bill", due: original.amount });
    } else settlementBalances[settlementBalances.indexOf(balance)] = { ...balance, due: balance.due + original.amount };
  }
  const getAdvice = async () => {
    const ticket = request.current;
    setAiBusy(true);
    try {
      const {
        data
      } = await api.post(`/chicken-sale/days/${date}/advice`);
      if (ticket === request.current) setAdvice(data.text);
    } catch {
      if (ticket === request.current) setAdvice("AI advice is unavailable. Your calculated pricing and ledger remain available.");
    } finally {
      setAiBusy(false);
    }
  };
  useEffect(() => {
    if (day && advised.current !== day.date) {
      advised.current = day.date;
      getAdvice();
    }
  }, [day?.date]);
  const locateShop = () => {
    if (!navigator.geolocation) {
      setError("Location is unavailable on this device. Enter your city manually.");
      return;
    }
    const ticket = request.current;
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const {
          data
        } = await api.get("/today-updates/location", {
          params: {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          }
        });
        if (ticket !== request.current) return;
        if (!data.city || data.country !== "India") {
          setError("An Indian shop city could not be identified. Enter it manually.");
          return;
        }
        setSettings(current => ({
          ...current,
          city: data.city
        }));
        setNotice(`Detected ${data.city}. Review and save your daily settings.`);
      } catch {
        if (ticket === request.current) setError("Location lookup failed. Enter your city manually.");
      } finally {
        setLocating(false);
      }
    }, () => {
      setLocating(false);
      if (ticket === request.current) setError("Location permission was denied or unavailable. Enter your city manually.");
    }, {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 300000
    });
  };
  const exportCsv = () => {
    const rows = [["Date", "Status", "Revenue INR", "Cost of sales INR", "Loss INR", "Expenses INR", "Profit INR", "Raw kg", "Dressed kg"], ...history.map(h => [h.date, h.closed ? "Closed" : "Open", h.totals.revenue, h.totals.costOfSales, h.totals.wasteCost, h.totals.expenses, h.totals.profit, h.totals.rawKg, h.totals.dressedKg])];
    const url = URL.createObjectURL(new Blob([rows.map(r => r.join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8"
    }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "mahima-chicken-daily-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (access.loading) return <div className="chicken-sale">
<p role="status">Checking module access…</p>
</div>;
  if (!access.enabled) return <div className="chicken-sale">
<div className="ch-empty">
<Store size={42} />
<h1>Mahima Chicken Sale</h1>
<p>This module is assigned individually. Ask an administrator to enable it in your user profile.</p>
</div>
</div>;
  return <main className="chicken-sale">
    <header className="ch-header">
<div className="ch-brand">
<div className="ch-brand-icon">
<Bird size={28} />
</div>
<div>
<span className="ch-eyebrow">MAHIMA • RETAIL OPERATIONS</span>
<h1>Chicken Sale</h1>
<p>Your daily shop, from first delivery to final sale.</p>
</div>
</div>
<div className="ch-date">
<Field label="Business day · India time" type="date" value={date} max={today()} disabled={busy} onChange={e => {
          if (e.target.value) {
            setDate(e.target.value);
            setNotice("");
          }
        }} />
<button aria-label="Refresh ledger" className="ch-icon-btn" onClick={load} disabled={busy || loading}>
<RefreshCw size={18} />
</button>
</div>
</header>
    {error && <div className="ch-alert error" role="alert">{error}</div>}{notice && <div className="ch-alert" role="status">{notice}</div>}
    {loading ? <div className="ch-empty" role="status">Loading your shop ledger…</div> : !day ? <div className="ch-empty">
<Store size={48} />
<h2>Ready for a new trading day?</h2>
<p>Open {date}. Stock and daily settings carry forward from the last closed day. Confirm carried stock is fit for sale before trading.</p>
<button className="ch-primary" disabled={busy || !!error} onClick={() => save({
        action: "open"
      })}>
<Plus size={18} />Open business day</button>
</div> : <>
    <div className="ch-tabs" role="tablist" aria-label="Shop sections">{["overview", "entries", "settings", "close day", "history"].map(name => <button role="tab" aria-selected={tab === name} className={tab === name ? "active" : ""} key={name} onClick={() => setTab(name)}>{name}</button>)}<span className={`ch-status ${day.closed ? "closed" : ""}`}>
<span />{day.closed ? "Day closed" : "Trading open"}</span>
</div>
    {tab === "overview" && <>
      <section className="ch-stats">
<Stat label="Sales revenue" value={money(t.revenue)} detail={`${kg(t.soldKg)} dressed meat sold`} icon={IndianRupee} />
<Stat label="Net operating profit" value={money(t.profit)} detail="After stock costs, losses & daily charges" icon={TrendingUp} tone={t.profit >= 0 ? "positive" : "negative"} />
<Stat label="Raw stock on hand" value={kg(t.rawKg)} detail={`${money(t.rawValue)} inventory value`} icon={Package} />
<Stat label="Dressed stock ready" value={kg(t.dressedKg)} detail={`${money(t.dressedValue)} inventory value`} icon={Scale} />
</section>
      <div className="ch-grid">
<section className="ch-card ch-pricing">
<div className="ch-section-title">
<div>
<span className="ch-eyebrow">TODAY'S PRICING PLAN</span>
<h2>Sell with your costs in view</h2>
</div>
<TrendingUp />
</div>
<div className="ch-price">{money(t.suggestedRate)}<span>/ kg dressed</span>
</div>
<p>Planning price for a <b>{day.targetMargin}% net margin</b> at {kg(day.expectedSalesKg)} expected sales.</p>
<div className="ch-price-detail">
<div>
<small>Break-even / kg</small>
<strong>{money(t.breakEvenRate)}</strong>
</div>
<div>
<small>Raw → dressed factor</small>
<strong>{day.rawFactor} : 1</strong>
</div>
<div>
<small>Expected yield</small>
<strong>{(100 / day.rawFactor).toFixed(1)}%</strong>
</div>
</div>
<p className="ch-fine">Uses recorded inventory cost, daily charges and recorded losses. Actual profit depends on sales volume, yield and selling price. {t.suggestedRate == null && "Record your first delivery to calculate a price."}</p>
<button className="ch-primary" disabled={day.closed} onClick={() => {
              setTab("entries");
              setEntry(freshEntry("sale")); setEditing(false); setEditReason("");
            }}>
<Plus size={17} />Record a sale</button>
</section>
      <section className="ch-card">
<div className="ch-section-title">
<div>
<span className="ch-eyebrow">LOCAL MARKET WATCH</span>
<h2>{day.city}, India</h2>
</div>
<Store />
</div>
<div className="ch-market-price">{money(market?.price)}<span>/ kg live chicken</span>
</div>
<span className={`ch-pill ${market?.fresh ? "fresh" : "stale"}`}>{market ? market.fresh ? "Dated today" : market.price ? "Older quote" : "Unavailable" : "Checking source…"}</span>
<p>{market?.status || "Checking the published price and its source date."}</p>{market?.asOf && <small>Published {market.asOf} • INR • live bird, not dressed meat</small>}{market?.sourceUrl && <a href={market.sourceUrl} target="_blank" rel="noreferrer">View public source <ArrowUpRight size={14} />
</a>}<div className="ch-ai">
<div className="ch-section-title">
<h3>
<Sparkles size={17} />Shop advisor</h3>
<button className="ch-text-btn" disabled={aiBusy} onClick={getAdvice}>{aiBusy ? "Thinking…" : "Get daily advice"}</button>
</div>
<p>{advice || "Get AI guidance grounded in this day's costs, yield and dated market quote."}</p>
</div>
</section>
</div>
      <div className="ch-grid">
<section className="ch-card">
<h2>Where the money goes</h2>{[["Revenue", t.revenue], ["Cost of meat sold", t.costOfSales], ["Spoilage, exits & count shortages", t.wasteCost], ["Labor, rent & other expenses", t.expenses], ["Net operating profit", t.profit]].map(([label, value]) => <div className="ch-ledger-row" key={label}>
<span>{label}</span>
<strong>{money(value)}</strong>
</div>)}<p className="ch-fine">Normal dressing loss is absorbed into meat cost; unsold stock stays in inventory. Figures exclude taxes.</p>
</section>
<section className="ch-card">
<h2>Daily control desk</h2>{[["Customer collections", money(t.collected)], ["Customer balance due", money(t.receivable)], ["Supplier balance due", money(t.supplierDue)], ["Operating cash movement", money(t.cashFlow)], ["Normal dressing loss", kg(t.dressingLossKg)]].map(([label, value]) => <div className="ch-ledger-row" key={label}>
<span>{label}</span>
<strong>{value}</strong>
</div>)}<p className="ch-fine">Daily labor and rent are treated as paid charges in cash movement. Unpaid bills carry forward until settled.</p>
</section>
</div>
    </>}
    {tab === "entries" && <div className="ch-entry-grid">
<section className="ch-card">
<h2>
<Plus size={19} />{editing ? "Edit shop record" : "Add a shop entry"}</h2>
<form ref={entryForm} onSubmit={submitEntry}>
<fieldset disabled={busy || day.closed}>
<Field label="Entry type">
<select disabled={editing} value={entry.kind} onChange={e => setEntry(freshEntry(e.target.value))}>{Object.entries(kinds).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
</Field>{!amountKinds.includes(entry.kind) && <Field label={entry.kind === "dress" ? "Raw input weight (kg)" : "Net weight (kg)"} type="number" step="0.001" min="0.001" max="100000" required value={entry.kg} onChange={e => setEntry({
                ...entry,
                kg: e.target.value
              })} />}{entry.kind === "dress" && <>
<Field label="Actual dressed output (kg)" type="number" step="0.001" min="0.001" required value={entry.outputKg} onChange={e => setEntry({
                  ...entry,
                  outputKg: e.target.value
                })} />
<small>At factor {day.rawFactor}, expected output is {kg(Number(entry.kg) / day.rawFactor)}. Weigh and enter the actual output.</small>
</>}{["receive", "sale"].includes(entry.kind) && <>
<Field label={entry.kind === "receive" ? "Supplier / invoice reference" : "Customer / bill reference (required for credit)"} required={entry.kind === "receive"} maxLength={200} value={entry.party} onChange={e => setEntry({
                  ...entry,
                  party: e.target.value
                })} />
<Field label="Price per kg (₹)" type="number" min="0.01" step="0.01" required value={entry.rate} onChange={e => setEntry({
                  ...entry,
                  rate: e.target.value
                })} />
<div className="ch-entry-total">Total <b>{money(Number(entry.kg) * Number(entry.rate))}</b>
</div>
<Field label={entry.kind === "sale" ? "Amount collected (₹)" : "Amount paid to supplier (₹)"} type="number" min="0" step="0.01" required value={entry.paid} onChange={e => setEntry({
                  ...entry,
                  paid: e.target.value
                })} />
<button type="button" className="ch-text-btn" onClick={() => setEntry({
                  ...entry,
                  paid: (Number(entry.kg) * Number(entry.rate)).toFixed(2)
                })}>Set fully paid</button>
<Field label="Payment method">
<select value={entry.payment} onChange={e => setEntry({
                    ...entry,
                    payment: e.target.value
                  })}>{["cash", "upi", "card", "bank", "credit"].map(p => <option key={p}>{p}</option>)}</select>
</Field>
</>}{["collection", "supplier-payment"].includes(entry.kind) && <Field label="Outstanding bill">
<select required value={entry.referenceId || ""} onChange={e => setEntry({
                  ...entry,
                  referenceId: e.target.value
                })}>
<option value="">Select a bill</option>{settlementBalances.filter(b => b.kind === (entry.kind === "collection" ? "sale" : "receive")).map(b => <option key={b.id} value={b.id}>{b.party} / {b.id.slice(0, 8)} / due {money(b.due)}</option>)}</select>
</Field>}{amountKinds.includes(entry.kind) && <Field label="Payment / expense amount (INR)" type="number" min="0.01" step="0.01" required value={entry.amount} onChange={e => setEntry({
                ...entry,
                amount: e.target.value
              })} />}{amountKinds.includes(entry.kind) && <Field label="Payment method">
<select value={entry.payment} onChange={e => setEntry({
                  ...entry,
                  payment: e.target.value
                })}>{["cash", "upi", "card", "bank"].map(p => <option key={p}>{p}</option>)}</select>
</Field>}<Field label="Category / notes / reason">
<textarea maxLength={1000} required={entry.kind.includes("waste") || entry.kind.includes("exit") || entry.kind === "expense"} value={entry.note} onChange={e => setEntry({
                  ...entry,
                  note: e.target.value
                })} />
</Field>{entry.kind.includes("exit") && <p className="ch-fine">Exits remove stock at cost with no revenue. Record a sale instead for customer sales. Stock retained overnight belongs in the closing count.</p>}{editing && <Field label="Reason for edit" required maxLength={1000} value={editReason} onChange={e => setEditReason(e.target.value)} />}<button className="ch-primary" type="submit">{busy ? "Saving..." : day.closed ? "Day is closed" : editing ? "Save changes" : "Save entry"}</button>{editing && <button type="button" className="ch-secondary" onClick={() => { setEditing(false); setEditReason(""); setEntry(freshEntry(entry.kind)); }}>Cancel edit</button>}
</fieldset>
</form>
</section>
<section className="ch-card">
<h2>
<ClipboardList size={20} />Day's activity <span className="ch-count">{day.entries.length}</span>
</h2>{!day.entries.length && <div className="ch-empty">No entries yet. Start with a supplier delivery.</div>}<div className="ch-activity">{[...day.entries].reverse().map(e => <article key={e.id}>
<div className={`ch-activity-icon ${e.kind}`}>
<Scale size={19} />
</div>
<div>
<strong>{kinds[e.kind]}</strong>
<p>{e.party || e.note || "Shop entry"}</p>
<small>{new Date(e.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Kolkata"
                  })} IST · {e.id.slice(0, 8)}</small>{e.party && e.note && <p>{e.note}</p>}</div>
<div className="ch-activity-value">
<strong>{amountKinds.includes(e.kind) ? money(e.amount) : kg(e.kg)}</strong>
<small>{["receive", "sale"].includes(e.kind) ? `${money(e.kg * e.rate)} · paid ${money(e.paid)}` : e.kind === "dress" ? `→ ${kg(e.outputKg)}` : ""}</small>
</div>
{!day.closed && <button className="ch-text-btn" type="button" disabled={busy} aria-label={`Edit ${kinds[e.kind]} ${e.id.slice(0, 8)}`} onClick={() => startEdit(e)}>Edit</button>}</article>)}</div>{!editing && !day.closed && day.entries.length > 0 && <form onSubmit={async e => {
            e.preventDefault();
            if (await save({
              action: "remove-last",
              entry: {
                id: day.entries[day.entries.length - 1].id
              },
              note: correction
            })) setCorrection("");
          }}>
<Field label="Correct the most recent entry (reason required)" required maxLength={1000} value={correction} onChange={e => setCorrection(e.target.value)} />
<button className="ch-secondary" disabled={busy} type="submit">Remove latest entry with audit record</button>
<p className="ch-fine">Use Edit on any record to correct it. Only the latest entry can be removed; all changes are audited.</p>
</form>}</section>
</div>}
    {tab === "settings" && <section className="ch-card ch-form-card">
<h2>Daily shop assumptions</h2>
<p>These settings are saved per day. Daily labor and rent carry forward; review them at opening.</p>
<form onSubmit={async e => {
          e.preventDefault();
          await save(settingsCommand(settings));
        }}>
<fieldset disabled={busy || day.closed}>
<button type="button" className="ch-secondary" disabled={locating} onClick={locateShop}>{locating ? "Finding your city..." : "Use device location"}</button>
<p className="ch-fine">Optional: share your device coordinates with the existing location service to fill the city. You can also enter it yourself.</p>
<div className="ch-form-grid">
<Field label="Shop city (English)" required maxLength={80} value={settings.city || ""} onChange={e => setSettings({
                ...settings,
                city: e.target.value
              })} />{[["rawFactor", "Raw kg needed for 1 kg dressed", 1, 5], ["targetMargin", "Target net profit margin (%)", 0, 80], ["expectedSalesKg", "Expected dressed sales (kg/day)", 0.001, 100000], ["labor", "Daily labor charge (₹)", 0, 10000000], ["rent", "Daily rent allocation (₹)", 0, 10000000]].map(([key, label, min, max]) => <Field key={key} label={label} type="number" step={["labor", "rent"].includes(key) ? "0.01" : "0.001"} min={min} max={max} required value={settings[key] ?? ""} onChange={e => setSettings({
                ...settings,
                [key]: e.target.value
              })} />)}</div>
<p className="ch-fine">Example: factor 1.6 means 62.5% dressed yield. For monthly rent, divide by the number of trading days you want to allocate it across. Do not record the same labor or rent again as an expense.</p>
<button className="ch-primary" type="submit">Save daily settings</button>
</fieldset>
</form>
</section>}
    {tab === "close day" && <section className="ch-card ch-form-card">
<h2>
<CheckCircle2 />{day.closed ? "Day closed & reconciled" : "Count, reconcile, close"}</h2>
<p>Count stock physically after all sales, dressing and disposal entries. Shortages are charged to today's loss. Remaining stock carries forward at its recorded cost.</p>
<div className="ch-price-detail">
<div>
<small>Expected raw</small>
<strong>{kg(t.rawKg)}</strong>
</div>
<div>
<small>Expected dressed</small>
<strong>{kg(t.dressedKg)}</strong>
</div>
</div>{day.closed ? <>
<p>Recorded closing raw: {kg(day.countedRawKg)} · Dressed: {kg(day.countedDressedKg)}</p>
<p>{day.closeNote}</p>
<p className="ch-fine">Closed days cannot be edited. The dated ledger and audit trail are retained.</p>
</> : <form onSubmit={async e => {
          e.preventDefault();
          await save({
            action: "close",
            ...closing,
            countedRawKg: Number(closing.countedRawKg),
            countedDressedKg: Number(closing.countedDressedKg)
          });
        }}>
<fieldset disabled={busy}>
<div className="ch-form-grid">
<Field label="Physical raw closing weight (kg)" type="number" min="0" max={t.rawKg} step="0.001" required value={closing.countedRawKg} onChange={e => setClosing({
                ...closing,
                countedRawKg: e.target.value
              })} />
<Field label="Physical dressed closing weight (kg)" type="number" min="0" max={t.dressedKg} step="0.001" required value={closing.countedDressedKg} onChange={e => setClosing({
                ...closing,
                countedDressedKg: e.target.value
              })} />
</div>
<Field label="Closing notes / reason for shortage">
<textarea maxLength={1000} value={closing.note} onChange={e => setClosing({
                ...closing,
                note: e.target.value
              })} />
</Field>
<label className="ch-confirm">
<input type="checkbox" required />I have checked all entries and weights. Closing locks this day.</label>
<button className="ch-primary" type="submit">Close & carry forward stock</button>
</fieldset>
</form>}</section>}
    {tab === "history" && <section className="ch-card">
<div className="ch-section-title">
<div>
<h2>Trading history</h2>
<p>Last 90 trading days · select a date to inspect its ledger.</p>
</div>
<button className="ch-secondary" onClick={exportCsv}>
<ArrowDownToLine size={17} />Export CSV</button>
</div>
<div className="ch-table-wrap">
<table>
<thead>
<tr>{["Day", "Status", "Revenue", "Expenses", "Loss", "Net profit"].map(x => <th key={x}>{x}</th>)}</tr>
</thead>
<tbody>{history.map(h => <tr key={h.date}>
<td>
<button className="ch-text-btn" onClick={() => {
                    setDate(h.date);
                    setTab("overview");
                  }}>{h.date}</button>
</td>
<td>{h.closed ? "Closed" : "Open"}</td>
<td>{money(h.totals.revenue)}</td>
<td>{money(h.totals.expenses)}</td>
<td>{money(h.totals.wasteCost)}</td>
<td>{money(h.totals.profit)}</td>
</tr>)}</tbody>
</table>
</div>
</section>}
    </>}
    <footer className="ch-footer">MAHIMA CHICKEN SALE <span>Weights in kg • Currency INR • One shared shop ledger</span>
</footer>
  </main>;
}
