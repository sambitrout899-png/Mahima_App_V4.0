import React, { useEffect, useState } from "react";

export default function AdminLandingConfig() {
  const [page, setPage] = useState(null);

  useEffect(() => {
    fetch("/api/cms/landing")
      .then(r => r.json())
      .then(setPage);
  }, []);

  function toggleBlock(id) {
    setPage(p => ({
      ...p,
      blocks: p.blocks.map(b =>
        b.id === id ? { ...b, enabled: !b.enabled } : b
      )
    }));
  }

  async function save() {
    await fetch("/api/admin/landing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(page, null, 2)
    });
    alert("Saved");
  }

  if (!page) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Home Page Builder</h1>

      {page.blocks.map(block => (
        <div
          key={block.id}
          className="border rounded p-4 flex justify-between items-center"
        >
          <div>
            <strong>{block.type}</strong>
            <div className="text-sm text-gray-500">{block.id}</div>
          </div>

          <div className="flex gap-4 items-center">
            <label>
              <input
                type="checkbox"
                checked={block.enabled}
                onChange={() => toggleBlock(block.id)}
              />{" "}
              Enabled
            </label>
            <button className="text-blue-600">Edit</button>
          </div>
        </div>
      ))}

      <button
        onClick={save}
        className="bg-rose-600 text-white px-6 py-2 rounded"
      >
        Save Page
      </button>
    </div>
  );
}
