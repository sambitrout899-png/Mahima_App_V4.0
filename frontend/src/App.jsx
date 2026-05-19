import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./features/auth/Login";
import ResetPassword from "./features/auth/ResetPassword";
import ChatPage from "./pages/ChatPage";
import PrayerRequestsPage from "./features/prayerrequests/Page";
import TimesheetPage from "./features/staff/TimesheetPage";
import MarriagePage from "./pages/MarriagePage";
import BaptismsPage from "./pages/BaptismsPage";
import CounsellingPage from "./pages/CounsellingPage";
import CostsPage from "./pages/CostsPage";
import UsersPage from "./features/users/Page";
import TeamsPage from "./features/teams/TeamsPage";
import TasksPage from "./features/tasks/Page";
import RolesPage from "./features/roles/RolesPage";
import PagesPage from "./features/pages/PagesPage";
import PayrollPage from "./pages/PayrollPage";
import AdminDashboard from "./features/admin/AdminDashboard";
import MinistryAutomationPage from "./features/admin/MinistryAutomationPage";
import UserLoginDashboard from "./features/admin/UserLoginDashboard";
import EmailClientPage from "./features/admin/EmailClientPage";
import GoogleDrivePage from "./features/admin/GoogleDrivePage";
import AdminLanguages from "./features/admin/AdminLanguages";
import ServerFilesPage from "./features/admin/ServerFilesPage";
import PastorPage from "./features/pastor/PastorPage";
import ReadMePage from "./features/pastor/ReadMePage";
import AppDownloadsPage from "./features/downloads/AppDownloadsPage";
import HomeLanding from "./features/home/HomeLanding";
import MembersPage from "./features/teams/MembersPage";
import SermonsPage from "./features/sermons/SermonsPage";
import { getToken } from "./features/auth/authService";
import { setAuthToken } from "./api";
import AppUpdatePrompt from "./components/AppUpdatePrompt";
import { getCurrentUser } from "./features/auth/permissionService";

/* ---------------- AUTH ---------------- */
function RequireAuth({ children }) {
  const token = localStorage.getItem("mahima_token");
  if (!token) {
    return <Navigate to="/" replace />; // go to homepage (public)
  }
  return children;
}

function isMobileAppMode() {
  try {
    return (
      import.meta.env.MODE === "mobile" ||
      Boolean(window.Capacitor?.isNativePlatform?.())
    );
  } catch {
    return false;
  }
}

