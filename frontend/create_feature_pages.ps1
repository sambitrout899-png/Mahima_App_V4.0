<#
create_feature_pages.ps1

Creates minimal src/features/<feature>/Page.jsx files for the main modules so imports from App.jsx resolve.

Run from project root (where package.json is):
  .\create_feature_pages.ps1

Each page:
 - calls <feature>Api.list()
 - renders a table using keys from first item
 - Add Record -> prompts for JSON payload and calls create()
 - Delete -> calls remove(id)

Safe behavior:
 - if Page.jsx already exists it will NOT be overwritten (it will backup first if overwrite needed)
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ensure running in project root
$cwd = (Get-Location).ProviderPath
Write-Host "Working directory: $cwd"

$features = @('users','teams','tasks','sermons','prayerrequests','meetings','attachments')
$baseDir = Join-Path $cwd 'src\features'

# helper to ensure directory
function Ensure-Dir($d) {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null; Write-Host "Created: $d" }
}

# write file helper (UTF8 no BOM) with backup if exists
function Write-NoBOM-File($path, $content) {
  $dir = Split-Path -Parent $path
  Ensure-Dir $dir
  if (Test-Path $path) {
    $bak = "$path.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"
    Copy-Item $path $bak -Force
    Write-Host "Backed up existing $path -> $(Split-Path $bak -Leaf)"
  }
  [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Wrote: $path"
}

foreach ($f in $features) {
  $dir = Join-Path $baseDir $f
  Ensure-Dir $dir

  $pagePath = Join-Path $dir 'Page.jsx'
  if (Test-Path $pagePath) {
    Write-Host "Skipping $pagePath (exists). If you want to recreate it, delete or rename the file and re-run this script."
    continue
  }

  # Each page imports its api client. For attachments, create differs because upload not implemented; still provide list/delete.
  $apiImport = "$f" + "Api"
  $apiFile = "../.. /api/$f" # placeholder will be replaced properly below
  # Build correct relative path: from src/features/<f>/Page.jsx to src/api/<f>.js => ../../api/<f>.js
  $apiRel = "../../api/$f"

  # Page content (JSX) - simple list, add via JSON prompt, delete
  $content = @"
import React, { useEffect, useState } from 'react';
import { ${apiImport} } from '${apiRel}';

export default function Page() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await ${apiImport}.list();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('Load error:', e);
      setError(e && e.message ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    // simple prompt for JSON to keep this minimal — paste something like: {"name":"Test","description":"x"}
    const raw = prompt('Enter JSON for new ${f} (example: {\"name\":\"Test\"}):');
    if (!raw) return;
    let payload;
    try { payload = JSON.parse(raw); } catch (ex) { alert('Invalid JSON'); return; }
    try {
      console.debug('[${f} create] payload', payload);
      await ${apiImport}.create(payload);
      await load();
      alert('Created');
    } catch (e) {
      console.error('Create error', e);
      alert('Create failed: ' + (e && e.message ? e.message : String(e)));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete record ' + id + '?')) return;
    try {
      await ${apiImport}.remove(id);
      await load();
      alert('Deleted');
    } catch (e) {
      console.error('Delete error', e);
      alert('Delete failed: ' + (e && e.message ? e.message : String(e)));
    }
  }

  if (loading) return <div className='text-center py-10'>Loading...</div>;
  if (error) return <div className='text-center py-10 text-red-600'>Error: {String(error)}</div>;

  // show empty state
  if (!items || items.length === 0) {
    return (
      <div className='space-y-4'>
        <div className='flex justify-between items-center'>
          <h2 className='text-xl font-semibold capitalize'>{'${f}'}</h2>
          <div>
            <button className='px-3 py-1 bg-red-600 text-white rounded' onClick={handleAdd}>Add Record</button>
          </div>
        </div>
        <div className='p-6 bg-white rounded shadow'>No records found.</div>
      </div>
    );
  }

  // derive columns from first item
  const cols = Object.keys(items[0]);

  return (
    <div>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-xl font-semibold capitalize'>{'${f}'}</h2>
        <div>
          <button className='px-3 py-1 bg-red-600 text-white rounded' onClick={handleAdd}>Add Record</button>
        </div>
      </div>

      <div className='overflow-auto rounded shadow'>
        <table className='min-w-full divide-y divide-red-200 bg-red-50'>
          <thead className='bg-red-100'>
            <tr>
              {cols.map(c => (
                <th key={c} className='px-4 py-2 text-left text-sm font-medium text-red-700'>{c}</th>
              ))}
              <th className='px-4 py-2 text-left text-sm font-medium text-red-700'>Actions</th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-red-200'>
            {items.map((it, idx) => (
              <tr key={idx} className='hover:bg-red-50'>
                {cols.map(c => (
                  <td key={c} className='px-4 py-2 text-sm text-gray-700'>{String(it[c] ?? '')}</td>
                ))}
                <td className='px-4 py-2'>
                  <button className='px-2 py-1 mr-2 border rounded text-sm' onClick={() => navigator.clipboard?.writeText(JSON.stringify(it))}>Copy</button>
                  <button className='px-2 py-1 bg-red-600 text-white rounded text-sm' onClick={() => handleDelete(it.id ?? it.Id ?? it.ID ?? it.ID)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
"@

  Write-NoBOM-File $pagePath $content
}

Write-Host "`nFinished creating feature pages (if they did not already exist)."
Write-Host "Restart dev server (npm run dev) and check for new pages at /users, /teams, /tasks, /sermons, /prayerrequests, /meetings, /attachments"
