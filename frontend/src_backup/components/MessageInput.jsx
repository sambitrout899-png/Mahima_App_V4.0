// src/components/MessageInput.jsx
import React, { useState } from "react";

export default function MessageInput({ onSend, disabled }) {
  const [text, setText] = useState("");

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    try {
      await onSend(trimmed);
    } catch (err) {
      console.error("send failed", err);
      // Optionally show UI feedback
    }
  }

  return (
    <form className="p-3 border-t flex gap-2" onSubmit={handleSend}>
      <input
        className="flex-1 border rounded px-3 py-2"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
      <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit" disabled={disabled || !text.trim()}>
        Send
      </button>
    </form>
  );
}
