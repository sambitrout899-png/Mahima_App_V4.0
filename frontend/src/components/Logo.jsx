import React from "react";
import { Link } from "react-router-dom";
import TenantLogo from "./TenantLogo";

export default function Logo({ size = 56 }) {
  return (
    <Link to="/" className="flex items-center space-x-3">
      <TenantLogo name="Church" className="mahima-logo-spin-y rounded-lg" style={{ width: size, height: size }} />
      <div className="hidden sm:block">
        <div className="text-xl font-bold text-slate-800">Church Portal</div>
        <div className="text-sm text-gray-600">Tenant workspace</div>
      </div>
    </Link>
  );
}
