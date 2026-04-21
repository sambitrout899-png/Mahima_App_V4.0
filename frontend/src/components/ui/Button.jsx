import React from "react";

export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "px-4 py-2 rounded-md font-medium";

  const variantClasses = variant === "primary"
    ? "bg-blue-600 text-white hover:bg-blue-700"
    : "bg-gray-200 text-gray-800 hover:bg-gray-300";

  const combined = `${base} ${variantClasses} ${className}`.trim();

  return (
    <button className={combined} {...props}>
      {children}
    </button>
  );
}
