// src/components/MessageItem.jsx
import React from "react";
import dayjs from "dayjs";

export default function MessageItem({ msg, currentUserId }) {
  const mine = msg.senderId === currentUserId;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} py-1`}>
      <div className={`${mine ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"} rounded-lg px-3 py-2 max-w-[70%]`}>
        <div className="text-sm">{msg.content}</div>
        <div className="text-[10px] text-slate-300 mt-1 text-right">{dayjs(msg.createdAt).format("HH:mm")}</div>
      </div>
    </div>
  );
}
