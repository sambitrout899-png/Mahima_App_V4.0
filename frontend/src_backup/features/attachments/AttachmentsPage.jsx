import React, { useEffect, useState } from "react";
import { attachmentsApi } from "../../api/attachments";

export default function AttachmentsPage(){
  const [file, setFile] = useState(null);
  const [rows,setRows] = useState([]);
  const [msg,setMsg] = useState("");

  useEffect(()=>{ load(); }, []);
  async function load(){ try{ const data = await attachmentsApi.list(); setRows(data||[]); }catch(e){ console.error(e); } }

  async function upload(){ if(!file) return alert('Pick a file'); setMsg('Uploading...');
    try{
      // attempt FormData upload directly to backend (not using api client)
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || 'https://www.mahimaministries.com') + '/api/attachments', { method: 'POST', body: fd, credentials: 'include' });
      if (!res.ok) throw new Error('Upload failed: ' + res.status);
      setMsg('Uploaded'); setFile(null); await load();
    } catch(e){ setMsg('Upload failed: ' + (e.message||e)); alert('Upload failed: ' + (e.message||e)); }
  }

  return (
    <div className="p-6 bg-red-50 min-h-screen">
      <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-bold">Attachments</h2><div className="flex gap-2"><button onClick={load} className="px-3 py-2 border rounded">Refresh</button></div></div>
      <div className="mb-4 p-4 bg-white border rounded shadow-sm">
        <label className="block mb-2">Upload</label>
        <input type="file" onChange={e=>setFile(e.target.files[0])} />
        <div className="mt-2"><button onClick={upload} className="px-3 py-1 bg-red-600 text-white rounded">Upload</button></div>
        {msg && <div className="mt-2 text-sm">{msg}</div>}
      </div>
      <div className="overflow-x-auto bg-white rounded shadow-sm">
        <table className="min-w-full table-auto">
          <thead className="bg-red-100"><tr><th className="px-4 py-3">Id</th><th className="px-4 py-3">Filename</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>
            {rows.map((r,i)=>(<tr key={r.id||r.Id||i} className="border-t border-red-100 hover:bg-red-50"><td className="px-4 py-3">{r.id||r.Id}</td><td className="px-4 py-3">{r.fileName||r.name||r.filename}</td><td className="px-4 py-3">{r.url? <a className="text-blue-600" href={r.url} target="_blank">Download</a> : '-'}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}