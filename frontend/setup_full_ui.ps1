# setup_full_ui.ps1
# Safe bootstrap for Mahima Admin UI (Vite + React)
# Run from project root: .\setup_full_ui.ps1

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# create backup folder
$timestamp = (Get-Date).ToString('yyyyMMdd_HHmmss')
$backupRoot = Join-Path $scriptDir "backup_$timestamp"
New-Item -ItemType Directory -Path $backupRoot | Out-Null
Write-Host "Backups (if any) will be placed in: $backupRoot`n"

function Safe-Backup {
    param($path)
    if (Test-Path $path) {
        $name = ($path -replace '[:\\\/]','_') -replace '^_+',''
        $dest = Join-Path $backupRoot $name
        Copy-Item -Path $path -Destination $dest -Force
        Write-Host "Backed up: $path -> $dest"
    }
}

function Write-File-NoBOM {
    param($path, $content)
    $fullDir = Split-Path -Parent $path
    if (-not (Test-Path $fullDir)) { New-Item -ItemType Directory -Path $fullDir -Force | Out-Null }
    # backup existing file if present
    Safe-Backup -path $path
    # write without BOM
    [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Wrote: $path"
}

# Generic API helper
$apiHelper = @'
const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

async function call(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {})
    },
    ...opts
  });
  const text = await res.text();
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const err = new Error("API error");
    err.status = res.status;
    try { err.body = ct.includes("application/json") ? JSON.parse(text) : text } catch { err.body = text }
    throw err;
  }
  if (!text) return null;
  if (ct.includes("application/json")) return JSON.parse(text);
  return text;
}
export { call };
'@

Write-File-NoBOM -path (Join-Path $scriptDir 'src/api/_helper.js') -content $apiHelper

# modules (simple list)
$modules = @('users','teams','tasks','sermons','prayerrequests','meetings','attachments')

foreach ($mod in $modules) {
    $apiContent = @"
import { call } from './_helper';
export const ${mod}Api = {
  list: () => call('/api/${mod}'),
  get: (id) => call(`/api/${mod}/${id}`),
  create: (p) => call('/api/${mod}', { method: 'POST', body: JSON.stringify(p) }),
  update: (id, p) => call(`/api/${mod}/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  remove: (id) => call(`/api/${mod}/${id}`, { method: 'DELETE' })
};
"@
    $apiPath = Join-Path $scriptDir ("src/api/" + $mod + ".js")
    Write-File-NoBOM -path $apiPath -content $apiContent

    # create a simple page for the module
    $PageName = ($mod.Substring(0,1).ToUpper() + $mod.Substring(1)) + 'Page'
    $pageContent = @"
import React, { useEffect, useState } from 'react';
import { ${mod}Api } from '../../api/${mod}';

export default function ${PageName}() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});

  async function refresh() {
    try { const r = await ${mod}Api.list(); setItems(r || []); } catch (e) { console.error(e); }
  }

  useEffect(() => { refresh(); }, []);

  async function save() {
    try {
      if (form.id || form.Id) {
        const id = form.id || form.Id;
        await ${mod}Api.update(id, form);
      } else {
        await ${mod}Api.create(form);
      }
      setForm({});
      await refresh();
    } catch (e) { alert(e.message || 'Save failed'); }
  }

  async function remove(id) {
    if (!confirm('Delete?')) return;
    try { await ${mod}Api.remove(id); await refresh(); } catch (e) { alert(e.message || 'Delete failed'); }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">${mod}</h2>
      <div className="mb-4">
        <input className="border px-2 py-1 mr-2" placeholder="name/title" value={form.name || form.title || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
        <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={save}>{form.id || form.Id ? 'Update' : 'Create'}</button>
      </div>
      <ul>
        {items?.map(it => (
          <li key={it.id || it.Id} className="flex justify-between border-b py-1">
            <span>{it.name || it.title || it.id || it.Id}</span>
            <span>
              <button className="mr-2 text-blue-600" onClick={() => setForm(it)}>Edit</button>
              <button className="text-red-600" onClick={() => remove(it.id || it.Id)}>Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
"@
    $pagePath = Join-Path $scriptDir ("src/features/" + $mod + "/" + $PageName + ".jsx")
    Write-File-NoBOM -path $pagePath -content $pageContent
}

# Write App.jsx with navigation
$app = @'
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import UsersPage from "./features/users/UsersPage";
import TeamsPage from "./features/teams/TeamsPage";
import TasksPage from "./features/tasks/TasksPage";
import SermonsPage from "./features/sermons/SermonsPage";
import PrayerrequestsPage from "./features/prayerrequests/PrayerrequestsPage";
import MeetingsPage from "./features/meetings/MeetingsPage";
import AttachmentsPage from "./features/attachments/AttachmentsPage";

export default function App(){
 return(
  <Router>
    <div className="p-4">
      <nav className="mb-4 flex gap-4">
        <Link to="/users">Users</Link>
        <Link to="/teams">Teams</Link>
        <Link to="/tasks">Tasks</Link>
        <Link to="/sermons">Sermons</Link>
        <Link to="/prayerrequests">PrayerRequests</Link>
        <Link to="/meetings">Meetings</Link>
        <Link to="/attachments">Attachments</Link>
      </nav>
      <Routes>
        <Route path="/users" element={<UsersPage/>}/>
        <Route path="/teams" element={<TeamsPage/>}/>
        <Route path="/tasks" element={<TasksPage/>}/>
        <Route path="/sermons" element={<SermonsPage/>}/>
        <Route path="/prayerrequests" element={<PrayerrequestsPage/>}/>
        <Route path="/meetings" element={<MeetingsPage/>}/>
        <Route path="/attachments" element={<AttachmentsPage/>}/>
        <Route path="*" element={<div>Welcome to Mahima Admin UI</div>}/>
      </Routes>
    </div>
  </Router>
 );
}
'@

Write-File-NoBOM -path (Join-Path $scriptDir 'src/App.jsx') -content $app

Write-Host "`nSetup finished. Backups (if any) are in: $backupRoot"
Write-Host "Run `npm install react-router-dom react-hook-form` (if not installed) and then `npm run dev`."
