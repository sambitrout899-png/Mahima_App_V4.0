// src/components/Layout.jsx
import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { logout as authLogout, getToken } from "../features/auth/authService";
import mahimaLogo from "../assets/mahima-logo.png";
import {
  canAccessPage,
  getCurrentUser,
} from "../features/auth/permissionService";
import { setAuthToken } from "../api";

export default function Layout() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => getToken());
  const tokenRef = useRef(token);

  const [currentUser, setCurrentUser] = useState(null);
  const [perms, setPerms] = useState({});
  const [resolvedRoleName, setResolvedRoleName] = useState(null);

  const IDLE_TIMEOUT_MS = 120_000;
  const idleTimerIdRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // ---- MOBILE LAYOUT STATE ----
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const clearIdleTimer = () => {
    if (idleTimerIdRef.current) {
      clearTimeout(idleTimerIdRef.current);
      idleTimerIdRef.current = null;
    }
  };

  const doLogoutIfStillAuthed = () => {
    const t = getToken();
    if (t) onLogout();
  };

  const startIdleTimer = () => {
    clearIdleTimer();
    idleTimerIdRef.current = setTimeout(
      doLogoutIfStillAuthed,
      IDLE_TIMEOUT_MS
    );
  };

  const handleUserActivity = () => {
    if (!tokenRef.current) return;
    lastActivityRef.current = Date.now();
    startIdleTimer();
  };

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    try {
      setAuthToken(token);
    } catch {}
    const handler = (e) => {
      const t = e?.detail?.token ?? getToken();
      try {
        setAuthToken(t);
      } catch {}
      tokenRef.current = t;
      setToken(t);
    };
    window.addEventListener("auth:change", handler);
    return () => window.removeEventListener("auth:change", handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    const id = setInterval(() => {
      if (!mounted) return;
      try {
        const t = getToken();
        if (t !== tokenRef.current) {
          tokenRef.current = t;
          setToken(t);
        }
      } catch {}
    }, 700);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "pointerdown",
      "wheel",
    ];
    events.forEach((ev) =>
      window.addEventListener(ev, handleUserActivity, { passive: true })
    );
    const visHandler = () => handleUserActivity();
    document.addEventListener("visibilitychange", visHandler);

    if (tokenRef.current) {
      lastActivityRef.current = Date.now();
      startIdleTimer();
    } else {
      clearIdleTimer();
    }

    return () => {
      events.forEach((ev) =>
        window.removeEventListener(ev, handleUserActivity)
      );
      document.removeEventListener("visibilitychange", visHandler);
      clearIdleTimer();
    };
  }, [token]);

  // ---- HANDLE RESIZE FOR MOBILE / DESKTOP ----
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---------------- NAVIGATION ITEMS -------------------
  const NAV_PAGES = [
    { key: "Users", label: "Users", to: "/users" },
    { key: "Teams", label: "Teams", to: "/teams" },
    { key: "Pages", label: "Pages", to: "/pages" },
    { key: "Roles", label: "Roles", to: "/roles" },
    { key: "Tasks", label: "Tasks", to: "/tasks" },
    { key: "Sermons", label: "Resources", to: "/sermons" },
    { key: "PrayerRequests", label: "Prayer Requests", to: "/prayerrequests" },
    { key: "Meetings", label: "Meetings", to: "/meetings" },
    { key: "Attachments", label: "Attachments", to: "/attachments" },
    { key: "Timesheets", label: "Timesheets", to: "/staff/timesheets" },
    { key: "Marriage", label: "Marriage", to: "/marriage" },

    // Payroll
    { key: "Payroll", label: "Payroll", to: "/payroll" },

    // NEW Pastoral Counselling
    { key: "Counselling", label: "Counselling", to: "/counselling" },

    { key: "AdminDashboard", label: "Admin Dashboard", to: "/admin/dashboard" },
    { key: "Cost", label: "Costs", to: "/costs" },
    { key: "Baptisms", label: "Baptisms", to: "/baptisms" },
  ];

  // ---------------- PERMISSIONS -------------------
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const u = await getCurrentUser();
        if (!mounted) return;

        setCurrentUser(u);
        setResolvedRoleName(null);

        const checks = await Promise.all(
          NAV_PAGES.map((p) =>
            canAccessPage(p.key)
              .then((ok) => ({ key: p.key, ok }))
              .catch(() => ({ key: p.key, ok: false }))
          )
        );
        if (!mounted) return;

        const map = {};
        checks.forEach((c) => (map[c.key] = Boolean(c.ok)));

        const rawRoles = [];
        if (u?.role && typeof u.role === "string") rawRoles.push(u.role);
        if (Array.isArray(u?.roles)) {
          for (const r of u.roles) {
            if (!r) continue;
            if (typeof r === "string") rawRoles.push(r);
            else if (typeof r.name === "string") rawRoles.push(r.name);
            else if (typeof r.roleName === "string") rawRoles.push(r.roleName);
          }
        }

        const rolesLower = rawRoles.map((r) => r.toLowerCase().trim());
        const isAdmin = rolesLower.includes("admin");
        const isStaff = rolesLower.includes("staff");

        // Pick a primary role label to show in header
        //if (rawRoles.length > 0) {
          //setResolvedRoleName(rawRoles[0]);
      // } else
 if (u?.role && typeof u.role === "string") {
  if (u.role == 4) {
    setResolvedRoleName("Staff");
  } else if (u.role == 5) {
    setResolvedRoleName("Volunteer");
  } else if (u.role == 3) {
    setResolvedRoleName("Admin");
  }else if (u.role == 2) {
    setResolvedRoleName("Member");
  } else if (u.role == 6) {
    setResolvedRoleName("Believer");
  } else if (u.role == 9) {
    setResolvedRoleName("Pastor");
  } else {
    setResolvedRoleName(null);
  }
}

        // ensure staff/admin can see these even if no explicit page permission
        map.Timesheets = Boolean(map.Timesheets || isAdmin || isStaff);
        map.Payroll = Boolean(map.Payroll || isAdmin || isStaff);
        map.AdminDashboard = Boolean(map.AdminDashboard || isAdmin);
        map.Counselling = Boolean(map.Counselling || isAdmin || isStaff);
        map.Marriage = Boolean(map.Marriage || isAdmin || isStaff);

        setPerms(map);
      } catch {
        const fallback = {};
        NAV_PAGES.forEach((p) => (fallback[p.key] = true));
        setPerms(fallback);
      }
    })();

    return () => (mounted = false);
  }, [token]);

  // ---------------- LOGOUT -------------------
  function onLogout() {
    try {
      authLogout();
    } catch {
      try {
        localStorage.removeItem("mahima_token");
      } catch {}
    }
    tokenRef.current = null;
    setToken(null);
    navigate("/login", { replace: true });
  }

  // ---- NAV STYLES ----
  const navStyleDesktop = ({ isActive }) => ({
    padding: "6px 12px",
    borderRadius: 999,
    textDecoration: "none",
    color: isActive ? "#0b2a47" : "#3d4b57",
    background: isActive ? "rgba(11,42,71,0.08)" : "transparent",
    fontWeight: isActive ? 700 : 600,
    fontSize: 13,
    border: isActive ? "1px solid rgba(11,42,71,0.15)" : "1px solid transparent",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "background 0.18s ease, transform 0.12s ease, box-shadow 0.18s",
    boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
  });

  const navStyleMobile = ({ isActive }) => ({
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "12px 18px",
    borderRadius: 12,
    textDecoration: "none",
    color: isActive ? "#0b2a47" : "#364350",
    background: isActive ? "rgba(11,42,71,0.08)" : "#fff",
    fontWeight: isActive ? 700 : 600,
    fontSize: 14,
    border: "1px solid rgba(0,0,0,0.04)",
    marginBottom: 6,
  });

  const getInitials = (name) => {
    if (!name) return "—";
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0] || "")
      .join("")
      .toUpperCase();
  };

  const handleNavClick = () => {
    if (isMobile) setIsMobileNavOpen(false);
  };

  // ---------- HEADER USER INFO (DISPLAY NAME + ROLE) ----------
  const displayName =
    currentUser?.displayName ||
    currentUser?.name ||
    currentUser?.fullName ||
    currentUser?.userName ||
    currentUser?.email;

  return (
    <div
      className="no-overscroll"
      style={{
        minHeight: "calc(var(--vh) * 100)",
        background: "#fdf0f0",
        fontFamily: "Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* HEADER / TOP BAR */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 16px",
          background: "linear-gradient(90deg,#f8d7d7,#f6eaea)",
          borderBottom: "1px solid rgba(0,0,0,0.03)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Link
          to="/"
          style={{
            textDecoration: "none",
            color: "inherit",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(180deg,#fff6e3,#fff1d6)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              }}
            >
              <img
                src={mahimaLogo}
                alt="Mahima Ministry Logo"
                style={{
                  maxWidth: "70%",
                  maxHeight: "70%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#123a63",
                  lineHeight: 1.1,
                }}
              >
                Mahima Ministry
              </div>
              <div style={{ fontSize: 11, color: "#6f5f4f" }}>Member portal</div>
            </div>
          </div>
        </Link>

        {/* DESKTOP NAV */}
        <nav
          style={{
            display: isMobile ? "none" : "flex",
            gap: 8,
            marginLeft: 20,
            flex: "1 1 auto",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {NAV_PAGES.map((p) =>
            perms[p.key] ? (
              <NavLink
                key={p.key}
                to={p.to}
                style={navStyleDesktop}
                onClick={handleNavClick}
              >
                {p.label}
              </NavLink>
            ) : null
          )}
        </nav>

        {/* RIGHT SIDE: USER INFO + AVATAR + LOGOUT + MOBILE MENU BUTTON */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          {/* Display name + Role */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              maxWidth: 180,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#123a63",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={displayName || ""}
            >
              {displayName || "—"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#6f5f4f",
                textTransform: "capitalize",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={resolvedRoleName || ""}
            >
              {resolvedRoleName || "Role not set"}
            </div>
          </div>

          {/* User avatar initials */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "#fff7f2",
              border: "1px solid rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#123a63",
            }}
          >
            {getInitials(displayName)}
          </div>

          {/* Logout button */}
          <button
            onClick={onLogout}
            style={{
              padding: isMobile ? "6px 10px" : "8px 12px",
              borderRadius: 999,
              background: "#fff",
              fontWeight: 700,
              border: "1px solid rgba(0,0,0,0.06)",
              cursor: "pointer",
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span role="img" aria-label="lock">
              🔒
            </span>
            {!isMobile && <span>Sign out</span>}
          </button>

          {/* MOBILE MENU TOGGLE */}
          {isMobile && (
            <button
              onClick={() => setIsMobileNavOpen((x) => !x)}
              style={{
                border: "none",
                background: "#123a63",
                color: "#fff",
                borderRadius: 999,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
              }}
              aria-label="Toggle navigation menu"
            >
              {isMobileNavOpen ? "✕" : "☰"}
            </button>
          )}
        </div>
      </header>

      {/* MOBILE NAV OVERLAY */}
      {isMobile && isMobileNavOpen && (
        <div
          style={{
            position: "fixed",
            top: 68,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 25,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(0,0,0,0.42))",
          }}
          onClick={() => setIsMobileNavOpen(false)}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              maxHeight: "65vh",
              margin: "0 10px",
              marginTop: 8,
              padding: 10,
              background: "#fefefe",
              borderRadius: 18,
              boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.06,
                color: "#9a7e6b",
                marginBottom: 8,
                padding: "0 6px",
              }}
            >
              Navigation
            </div>
            <nav>
              {NAV_PAGES.map((p) =>
                perms[p.key] ? (
                  <NavLink
                    key={p.key}
                    to={p.to}
                    style={navStyleMobile}
                    onClick={handleNavClick}
                  >
                    {p.label}
                  </NavLink>
                ) : null
              )}
            </nav>
            <button
              onClick={onLogout}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "10px 14px",
                borderRadius: 999,
                border: "none",
                background: "#ff5c5c",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      <main style={{ padding: 20, paddingBottom: 80 }}>
        <Outlet context={{ currentUser }} />
      </main>

      <footer
        style={{
          padding: 16,
          textAlign: "center",
          color: "#6f5f4f",
          borderTop: "1px solid rgba(0,0,0,0.03)",
          fontSize: 12,
        }}
      >
        © {new Date().getFullYear()} Mahima Ministry
      </footer>

      <Link
        to="/chat"
        style={{
          right: 24,
          bottom: 24,
          position: "fixed",
          textDecoration: "none",
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            background: "linear-gradient(90deg,#2b6fb9,#1b4f8a)",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 999,
            boxShadow: "0 8px 28px rgba(27,79,138,0.18)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          💬 Chat
        </div>
      </Link>
    </div>
  );
}
