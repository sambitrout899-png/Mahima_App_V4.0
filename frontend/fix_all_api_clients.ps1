<#
fix_strip_id_create.ps1

Usage:
  1. Open PowerShell.
  2. cd to your project root (where package.json lives), e.g.:
       cd C:\Users\Administrator\projects\mahima-frontend
  3. Run:
       .\fix_strip_id_create.ps1

What it does:
  - backs up existing src/api files to backup_api_stripid_YYYYMMDD_HHmmss
  - writes safe API client files (users.js, teams.js, tasks.js, meetings.js, prayerrequests.js, sermons.js, attachments.js)
    with create() functions that remove id/Id before POSTing.
  - outputs a summary of files written.

Important:
  - Restart dev server (npm run dev) after running.
  - Test Add/Create flows and check Network -> Request Payload that there is NO id/Id.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Ensure running from project root
$cwd = (Get-Location).ProviderPath
Write-Host "Working directory: $cwd"

$apiDirRelative = "src\api"
$apiDir = Join-Path $cwd $apiDirRelative
if (-not (Test-Path $apiDir)) {
  Write-Error "API directory not found: $apiDir"
  Write-Host "Make sure you run this from the project root (where package.json is)."
  exit 1
}

# backup folder
$ts = (Get-Date).ToString('yyyyMMdd_HHmmss')
$backup = Join-Path $cwd ("backup_api_stripid_$ts")
New-Item -ItemType Directory -Path $backup | Out-Null
Write-Host "Backing up existing api files to: $backup"

Get-ChildItem -Path $apiDir -Filter "*.js" -File | ForEach-Object {
  $src = $_.FullName
  $dest = Join-Path $backup $_.Name
  Copy-Item -Path $src -Destination $dest -Force
  Write-Host "Backed up: $($_.Name)"
}

function Write-NoBOM($path, $content) {
  $dir = Split-Path -Parent $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Wrote: $path"
}

# Templates for api clients (create deletes id and Id prior to sending)
$users = @'
import { call, cleanPayload } from "./_helper";

function sanitizeDates(obj){
  if(!obj || typeof obj !== "object") return obj;
  const out = {};
  for(const k of Object.keys(obj)){
    let v = obj[k];
    if (v === "") continue; // drop empty strings
    const lk = k.toLowerCase();
    if ((lk.includes("date") || lk.includes("time") || lk.includes("login")) && v) {
      const d = new Date(v);
      if(!isNaN(d)) v = d.toISOString();
      else continue; // skip non-parseable dates
    }
    out[k] = v;
  }
  return out;
}

export const usersApi = {
  list: ({ search = "", page = 1, limit = 50 } = {}) =>
    call(`/api/users?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`),

  get: (id) => call(`/api/users/${id}`),

  create: (p) => {
    let payload = cleanPayload(p) || {};
    // explicitly remove id fields to avoid duplicate-key errors on server
    delete payload.id;
    delete payload.Id;

    // sanitize date-like fields and strip empty strings
    payload = sanitizeDates(payload);

    try { console.debug("[usersApi.create] final payload:", payload); } catch(e) {}
    return call("/api/users", { method: "POST", body: JSON.stringify(payload) });
  },

  update: async (id, p) => {
    const payload = cleanPayload(p) || {};
    try {
      return await call(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } catch (e) {
      if (e && e.status === 405) {
        const fallback = { ...payload, id };
        try { console.debug("[usersApi.update] PUT 405 fallback POST payload:", fallback); } catch(e) {}
        return await call("/api/users", { method: "POST", body: JSON.stringify(fallback) });
      }
      throw e;
    }
  },

  remove: (id) => call(`/api/users/${id}`, { method: "DELETE" })
};
'@

$teams = @'
import { call, cleanPayload } from "./_helper";

export const teamsApi = {
  list: () => call("/api/teams"),
  get: (id) => call(`/api/teams/${id}`),
  create: (p) => {
    const payload = cleanPayload(p) || {};
    delete payload.id; delete payload.Id;
    try { console.debug("[teamsApi.create] payload:", payload); } catch(e) {}
    return call("/api/teams", { method: "POST", body: JSON.stringify(payload) });
  },
  update: async (id, p) => {
    const payload = cleanPayload(p) || {};
    try { return await call(`/api/teams/${id}`, { method: "PUT", body: JSON.stringify(payload) }); }
    catch (e) {
      if (e && e.status === 405) return await call("/api/teams", { method: "POST", body: JSON.stringify({...payload, id}) });
      throw e;
    }
  },
  remove: (id) => call(`/api/teams/${id}`, { method: "DELETE" })
};
'@

$tasks = @'
import { call, cleanPayload } from "./_helper";

export const tasksApi = {
  list: () => call("/api/tasks"),
  get: (id) => call(`/api/tasks/${id}`),
  create: (p) => {
    const payload = cleanPayload(p) || {};
    delete payload.id; delete payload.Id;
    try { console.debug("[tasksApi.create] payload:", payload); } catch(e) {}
    return call("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
  },
  update: async (id, p) => {
    const payload = cleanPayload(p) || {};
    try { return await call(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) }); }
    catch (e) {
      if (e && e.status === 405) return await call("/api/tasks", { method: "POST", body: JSON.stringify({...payload, id}) });
      throw e;
    }
  },
  remove: (id) => call(`/api/tasks/${id}`, { method: "DELETE" })
};
'@

