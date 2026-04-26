// src/App.jsx
import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Layout from "./components/Layout";
import Login from "./features/auth/Login";

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
import HomeLanding from "./features/home/HomeLanding";
import MembersPage from "./features/teams/MembersPage";
import SermonsPage from "./features/sermons/SermonsPage";

import { getToken } from "./features/auth/authService";
import { setAuthToken } from "./api";

/* ---------------- AUTH ---------------- */

function RequireAuth({ children }) {
  const token = localStorage.getItem("mahima_token");

  if (!token) {
    return <Navigate to="/" replace />; // go to homepage (public)
  }

  return children;
}/* ROLE + PAGE PERMISSION */

function RequireRole({ allowedRoles = [], requiredPage = null, children }) {
  const user = JSON.parse(localStorage.getItem("mahima_user") || "{}");

  const role = (user.role || "").toLowerCase();
  const pages = Array.isArray(user.pages) ? user.pages : [];

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/home" replace />;
  }

  if (requiredPage && !pages.includes(requiredPage)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

/* ---------------- APP ---------------- */

export default function App() {
  useEffect(() => {
    const token = getToken();
    if (token) setAuthToken(token);
  }, []);

  return (
    <Routes>
      {/* ? PUBLIC ROUTES */}
      <Route path="/" element={<HomeLanding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/sermons" element={<SermonsPage />} />

      {/* ? PROTECTED AREA */}
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

        {/* Common */}
        <Route path="home" element={<HomeLanding />} />

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
            <RequireRole allowedRoles={["admin"]}>
              <AdminDashboard />
            </RequireRole>
          }
        />

        {/* Teams Members */}
       
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

        {/* Sermons inside app (protected) */}
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
<Route path="/users" element={<Navigate to="/home/users" />} />
<Route path="/tasks" element={<Navigate to="/home/tasks" />} />
<Route path="/teams" element={<Navigate to="/home/teams" />} />
<Route path="/roles" element={<Navigate to="/home/roles" />} />
<Route path="/prayerrequests" element={<Navigate to="/home/prayerrequests" />} />
<Route path="/sermons" element={<Navigate to="/home/sermons" />} />
<Route path="/marriage" element={<Navigate to="/home/marriage" />} />
<Route path="/baptism" element={<Navigate to="/home/baptism" />} />
<Route path="/counselling" element={<Navigate to="/home/counselling" />} />
<Route path="/pages" element={<Navigate to="/home/pages" />} />
<Route path="/costs" element={<Navigate to="/home/costs" />} />
<Route path="/attendance" element={<Navigate to="/home/attendance" />} />
<Route path="/payroll" element={<Navigate to="/home/payroll" />} />


      {/* ? FALLBACK */}
    
    </Routes>
  );
}