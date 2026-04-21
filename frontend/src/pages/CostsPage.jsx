import React, { useEffect, useState } from "react";
import axios from "axios";

const BTN = "bg-amber-500 text-white px-4 py-2 rounded";
const CARD = "bg-white p-4 rounded shadow";

export default function CostsPage() {

  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [bs, setBs] = useState([]);

  const [view, setView] = useState("dashboard");
  const [selectedAccount, setSelectedAccount] = useState(null);

  const [expenseModal, setExpenseModal] = useState(false);
  const [accountModal, setAccountModal] = useState(false);
  const [balanceModal, setBalanceModal] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ================= LOAD =================
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [a, b] = await Promise.all([
        axios.get("/api/accounting/accounts"),
        axios.get("/api/accounting/balances")
      ]);

      setAccounts(a.data || []);
      setBalances(b.data || []);

    } catch (e) {
      console.error("Fetch error", e);
    }
  };

  // ================= LEDGER =================
  const loadLedger = async (acc) => {
    try {
      setSelectedAccount(acc);

      

	const from = fromDate ? `${fromDate}T00:00:00` : "";
	const to = toDate ? `${toDate}T23:59:59` : "";

	const res = await axios.get(
  	`/api/accounting/ledger/${acc.id}?fromDate=${from}&toDate=${to}`
	);

      setLedger(res.data || []);
      setView("ledger");

    } catch (e) {
      console.error(e);
      alert("Ledger load failed");
    }
  };

  // ================= PNL =================

/*const loadPnL = async () => {
  try {
    const res = await axios.get("/api/accounting/income-expense");

    setPnl({
      income: res.data.totalIncome,
      expense: res.data.totalExpense,
      net: res.data.net
    });

    setView("pnl");

  } catch (e) {
    alert("PnL failed");
  }
};*/

const loadPnL = async () => {
  try {
    const from = fromDate ? `${fromDate}T00:00:00` : "";
    const to = toDate ? `${toDate}T23:59:59` : "";

    const res = await axios.get(
      `/api/accounting/pnl?fromDate=${from}&toDate=${to}`
    );

    setPnl(res.data);
    setView("pnl");

  } catch (e) {
    alert("PnL failed");
  }
};

  // ================= BALANCE SHEET =================
  /*const loadBS = async () => {
    try {
      const res = await axios.get("/api/accounting/balance-sheet");

      setBs(res.data || []);
      setView("bs");

    } catch (e) {
      alert("Balance sheet failed");
    }
  };*/
const loadBS = async () => {
  try {
    const res = await axios.get("/api/accounting/balances");

    setBs(res.data || []);
    setView("bs");

  } catch (e) {
    alert("Balance sheet failed");
  }
};

  // ================= SAVE EXPENSE =================
  const saveExpense = async (form) => {
    try {

      await axios.post("/api/accounting/journal", {
        //date: new Date(form.date).toISOString(),
        date: form.date,
	description: form.description,
        lines: [
          {
            accountId: Number(form.debitAccountId),
            debit: Number(form.amount),
            credit: 0
          },
          {
            accountId: Number(form.creditAccountId),
            debit: 0,
            credit: Number(form.amount)
          }
        ]
      });

      alert("Saved");
      setExpenseModal(false);
      fetchAll();

    } catch (e) {
      console.error(e.response?.data);
      alert("Save failed");
    }
  };

  // ================= OPENING BALANCE =================
  const saveOpening = async (data) => {
    try {
      await axios.post("/api/accounting/opening-balance", {
        accountId: data.accountId,
        amount: Number(data.amount)
      });

      setBalanceModal(null);
      fetchAll();

    } catch {
      alert("Failed");
    }
  };

