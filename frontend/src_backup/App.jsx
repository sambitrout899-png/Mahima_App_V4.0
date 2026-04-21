// src/App.jsx
import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";


import Layout from "./components/Layout";

// pages
import UsersPage from "./features/users/Page";
import TeamsPage from "./features/teams/TeamsPage";
import MembersPage from "./features/teams/MembersPage";
import TasksPage from "./features/tasks/Page";
import SermonsPage from "./features/sermons/Page";
import PrayerRequestsPage from "./features/prayerrequests/Page";
import MeetingsPage from "./features/meetings/Page";
import AttachmentsPage from "./features/attachments/Page";
import PagesPage from "./features/pages/PagesPage";
import RolesPage from "./features/roles/RolesPage";
import TimesheetsPage from "./features/staff/TimesheetPage";
import AdminDashboard from "./features/admin/AdminDashboard";
import CostsPage from "./pages/CostsPage";
import BaptismsPage from "./pages/BaptismsPage";
import PayrollPage from "./pages/PayrollPage"; // ✅ NEW
import MarriagePage from "./pages/MarriagePage";
import CounsellingPage from "./pages/CounsellingPage";

// ✅ language provider (shared for whole app)
import { LanguageProvider } from "./i18n/LanguageContext.jsx";

// auth
import Login from "./features/auth/Login";
import { getToken } from "./features/auth/authService";

// permission helper
import { canAccessPage } from "./features/auth/permissionService";

// NEW: Home Landing Page
import HomeLanding, { ErrorBoundary } from "./features/home/HomeLanding";

// ✅ Real Chat Page
import ChatPage from "./pages/ChatPage";

// axios token helper
import { setAuthToken } from "./api";

/* ------------------------------------------------------
 * Auth Guards
 * ------------------------------------------------------ */
function RequireAuth({ children }) {
  const token = getToken();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const token = getToken();
  const location = useLocation();
  if (token) {
    const from = location.state?.from?.pathname ?? "/home";
    return <Navigate to={from} replace />;
  }
  return children;
}

function RequirePage({ page, children }) {
  const [allowed, setAllowed] = React.useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ok = await canAccessPage(page);
        if (mounted) setAllowed(Boolean(ok));
      } catch {
        if (mounted) setAllowed(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [page]);

  if (allowed === null) return <div style={{ padding: 20 }}>Checking permissions…</div>;
  if (!allowed)
    return (
      <div style={{ padding: 20, color: "darkred" }}>
        Access denied — you do not have permission to view this page.
      </div>
    );

  return children;
}

/* ------------------------------------------------------
 * App Component
 * ------------------------------------------------------ */
export default function App() {
  // ensure token is applied on startup
  useEffect(() => {
    const token = getToken();
    setAuthToken(token || null);
  }, []);

  return (
    <LanguageProvider>
      <ErrorBoundary>
        <Routes>
          {/* Public route: Login */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected area */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/home" replace />} />

            {/* Main landing */}
            <Route path="home" element={<HomeLanding />} />

            {/* ✅ Real Chat Page */}
            <Route path="chat" element={<ChatPage />} />

            {/* Pages with permissions */}
            <Route
              path="users"
              element={
                <RequirePage page="Users">
                  <UsersPage />
                </RequirePage>
              }
            />

            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/:teamId/members" element={<MembersPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="sermons" element={<SermonsPage />} />
            <Route path="prayerrequests" element={<PrayerRequestsPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="attachments" element={<AttachmentsPage />} />
            <Route path="pages" element={<PagesPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="/staff/timesheets" element={<TimesheetsPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/costs" element={<CostsPage />} />
            <Route path="/baptisms" element={<BaptismsPage />} />
	    <Route path="/marriage" element={<MarriagePage />} />
	    <Route path="/counselling" element={<CounsellingPage />} />

            {/* ✅ NEW Payroll route (protected, no extra permission gate for now) */}
            <Route path="/payroll" element={<PayrollPage />} />

            {/* Fallback inside auth zone */}
            <Route path="*" element={<HomeLanding />} />
          </Route>

          {/* Global fallback */}
          <Route path="*" element={<HomeLanding />} />
        </Routes>
      </ErrorBoundary>
    </LanguageProvider>
  );
}
