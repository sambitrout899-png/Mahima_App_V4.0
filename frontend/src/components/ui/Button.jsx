import React from "react";

export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60";

  const variantClasses = variant === "primary"
    ? "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
    : variant === "danger"
      ? "bg-rose-600 text-white shadow-sm hover:bg-rose-700"
      : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50";

  const combined = `${base} ${variantClasses} ${className}`.trim();

  return (
    <button className={combined} {...props}>
      {children}
    </button>
  );
}