function LandingRoute() {
  const token =
    localStorage.getItem("mahima_token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    getToken();

  if (isMobileAppMode() && token) {
    return <Navigate to="/home" replace />;
  }

  return <HomeLanding />;
}

/* ROLE + PAGE PERMISSION */
function RequireRole({ allowedRoles = [], requiredPage = null, strictPage = false, children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mahima_user") || "null"); }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCurrentUser()
      .then((freshUser) => {
        if (!cancelled) setUser(freshUser || null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-sm font-semibold text-slate-500">
        Loading permissions...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const role = (user.role || "").toLowerCase();
  const pages = Array.isArray(user.pages)
    ? user.pages.map((page) => String(page).toUpperCase())
    : [];
  const pageKey = requiredPage ? String(requiredPage).toUpperCase() : null;

  if (role === "admin") return children;

  const allowedRoleSet = allowedRoles.map((r) => String(r).toLowerCase());
  const roleAllowedByFallback =
    allowedRoleSet.length === 0 || allowedRoleSet.includes(role);

  // Page assignments are the source of truth for custom roles. The old
  // allowedRoles list is kept only as a fallback for users that have no
  // page-permission rows yet.
  if (pageKey) {
    if (pages.includes(pageKey)) return children;
    if (!strictPage && pages.length === 0 && roleAllowedByFallback) return children;
    return <Navigate to="/home" replace />;
  }

  if (!roleAllowedByFallback) return <Navigate to="/home" replace />;

  return children;
}

/* ---------------- APP ---------------- */
export default function App() {
  useEffect(() => {
    const token = getToken();
    if (token) setAuthToken(token);
  }, []);

  return (
    <>
      <AppUpdatePrompt />
      <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<LandingRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/app-downloads" element={<AppDownloadsPage publicMode />} />
      {/* NOTE: removed standalone <Route path="/sermons" element={<SermonsPage />}/>.
          It used to win over the redirect below, rendering Sermons without the
          Layout shell (no topbar, no sidebar). The bottom redirect now fires
          and sends users to /home/sermons where the Layout wraps the page. */}

      {/* PROTECTED AREA � wrapped in <Layout /> which provides topbar + sidebar */}
      <Route
        path="/home/*"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        {/* Default */}
        <Route index element={<HomeLanding />} />
        <Route path="home" element={<HomeLanding />} />
        <Route path="app-downloads" element={<AppDownloadsPage />} />

        {/* Admin */}
        <Route
          path="users"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="USERS">
              <UsersPage />
            </RequireRole>
          }
        />

        <Route
          path="chat"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />

        <Route
          path="pastor"
          element={
            <RequireRole allowedRoles={["admin", "staff"]} requiredPage="PASTOR" strictPage>
              <PastorPage />
            </RequireRole>
          }
        />

        <Route
          path="readme"
          element={
            <RequireRole allowedRoles={["admin", "staff"]} requiredPage="PASTOR" strictPage>
              <ReadMePage />
            </RequireRole>
          }
        />

        <Route
          path="teams"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="TEAMS">
              <TeamsPage />
            </RequireRole>
          }
        >
          <Route
            path=":teamId/members"
            element={
              <RequireRole allowedRoles={["admin", "staff"]}>
                <MembersPage />
              </RequireRole>
            }
          />
        </Route>

        <Route
          path="roles"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="ROLES">
              <RolesPage />
            </RequireRole>
          }
        />
        <Route
          path="pages"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="PAGES">
              <PagesPage />
            </RequireRole>
          }
        />
        <Route
          path="payroll"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="PAYROLL">
              <PayrollPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/dashboard"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="ADMIN_DASHBOARD">
              <AdminDashboard />
            </RequireRole>
          }
        />
        <Route
          path="admin/ministry-automation"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="MESSAGE_CENTER">
              <MinistryAutomationPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/live-users"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="LIVE_USERS">
              <UserLoginDashboard />
            </RequireRole>
          }
        />
        <Route
          path="admin/email"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="EMAIL_CLIENT">
              <EmailClientPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/google-drive"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="GOOGLE_DRIVE">
              <GoogleDrivePage />
            </RequireRole>
          }
        />
        <Route
          path="admin/server-files"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="SERVER_FILES">
              <ServerFilesPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/languages"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="LANGUAGES">
              <AdminLanguages />
            </RequireRole>
          }
        />

        {/* Tasks */}
        <Route
          path="tasks"
          element={
            <RequireRole
              allowedRoles={["admin", "staff", "volunteer"]}
              requiredPage="TASKS"
            >
              <TasksPage />
            </RequireRole>
          }
        />

        {/* Prayer Requests */}
        <Route
          path="prayerrequests"
          element={
            <RequireRole
              allowedRoles={["admin", "staff", "member"]}
              requiredPage="PRAYER_REQUESTS"
            >
              <PrayerRequestsPage />
            </RequireRole>
          }
        />

        {/* Attendance */}
        <Route
          path="attendance"
          element={
            <RequireRole
              allowedRoles={["admin", "staff"]}
              requiredPage="ATTENDANCE"
            >
              <TimesheetPage />
            </RequireRole>
          }
        />

        {/* Ministry */}
        <Route
          path="marriage"
          element={
            <RequireRole
              allowedRoles={["admin", "staff"]}
              requiredPage="MARRIAGE"
            >
              <MarriagePage />
            </RequireRole>
          }
        />
        <Route
          path="baptism"
          element={
            <RequireRole
              allowedRoles={["admin", "staff"]}
              requiredPage="BAPTISM"
            >
              <BaptismsPage />
            </RequireRole>
          }
        />
        <Route
          path="counselling"
          element={
            <RequireRole
              allowedRoles={["admin", "staff"]}
              requiredPage="COUNSELLING"
            >
              <CounsellingPage />
            </RequireRole>
          }
        />

        {/* Costs */}
        <Route
          path="costs"
          element={
            <RequireRole allowedRoles={["admin"]} requiredPage="COSTS">
              <CostsPage />
            </RequireRole>
          }
        />

        {/* Sermons inside the app shell */}
        <Route
          path="sermons"
          element={
            <RequireRole
              allowedRoles={["admin", "staff", "member"]}
              requiredPage="SERMONS"
            >
              <SermonsPage />
            </RequireRole>
          }
        />
      </Route>

      {/* Top-level redirects so old/bookmarked URLs still work. These only
          match if no earlier route did. */}
      <Route path="/users"          element={<Navigate to="/home/users"          replace />} />
      <Route path="/tasks"          element={<Navigate to="/home/tasks"          replace />} />
      <Route path="/teams"          element={<Navigate to="/home/teams"          replace />} />
      <Route path="/roles"          element={<Navigate to="/home/roles"          replace />} />
      <Route path="/prayerrequests" element={<Navigate to="/home/prayerrequests" replace />} />
      <Route path="/sermons"        element={<Navigate to="/home/sermons"        replace />} />
      <Route path="/marriage"       element={<Navigate to="/home/marriage"       replace />} />
      <Route path="/baptism"        element={<Navigate to="/home/baptism"        replace />} />
      <Route path="/counselling"    element={<Navigate to="/home/counselling"    replace />} />
      <Route path="/pages"          element={<Navigate to="/home/pages"          replace />} />
      <Route path="/costs"          element={<Navigate to="/home/costs"          replace />} />
      <Route path="/attendance"     element={<Navigate to="/home/attendance"     replace />} />
      <Route path="/payroll"        element={<Navigate to="/home/payroll"        replace />} />
      <Route path="/pastor"         element={<Navigate to="/home/pastor"         replace />} />
      <Route path="/readme"         element={<Navigate to="/home/readme"         replace />} />
      <Route path="/downloads"      element={<Navigate to="/app-downloads"       replace />} />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
