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