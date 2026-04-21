import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
// Assumptions: you have an AuthContext (useAuth) and RolesContext (useRoles) available
// and an API that returns `roles` and `pages` like described earlier.
// This file exports a single default React component that demonstrates:
// - ProtectedRoute component
// - useAllowedPages hook
// - Sidebar (MainNav) that shows pages dynamically
// - Example route wiring

// Replace these imports with your real contexts
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';

// -------------------- ProtectedRoute --------------------
export function ProtectedRoute({ pageKey, children, fallbackPath = '/not-authorized' }) {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();

  if (authLoading || rolesLoading) return <div className="p-4">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  const userRoleId = Number(user.roleId || user.role_id || 0);
  const userRoleName = (user.roleName || user.role || '').toString().trim();

  const roleObj = roles.find(r => (r.id && Number(r.id) === userRoleId) || (r.name && r.name.toLowerCase() === userRoleName.toLowerCase()));

  // debug helper (remove in production)
  // console.debug('ProtectedRoute:', { pageKey, userRoleId, userRoleName, roleObj });

  if (!roleObj) return <Navigate to={fallbackPath} replace />;
  if ((roleObj.name || '').toLowerCase() === 'admin') return children;

  const allowed = new Set(roleObj.permissions || []);
  if (allowed.has(pageKey)) return children;
  return <Navigate to={fallbackPath} replace />;
}

// -------------------- useAllowedPages hook --------------------
export function useAllowedPages() {
  const { user } = useAuth();
  const { roles = [], pages = [] } = useRoles();

  const roleObj = React.useMemo(() => {
    if (!user || !roles) return null;
    const userRoleId = Number(user.roleId || user.role_id || 0);
    const userRoleName = (user.roleName || user.role || '').toString().trim();
    return roles.find(r => (r.id && Number(r.id) === userRoleId) || (r.name && r.name.toLowerCase() === userRoleName.toLowerCase()));
  }, [user, roles]);

  return React.useMemo(() => {
    if (!roleObj) return [];
    if ((roleObj.name || '').toLowerCase() === 'admin') return pages;
    const allowed = new Set(roleObj.permissions || []);
    return pages.filter(p => allowed.has(p.key));
  }, [roleObj, pages]);
}

// -------------------- Sidebar / MainNav --------------------
function routeForPageKey(key) {
  switch (key) {
    case 'Users': return '/users';
    case 'Teams': return '/teams';
    case 'Tasks': return '/tasks';
    case 'Sermons': return '/sermons';
    case 'PrayerRequests': return '/prayer-requests';
    case 'ProgramsAndOfferings': return '/programs';
    case 'Payroll': return '/payroll';
    case 'TestimoniesAndOfferings': return '/testimonies-offerings';
    case 'Dashboard': return '/';
    default: return '/';
  }
}

export function Sidebar() {
  const pages = useAllowedPages();

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4">
      <h3 className="text-xl font-semibold mb-4">Navigation</h3>
      <ul className="space-y-2">
        {pages.map(p => (
          <li key={p.key}>
            <Link to={routeForPageKey(p.key)} className="block px-3 py-2 rounded hover:bg-gray-100">{p.title}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

// -------------------- Small page stubs --------------------
function Dashboard() { return <div className="p-6">Dashboard</div>; }
function UsersPage() { return <div className="p-6">Users (Admin only)</div>; }
function TeamsPage() { return <div className="p-6">Teams</div>; }
function TasksPage() { return <div className="p-6">Tasks</div>; }
function SermonsPage() { return <div className="p-6">Sermons</div>; }
function PrayerRequestsPage() { return <div className="p-6">Prayer Requests</div>; }
function ProgramsPage() { return <div className="p-6">Programs & Offerings</div>; }
function PayrollPage() { return <div className="p-6">Payroll</div>; }
function TestimoniesPage() { return <div className="p-6">Testimonies & Offerings</div>; }
function NotAuthorized() { return <div className="p-6 text-red-600">Not authorized</div>; }

// -------------------- Example App Integration --------------------
export default function RBACIntegrationExample() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />

          <Route path="/users" element={<ProtectedRoute pageKey={'Users'}><UsersPage /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute pageKey={'Teams'}><TeamsPage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute pageKey={'Tasks'}><TasksPage /></ProtectedRoute>} />
          <Route path="/sermons" element={<ProtectedRoute pageKey={'Sermons'}><SermonsPage /></ProtectedRoute>} />
          <Route path="/prayer-requests" element={<ProtectedRoute pageKey={'PrayerRequests'}><PrayerRequestsPage /></ProtectedRoute>} />
          <Route path="/programs" element={<ProtectedRoute pageKey={'ProgramsAndOfferings'}><ProgramsPage /></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute pageKey={'Payroll'}><PayrollPage /></ProtectedRoute>} />
          <Route path="/testimonies-offerings" element={<ProtectedRoute pageKey={'TestimoniesAndOfferings'}><TestimoniesPage /></ProtectedRoute>} />

          <Route path="/not-authorized" element={<NotAuthorized />} />
        </Routes>
      </main>
    </div>
  );
}
