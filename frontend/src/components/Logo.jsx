import React from "react";
import { Link } from "react-router-dom";
export default function Logo({ size = 56 }) {
  return (
    <Link to="/" className="flex items-center space-x-3">
      <img src="/logo.png" alt="Mahima Ministry" width={size} height={size} className="rounded" />
      <div className="hidden sm:block">
        <div className="text-xl font-bold text-red-700">Mahima Ministry</div>
        <div className="text-sm text-gray-600">Admin UI</div>
      </div>
    </Link>
  );
}