const handlePdf = () => {
  try {
    //const from = fromDate ? new Date(fromDate).toISOString() : "";
  //  const from = fromDate || "";
   // const to = toDate || ""; 
const from = fromDate ? `${fromDate}T00:00:00` : "";
const to = toDate ? `${toDate}T23:59:59` : "";
   
    const url = `/api/accounting/pnl/pdf?fromDate=${from}&toDate=${to}`;

    window.open(url, "_blank");
  } catch (e) {
    console.error(e);
    alert("PDF failed");
  }
};

  return (
    <div className="p-6 bg-gray-100 min-h-screen">

      {/* HEADER */}

		<div className="flex justify-between mb-4">
		  <h1 className="text-2xl font-bold">Mahima Accounting</h1>

		  <div className="flex gap-2">
			<button
			  onClick={() => window.print()}
			  className="bg-gray-700 text-white px-3 py-1 rounded"
			>
			  Print
			</button>

			<button
			  onClick={handlePdf}
			  className="bg-purple-600 text-white px-3 py-1 rounded"
			>
			  PDF
			</button>

			<button
			  onClick={() => setExpenseModal(true)}
			  className="bg-amber-500 text-white px-3 py-1 rounded"
			>
			  + Expense
			</button>

			<button
			  onClick={() => setAccountModal(true)}
			  className="bg-blue-500 text-white px-3 py-1 rounded"
			>
			  + Account
			</button>
		  </div>
		</div>

      {/* DATE FILTER */}
      <div className="flex gap-2 mb-4">
        <input type="date" onChange={e => setFromDate(e.target.value)} />
        <input type="date" onChange={e => setToDate(e.target.value)} />
      </div>

      {/* NAV */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView("dashboard")} className="bg-amber-500 text-white px-3 py-1 rounded">DASHBOARD</button>
        <button onClick={() => setView("coa")} className="bg-gray-200 px-3 py-1 rounded">COA</button>
        <button onClick={() => setView("ledger")} className="bg-gray-200 px-3 py-1 rounded">LEDGER</button>
        <button onClick={loadPnL} className="bg-gray-200 px-3 py-1 rounded">PNL</button>
        <button onClick={loadBS} className="bg-gray-200 px-3 py-1 rounded">BS</button>
      </div>

      {/* DASHBOARD */}
      {view === "dashboard" && (
   <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
   {balances.map((b) => (
    <div
      key={b.accountId}
      style={{
        background: "#fff",
        padding: "15px",
        borderRadius: "10px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
      }}
    >
      <div style={{ color: "#555", fontSize: "14px" }}>
        {b.accountName}
      </div>

      <div style={{ fontSize: "20px", fontWeight: "bold" }}>
        ₹{b.balance}
      </div>
    </div>
  ))}
</div>
   
      )}

      {/* COA */}
      {view === "coa" && (
        <div className={CARD}>
          {["ASSET", "LIABILITY", "INCOME", "EXPENSE"].map(type => (
            <div key={type}>
              <h4 className="font-bold">{type}</h4>
              {accounts.filter(a => a.type === type).map(a => (
                <div key={a.id}>{a.name}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* LEDGER */}
      {view === "ledger" && (
        <div className="grid grid-cols-3 gap-4">
          <div className={CARD}>
            {accounts.map(a => (
              <div key={a.id} onClick={() => loadLedger(a)} className="cursor-pointer">
                {a.name}
              </div>
            ))}
          </div>

          <div className={`${CARD} col-span-2`}>
            {ledger.map((l, i) => (
              <div key={i} className="flex justify-between border-b py-1">
                //<span>{l.description}</span>
                <span>
  			{l.date ? new Date(l.date).toLocaleDateString() : "-"} | {l.description}
		</span>
		<span>Dr {l.debit} | Cr {l.credit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PNL */}
      {view === "pnl" && pnl && (
        <div className={CARD}>
          <div>Income ₹{pnl.income}</div>
          <div>Expense ₹{pnl.expense}</div>
          <div className="font-bold">Net ₹{pnl.net}</div>
        </div>
      )}

      {/* BALANCE SHEET */}
  
{view === "bs" && (
  <div className="grid grid-cols-2 gap-4">

    {/* ASSETS */}
    <div className={CARD}>
      <h3 className="font-bold mb-2">ASSETS</h3>
      {bs
        .filter(b => b.type === "ASSET")
        .map((b, i) => (
          <div key={i} className="flex justify-between border-b py-1">
            <span>{b.accountName}</span>
            <span>₹{b.balance}</span>
          </div>
        ))}
    </div>

    {/* LIABILITIES */}
    <div className={CARD}>
      <h3 className="font-bold mb-2">LIABILITIES</h3>
      {bs
        .filter(b => b.type === "LIABILITY")
        .map((b, i) => (
          <div key={i} className="flex justify-between border-b py-1">
            <span>{b.accountName}</span>
            <span>₹{b.balance}</span>
          </div>
        ))}
    </div>

  </div>
)}



    {expenseModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
    <div className="bg-white p-6 rounded w-96">

      <h2 className="font-bold mb-3">Add Expense</h2>

      <input type="date" id="expDate" className="border w-full mb-2 p-1" />
      <input placeholder="Description" id="expDesc" className="border w-full mb-2 p-1" />
      <input placeholder="Amount" id="expAmt" type="number" className="border w-full mb-2 p-1" />

         {/* Expense Category */}
        <select id="expCategory" className="border w-full mb-2 p-1">
          {accounts
                .filter(a => a.type === "EXPENSE")
                .map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
        </select>

        {/* Payment Mode */}
        <select id="expMode" className="border w-full mb-2 p-1">
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
        </select>

      <div className="flex justify-end gap-2 mt-3">
        <button onClick={() => setExpenseModal(false)} className="px-3 py-1 bg-gray-300 rounded">
          Cancel
        </button>

        <button
          onClick={() => {
         const categoryId = document.getElementById("expCategory").value;
                        const mode = document.getElementById("expMode").value;

                        // find cash/bank
                        //const cash = accounts.find(a => a.name === "Cash");
                        //const bank = accounts.find(a => a.name === "Bank");

                        //const creditAccountId = mode === "cash" ? cash.id : bank.id;

			const cash = accounts.find(a => a.type === "ASSET" && a.name === "Cash");
			const bank = accounts.find(a => a.type === "ASSET" && a.name === "Bank");

			if (!cash || !bank) {
			  alert("Cash/Bank account missing");
			  return;
				}

			const creditAccountId = mode === "cash" ? cash.id : bank.id;
			
                        saveExpense({
                          date: document.getElementById("expDate").value,
                          description: document.getElementById("expDesc").value,
                          amount: document.getElementById("expAmt").value,
                          debitAccountId: categoryId,   // Expense
                          creditAccountId: creditAccountId // Cash/Bank
                        });
          	}}
          className="bg-amber-500 text-white px-3 py-1 rounded"
        >
          Save
        </button>
      </div>

    </div>
  </div>
)}
{accountModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
    <div className="bg-white p-6 rounded w-80">

      <h2 className="font-bold mb-3">Add Account</h2>

      <input id="accName" placeholder="Account Name" className="border w-full mb-2 p-1" />

      <select id="accType" className="border w-full mb-2 p-1">
        <option value="ASSET">ASSET</option>
        <option value="LIABILITY">LIABILITY</option>
        <option value="INCOME">INCOME</option>
        <option value="EXPENSE">EXPENSE</option>
      </select>

      <div className="flex justify-end gap-2 mt-3">
        <button onClick={() => setAccountModal(false)} className="px-3 py-1 bg-gray-300 rounded">
          Cancel
        </button>

        <button
          onClick={async () => {
            try {
              await axios.post("/api/accounting/accounts", {
                name: document.getElementById("accName").value,
                type: document.getElementById("accType").value
              });

              setAccountModal(false);
              fetchAll();

            } catch {
              alert("Failed");
            }
          }}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Save
        </button>
      </div>

    </div>
  </div>
)}
{balanceModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
    <div className="bg-white p-6 rounded w-80">

      <h2 className="font-bold mb-3">
        Set Opening Balance ({balanceModal.accountName})
      </h2>

      <input id="balAmt" type="number" placeholder="Amount" className="border w-full mb-2 p-1" />

      <div className="flex justify-end gap-2 mt-3">
        <button onClick={() => setBalanceModal(null)} className="px-3 py-1 bg-gray-300 rounded">
          Cancel
        </button>

        <button
          onClick={() =>
            saveOpening({
              accountId: balanceModal.accountId,
              amount: document.getElementById("balAmt").value
            })
          }
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          Save
        </button>
      </div>

    </div>
  </div>
)}
        </div>
  );
}