$meetings = @'
import { call, cleanPayload } from "./_helper";

export const meetingsApi = {
  list: () => call("/api/meetings"),
  get: (id) => call(`/api/meetings/${id}`),
  create: (p) => {
    const payload = cleanPayload(p) || {};
    delete payload.id; delete payload.Id;
    try { console.debug("[meetingsApi.create] payload:", payload); } catch(e) {}
    return call("/api/meetings", { method: "POST", body: JSON.stringify(payload) });
  },
  update: async (id, p) => {
    const payload = cleanPayload(p) || {};
    try { return await call(`/api/meetings/${id}`, { method: "PUT", body: JSON.stringify(payload) }); }
    catch (e) {
      if (e && e.status === 405) return await call("/api/meetings", { method: "POST", body: JSON.stringify({...payload, id}) });
      throw e;
    }
  },
  remove: (id) => call(`/api/meetings/${id}`, { method: "DELETE" })
};
'@

$prayerrequests = @'
import { call, cleanPayload } from "./_helper";

export const prayerrequestsApi = {
  list: () => call("/api/prayerrequests"),
  get: (id) => call(`/api/prayerrequests/${id}`),
  create: (p) => {
    const payload = cleanPayload(p) || {};
    delete payload.id; delete payload.Id;
    try { console.debug("[prayerrequestsApi.create] payload:", payload); } catch(e) {}
    return call("/api/prayerrequests", { method: "POST", body: JSON.stringify(payload) });
  },
  update: async (id, p) => {
    const payload = cleanPayload(p) || {};
    try { return await call(`/api/prayerrequests/${id}`, { method: "PUT", body: JSON.stringify(payload) }); }
    catch (e) {
      if (e && e.status === 405) return await call("/api/prayerrequests", { method: "POST", body: JSON.stringify({...payload, id}) });
      throw e;
    }
  },
  remove: (id) => call(`/api/prayerrequests/${id}`, { method: "DELETE" })
};
'@

$sermons = @'
import { call, cleanPayload } from "./_helper";

export const sermonsApi = {
  list: () => call("/api/sermons"),
  get: (id) => call(`/api/sermons/${id}`),
  // backend may not support create/update/delete for sermons
  create: (p) => {
    const payload = cleanPayload(p) || {};
    delete payload.id; delete payload.Id;
    try { console.debug("[sermonsApi.create] payload:", payload); } catch(e) {}
    return call("/api/sermons", { method: "POST", body: JSON.stringify(payload) });
  }
};
'@

$attachments = @'
import { call } from "./_helper";

export const attachmentsApi = {
  list: () => call("/api/attachments"),
  get: (id) => call(`/api/attachments/${id}`)
  // For uploads, use FormData and a direct fetch from the UI (attachments page handles this)
};
'@

# Write files (absolute paths)
$map = @{
  "users.js" = $users;
  "teams.js" = $teams;
  "tasks.js" = $tasks;
  "meetings.js" = $meetings;
  "prayerrequests.js" = $prayerrequests;
  "sermons.js" = $sermons;
  "attachments.js" = $attachments;
}

foreach ($name in $map.Keys) {
  $target = Join-Path $apiDir $name
  # backup already done earlier; overwrite
  Write-NoBOM $target $map[$name]
}

Write-Host "`nAll API clients updated. Backup folder: $backup"
Write-Host "Restart dev server (npm run dev). Then verify: Create requests must NOT include id/Id in Request Payload."
Write-Host "If you still get duplicate key errors, open the Network tab, select the failing POST, copy Request Payload and Response body and paste them here and I'll adapt further."
