# fix_modal_scroll.ps1
# Backs up src/components/_SimpleModal.jsx and writes a modal component with scrollable content.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$proj = (Get-Location).ProviderPath
$compDir = Join-Path $proj 'src\components'
$modalPath = Join-Path $compDir '_SimpleModal.jsx'

if (-not (Test-Path $compDir)) {
  New-Item -ItemType Directory -Path $compDir -Force | Out-Null
  Write-Host "Created folder: $compDir"
}

if (Test-Path $modalPath) {
  $bak = "$modalPath.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"
  Copy-Item $modalPath $bak -Force
  Write-Host "Backed up existing _SimpleModal.jsx -> $(Split-Path $bak -Leaf)"
}

$modalContent = @'
import React from "react";

/**
 * Simple modal with scrollable content area.
 *
 * Usage:
 *  <Modal title="Add" onClose={() => setOpen(false)}>
 *    <div>...form fields...</div>
 *  </Modal>
 *
 * The body area has max-height relative to the viewport and overflow:auto so long forms can scroll.
 */
export default function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* modal box */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-3xl"
      >
        <div className="bg-white rounded shadow-lg ring-1 ring-black/5 overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="inline-flex items-center justify-center h-9 w-9 rounded border"
            >
              X
            </button>
          </div>

          {/* body - scrollable */}
          <div
            className="px-6 py-4"
            style={{
              // keep body scrollable and constrained to viewport height:
              maxHeight: "calc(100vh - 160px)",
              overflow: "auto",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
'@

[System.IO.File]::WriteAllText($modalPath, $modalContent, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Wrote updated _SimpleModal.jsx with scrollable body: $modalPath"
Write-Host "`nDone. Vite should HMR and update the modal behaviour. If it doesn't change, restart the dev server (npm run dev)."
