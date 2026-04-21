import React, { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { logout as authLogout } from "../features/auth/authService";
import mahimaLogo from "../assets/mahima-logo.png";
import { getCurrentUser } from "../features/auth/permissionService";

export default function Layout() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("mahima_user")) || null;
  } catch {
    return null;
  }
});
  const [allowedNav, setAllowedNav] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const ALL_NAV = [
    { key: "DASHBOARD", label: "Home", to: "/home" },
    { key: "USERS", label: "Users", to: "/users" },
    { key: "TEAMS", label: "Teams", to: "/teams" },
    { key: "TASKS", label: "Tasks", to: "/tasks" },
    { key: "ROLES", label: "Roles", to: "/roles" },
    { key: "PAGES", label: "Pages", to: "/pages" },
    { key: "PAYROLL", label: "Payroll", to: "/payroll" },
    { key: "PRAYER_REQUESTS", label: "Prayer Requests", to: "/prayerrequests" },
    { key: "ATTENDANCE", label: "Attendance", to: "/attendance" },
    { key: "MARRIAGE", label: "Marriage", to: "/marriage" },
    { key: "BAPTISM", label: "Baptism", to: "/baptism" },
    { key: "COUNSELLING", label: "Counselling", to: "/counselling" },
    { key: "ADMIN", label: "Admin", to: "/admin/dashboard" },
    { key: "COSTS", label: "Costs", to: "/costs" },
    { key: "SERMONS", label: "Sermons", to: "/sermons" }
  ];

  const ROLE_NAV = {
    admin: ALL_NAV,
    member: [
      { key: "DASHBOARD", label: "Home", to: "/home" },
      { key: "PRAYER_REQUESTS", label: "Prayer Requests", to: "/prayerrequests" },
      { key: "PAGES", label: "Resources", to: "/pages" },
    ],
    staff: [
      { key: "DASHBOARD", label: "Home", to: "/home" },
      { key: "TASKS", label: "Tasks", to: "/tasks" },
      { key: "PRAYER_REQUESTS", label: "Prayer Requests", to: "/prayerrequests" },
      { key: "ATTENDANCE", label: "Attendance", to: "/attendance" },
      { key: "PAGES", label: "Resources", to: "/pages" },
    ],
    volunteer: [
      { key: "DASHBOARD", label: "Home", to: "/home" },
      { key: "TASKS", label: "Tasks", to: "/tasks" },
      { key: "PRAYER_REQUESTS", label: "Prayer Requests", to: "/prayerrequests" },
      { key: "PAGES", label: "Resources", to: "/pages" },
    ],
    pastor: [
      { key: "DASHBOARD", label: "Home", to: "/home" },
      { key: "USERS", label: "Users", to: "/users" },
      { key: "ATTENDANCE", label: "Attendance", to: "/attendance" },
      { key: "BAPTISM", label: "Baptism", to: "/baptism" },
      { key: "COUNSELLING", label: "Counselling", to: "/counselling" },
      { key: "PAYROLL", label: "Payroll", to: "/payroll" },
    ],
  };

  useEffect(() => {
  (async () => {
    const u = await getCurrentUser().catch(() => null);

    // ?? Determine final user (API OR fallback)
    let finalUser = u;

    if (u) {
      localStorage.setItem("mahima_user", JSON.stringify(u));
    } else {
      const stored = localStorage.getItem("mahima_user");
      if (stored) {
        finalUser = JSON.parse(stored);
      }
    }

    // ? If still no user ? stop
    if (!finalUser) return;

    // ? Set user
    setUser(finalUser);

    const role = (finalUser.role || "").toLowerCase();
    const userPages = (finalUser.pages || []).map(p =>
      String(p).toUpperCase()
    );

    if (userPages.length > 0) {
      const filtered = ALL_NAV.filter(n =>
        userPages.includes(n.key)
      );
      setAllowedNav(filtered.length ? filtered : ROLE_NAV[role] || []);
    } else {
      setAllowedNav(ROLE_NAV[role] || []);
    }
  })();
}, []);

  function onLogout() {
    authLogout();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb" }}>

      {/* HEADER */}
      <header style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

          {/* MOBILE MENU */}
          <div style={hamburger} onClick={() => setMenuOpen(true)}>☰</div>

          {/* LOGO */}
          <Link to="/home" style={logoWrap}>
            <img src={mahimaLogo} style={{ width: 28 }} />
            <b style={{ fontSize: 14 }}>Mahima</b>
          </Link>

          {/* SINGLE MENU (DESKTOP) */}
          <div style={{ position: "relative" }}>
            <button
              style={menuBtn}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              Menu ▾
            </button>

            {dropdownOpen && (
              <div style={dropdown}>
                {allowedNav.map((p) => (
                  <NavLink
                    key={p.to}
                    to={p.to}
                    style={({ isActive }) => ({
                      ...dropLink,
                      background: isActive ? "#eef2ff" : "#fff",
                      color: isActive ? "#1d4ed8" : "#333",
                    })}
                    onClick={() => setDropdownOpen(false)}
                  >
                    {p.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13 }}>{user?.username}</span>
          <button style={logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {menuOpen && (
        <div style={overlay} onClick={() => setMenuOpen(false)}>
          <div style={drawer} onClick={(e) => e.stopPropagation()}>
            {allowedNav.map((p) => (
              <NavLink
                key={p.to}
                to={p.to}
                style={drawerLink}
                onClick={() => setMenuOpen(false)}
              >
                {p.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* MAIN */}
      <main style={{ padding: 16 }}>
        <Outlet />
      </main>

      {/* CHAT */}
      <div style={chatBtn}>💬</div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const header = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 12px",
  background: "#fff",
  alignItems: "center",
  position: "sticky",
  top: 0,
  zIndex: 100,
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
};

const logoWrap = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  textDecoration: "none",
  color: "#000",
};

const hamburger = {
  fontSize: 20,
  cursor: "pointer",
};

const menuBtn = {
  padding: "6px 10px",
  fontSize: 13,
  borderRadius: 6,
  background: "#f3f4f6",
  border: "none",
  cursor: "pointer",
};

const dropdown = {
  position: "absolute",
  top: 32,
  left: 0,
  background: "#fff",
  borderRadius: 8,
  boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
  minWidth: 200,
  overflow: "hidden",
};

const dropLink = {
  display: "block",
  padding: "10px 12px",
  textDecoration: "none",
  fontSize: 13,
};

const logoutBtn = {
  padding: "4px 8px",
  fontSize: 12,
  cursor: "pointer",
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  zIndex: 999,
};

const drawer = {
  width: 260,
  height: "100%",
  background: "#fff",
  padding: 16,
};

const drawerLink = {
  display: "block",
  padding: 10,
  textDecoration: "none",
  color: "#333",
};

const chatBtn = {
  position: "fixed",
  bottom: 20,
  right: 20,
  width: 50,
  height: 50,
  borderRadius: "50%",
  background: "#f59e0b",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
