
// src/features/teams/MembersPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Crown,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "../../utils/fetch-auth-shim";
import { useLanguage } from "../../i18n/LanguageContext";

const emptyAddForm = {
  userId: "",
  userLabel: "",
  role: "",
  markLeader: false,
};

const getPayload = (res) => res?.data ?? res;

const getArray = (value) => {
  const data = getPayload(value);
  const arr = Array.isArray(data)
    ? data
    : data?.items ?? data?.Items ?? data?.members ?? data?.Members ?? data?.data ?? data?.Data ?? [];

  return Array.isArray(arr) ? arr : [];
};

const isUniqueId = (value) => {
  const text = String(value || "").trim();
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text) ||
    /^[0-9a-f]{24}$/i.test(text)
  );
};

const cleanText = (value) => {
  const text = String(value || "").trim();
  return text && !isUniqueId(text) ? text : "";
};

const userIdOf = (item) => {
  if (!item) return "";
  const user = item.user ?? item.User ?? null;

  return (
    user?.id ??
    user?.userId ??
    user?.Id ??
    user?.UserId ??
    item.userId ??
    item.UserId ??
    item.id ??
    item.Id ??
    ""
  );
};

const membershipIdOf = (member) =>
  member?.membershipId ?? member?.MembershipId ?? member?.id ?? member?.Id ?? null;

const isLeaderOf = (member) =>
  Boolean(member?.IsLeader || member?.isLeader || member?.leader || member?.Leader);

const displayNameOf = (item) => {
  if (!item) return "Unknown user";

  const user = item.user ?? item.User ?? item;
  const firstLast = [user.firstName ?? user.FirstName, user.lastName ?? user.LastName]
    .filter(Boolean)
    .join(" ");

  return (
    cleanText(user.displayName) ||
    cleanText(user.DisplayName) ||
    cleanText(user.name) ||
    cleanText(user.Name) ||
    cleanText(user.fullName) ||
    cleanText(user.FullName) ||
    cleanText(firstLast) ||
    cleanText(user.userName) ||
    cleanText(user.username) ||
    cleanText(user.UserName) ||
    "Unknown user"
  );
};

const emailOf = (item) => {
  const user = item?.user ?? item?.User ?? item;
  return cleanText(user?.email ?? user?.Email ?? user?.emailAddress ?? user?.EmailAddress);
};

const usernameOf = (item) => {
  const user = item?.user ?? item?.User ?? item;
  return cleanText(user?.username ?? user?.userName ?? user?.UserName);
};

const roleOf = (member) =>
  member?.RoleInTeam ??
  member?.roleInTeam ??
  member?.role ??
  member?.Role ??
  member?.user?.role ??
  member?.User?.role ??
  "member";

const joinedOf = (member) => {
  const value =
    member?.JoinedAt ??
    member?.joinedAt ??
    member?.Joined ??
    member?.joined ??
    member?.joinDate ??
    member?.JoinDate ??
    null;

  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const initialsOf = (name) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function IconButton({
  icon: Icon,
  label,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  variant = "neutral",
  size = "md",
}) {
  return (
    <button
      type={type}
      className={`mm-icon-btn mm-icon-btn-${variant} mm-icon-btn-${size}`}
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      aria-label={label}
    >
      {loading ? <Loader2 className="mm-spin" size={18} /> : <Icon size={18} />}
      <span className="mm-tooltip">{label}</span>
    </button>
  );
}

function ActionButton({
  icon: Icon,
  children,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  variant = "primary",
}) {
  return (
    <button
      type={type}
      className={`mm-action-btn mm-action-btn-${variant}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <Loader2 className="mm-spin" size={18} /> : <Icon size={18} />}
      <span>{children}</span>
    </button>
  );
}

export default function MembersPage() {
  const { t } = useLanguage();
  const { teamId } = useParams();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userTeamsMap, setUserTeamsMap] = useState({});

  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);

  const [error, setError] = useState("");
  const [usersError, setUsersError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyAddForm);
  const [userSearch, setUserSearch] = useState("");

  const leader = members.find(isLeaderOf);

  const memberIdsSet = useMemo(
    () => new Set(members.map((member) => String(userIdOf(member))).filter(Boolean)),
    [members]
  );

  const enrichMembersWithUserDetails = useCallback(async (list) => {
    if (!Array.isArray(list) || list.length === 0) return;

    const ids = [
      ...new Set(
        list
          .filter((member) => displayNameOf(member) === "Unknown user")
          .map(userIdOf)
          .filter(Boolean)
          .map(String)
      ),
    ];

    if (ids.length === 0) return;

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const res = await apiFetch(`/users/${encodeURIComponent(id)}`);
        const data = getPayload(res);
        const user = Array.isArray(data)
          ? data[0]
          : data?.user ?? data?.User ?? data?.item ?? data?.Item ?? data;

        return { id, user };
      })
    );

    const usersById = {};
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.user) {
        usersById[String(result.value.id)] = result.value.user;
      }
    });

    if (Object.keys(usersById).length === 0) return;

    setMembers((prev) =>
      prev.map((member) => {
        const id = String(userIdOf(member));
        return usersById[id] ? { ...member, user: usersById[id] } : member;
      })
    );
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch(`/teams/${encodeURIComponent(teamId)}/members`);
      const list = getArray(res);

      setMembers(list);
      enrichMembersWithUserDetails(list);
    } catch (err) {
      console.error(err);
      setMembers([]);
      setError("Unable to load team members. Please check your session and try again.");
    } finally {
      setLoading(false);
    }
  }, [teamId, enrichMembersWithUserDetails]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const fetchUserTeamsAndUpdate = useCallback(async (id) => {
    if (!id) return;

    setUserTeamsMap((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), status: "loading" },
    }));

    try {
      const res = await apiFetch(`/users/${encodeURIComponent(id)}/teams`);
      const teams = getArray(res);

      setUserTeamsMap((prev) => ({
        ...prev,
        [id]: {
          status: "ready",
          teamsCount: teams.length,
          teams,
        },
      }));
    } catch (err) {
      console.warn("Unable to load teams for user", id, err);
      setUserTeamsMap((prev) => ({
        ...prev,
        [id]: { status: "error", teamsCount: null, teams: null },
      }));
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");

    try {
      const res = await apiFetch("/users?page=1&limit=5000");
      const users = getArray(res);

      setAllUsers(users);

      const initialMap = {};
      users.forEach((user) => {
        const id = userIdOf(user);
        if (id) initialMap[id] = { status: "idle", teamsCount: null, teams: null };
      });
      setUserTeamsMap(initialMap);

      await Promise.allSettled(
        users.slice(0, 30).map((user) => fetchUserTeamsAndUpdate(userIdOf(user)))
      );
    } catch (err) {
      console.error(err);
      setAllUsers([]);
      setUsersError("Unable to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, [fetchUserTeamsAndUpdate]);

  useEffect(() => {
    if (showAdd) fetchAllUsers();
  }, [showAdd, fetchAllUsers]);

  const closeAddModal = () => {
    if (saving) return;

    setShowAdd(false);
    setForm(emptyAddForm);
    setUserSearch("");
    setUsersError("");
  };

  const unsetLeaderMembership = async (member) => {
    const id = userIdOf(member);
    if (!id) return;

    await apiFetch(`/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({
        UserId: id,
        RoleInTeam: roleOf(member),
        IsLeader: false,
      }),
    });
  };

  const saveMembership = async ({ id, role, markLeader }) => {
    await apiFetch(`/teams/${encodeURIComponent(teamId)}/members`, {
      method: "POST",
      body: JSON.stringify({
        UserId: id,
        RoleInTeam: role?.trim() || null,
        IsLeader: Boolean(markLeader),
      }),
    });
  };

  const addMember = async (idOverride = "") => {
    const id = String(idOverride || form.userId || "").trim();

    if (!id) {
      setError("Select a user first.");
      return;
    }

    setSaving(true);
    setBusyUserId(id);
    setError("");

    try {
      if (form.markLeader && leader && String(userIdOf(leader)) !== String(id)) {
        await unsetLeaderMembership(leader);
      }

      await saveMembership({
        id,
        role: form.role,
        markLeader: form.markLeader,
      });

      await loadMembers();
      await fetchUserTeamsAndUpdate(id);
      closeAddModal();
    } catch (err) {
      console.error(err);
      setError("Unable to add member. Please try again.");
    } finally {
      setSaving(false);
      setBusyUserId(null);
    }
  };

  const removeMember = async (member) => {
    const id = userIdOf(member);
    if (!id || !window.confirm("Remove this member?")) return;

    setBusyUserId(id);
    setError("");

    try {
      await apiFetch(`/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      await loadMembers();
      await fetchUserTeamsAndUpdate(id);
    } catch (err) {
      console.error(err);
      setError("Unable to remove member. Please try again.");
    } finally {
      setBusyUserId(null);
    }
  };

  const toggleLeader = async (member) => {
    const id = userIdOf(member);
    if (!id) return;

    const nextLeaderState = !isLeaderOf(member);
    setBusyUserId(id);
    setError("");

    try {
      if (nextLeaderState && leader && String(userIdOf(leader)) !== String(id)) {
        await unsetLeaderMembership(leader);
      }

      await apiFetch(`/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({
          UserId: id,
          RoleInTeam: roleOf(member),
          IsLeader: nextLeaderState,
        }),
      });

      await loadMembers();
    } catch (err) {
      console.error(err);
      setError("Unable to update leader. Please try again.");
    } finally {
      setBusyUserId(null);
    }
  };

  const editRole = async (member) => {
    const id = userIdOf(member);
    if (!id) return;

    const nextRole = window.prompt(`Enter role for ${displayNameOf(member)}`, roleOf(member));
    if (nextRole === null) return;

    setBusyUserId(id);
    setError("");

    try {
      await apiFetch(`/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({
          UserId: id,
          RoleInTeam: nextRole.trim() || null,
          IsLeader: isLeaderOf(member),
        }),
      });

      await loadMembers();
    } catch (err) {
      console.error(err);
      setError("Unable to update role. Please try again.");
    } finally {
      setBusyUserId(null);
    }
  };

  const chooseUser = (user) => {
    const id = userIdOf(user);
    const name = displayNameOf(user);

    setForm((prev) => ({
      ...prev,
      userId: id,
      userLabel: name,
      role: user.role ?? user.Role ?? prev.role,
    }));
  };

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return allUsers;

    return allUsers.filter((user) => {
      const name = displayNameOf(user).toLowerCase();
      const email = emailOf(user).toLowerCase();
      const username = usernameOf(user).toLowerCase();

      return name.includes(query) || email.includes(query) || username.includes(query);
    });
  }, [allUsers, userSearch]);

  return (
    <div className="mm-page" role="region" aria-label="Team members">
      <style>{`
        .mm-page {
          min-height: 100vh;
          padding: 14px;
          background: #f9f6ef;
          color: #332817;
        }

        .mm-header {
          display: grid;
          gap: 16px;
          margin-bottom: 18px;
        }

        .mm-title {
          margin: 0;
          color: #6b4f1d;
          font-size: clamp(26px, 8vw, 38px);
          line-height: 1.05;
          font-weight: 900;
        }

        .mm-subtitle {
          margin-top: 8px;
          color: #8a7a5c;
          font-size: 14px;
          line-height: 1.45;
        }

        .mm-toolbar {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
        }

        .mm-stats {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }

        .mm-stat {
          min-height: 58px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1px solid #eee2cf;
          border-radius: 12px;
          padding: 12px 14px;
          color: #6b4f1d;
          font-weight: 900;
          box-shadow: 0 8px 24px rgba(80, 60, 28, 0.06);
        }

        .mm-alert {
          margin-bottom: 14px;
          padding: 12px;
          border-radius: 12px;
          background: #fff3f3;
          color: #9b1c1c;
          border: 1px solid #ffd1d1;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          line-height: 1.4;
        }

        .mm-grid {
          display: grid;
          gap: 12px;
        }

        .mm-card {
          background: #fff;
          border: 1px solid #eee2cf;
          border-radius: 14px;
          padding: 14px;
          box-shadow: 0 8px 24px rgba(80, 60, 28, 0.08);
          display: grid;
          gap: 14px;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .mm-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(80, 60, 28, 0.12);
        }

        .mm-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .mm-avatar {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #efe4ca, #d7be83);
          color: #6b4f1d;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          flex-shrink: 0;
        }

        .mm-name {
          max-width: 100%;
          color: #332817;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mm-sub {
          margin-top: 4px;
          color: #777;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 68vw;
        }

        .mm-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        .mm-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 32px;
          padding: 6px 9px;
          border-radius: 9px;
          background: #f8f2e6;
          color: #6b4f1d;
          border: 1px solid #eadfca;
          font-size: 12px;
          font-weight: 900;
        }

        .mm-leader {
          background: #fff5d7;
          color: #8a5c00;
          border-color: #f1d77d;
        }

        .mm-card-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
        }

        .mm-empty {
          color: #76664b;
          background: #fff;
          border: 1px dashed #d8c9ad;
          border-radius: 12px;
          padding: 18px;
          line-height: 1.45;
        }

        .mm-icon-btn,
        .mm-action-btn {
          font-family: inherit;
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, color 160ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .mm-icon-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid;
          border-radius: 14px;
          width: 100%;
          min-width: 0;
        }

        .mm-icon-btn-md {
          height: 48px;
        }

        .mm-icon-btn-sm {
          width: 40px;
          height: 40px;
        }

        .mm-icon-btn-neutral {
          background: #fff;
          color: #6b4f1d;
          border-color: #e6dcc8;
        }

        .mm-icon-btn-soft {
          background: #f8f2e6;
          color: #6b4f1d;
          border-color: #eadfca;
        }

        .mm-icon-btn-primary {
          background: #6b4f1d;
          color: #fff;
          border-color: #6b4f1d;
        }

        .mm-icon-btn-danger {
          background: #fff5f5;
          color: #a83232;
          border-color: #f3c3c3;
        }

        .mm-icon-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(80, 60, 28, 0.14);
        }

        .mm-icon-btn-neutral:hover:not(:disabled),
        .mm-icon-btn-soft:hover:not(:disabled) {
          background: #efe4ca;
        }

        .mm-icon-btn-primary:hover:not(:disabled) {
          background: #5a4217;
        }

        .mm-icon-btn-danger:hover:not(:disabled) {
          background: #a83232;
          color: #fff;
          border-color: #a83232;
        }

        .mm-icon-btn:disabled,
        .mm-action-btn:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .mm-icon-btn:focus-visible,
        .mm-action-btn:focus-visible,
        .mm-input:focus {
          outline: none;
          box-shadow: 0 0 0 4px rgba(184, 155, 88, 0.22);
        }

        .mm-tooltip {
          display: none;
        }

        .mm-action-btn {
          width: 100%;
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 14px;
          padding: 0 14px;
          font-weight: 900;
          border: 1px solid;
          white-space: nowrap;
        }

        .mm-action-btn-primary {
          background: #6b4f1d;
          color: #fff;
          border-color: #6b4f1d;
        }

        .mm-action-btn-primary:hover:not(:disabled) {
          background: #5a4217;
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(80, 60, 28, 0.14);
        }

        .mm-action-btn-secondary {
          background: #fff;
          color: #6b4f1d;
          border-color: #e1d6c0;
        }

        .mm-action-btn-secondary:hover:not(:disabled) {
          background: #efe4ca;
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(80, 60, 28, 0.12);
        }

        .mm-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(38, 30, 18, 0.48);
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .mm-modal {
          width: 100%;
          max-height: 92vh;
          overflow: hidden;
          background: #fff;
          border: 1px solid #efe2cb;
          border-radius: 18px 18px 0 0;
          box-shadow: 0 -18px 60px rgba(0, 0, 0, 0.22);
          display: flex;
          flex-direction: column;
        }

        .mm-modal-header,
        .mm-modal-footer {
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid #f0e5d4;
        }

        .mm-modal-footer {
          border-top: 1px solid #f0e5d4;
          border-bottom: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding-bottom: max(14px, env(safe-area-inset-bottom));
        }

        .mm-modal-title {
          margin: 0;
          color: #332817;
          font-size: 20px;
          font-weight: 900;
        }

        .mm-modal-body {
          padding: 14px;
          overflow: auto;
        }

        .mm-form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .mm-field label {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          color: #8a7a5c;
          font-weight: 900;
        }

        .mm-input {
          width: 100%;
          height: 46px;
          border: 1px solid #ddd2bd;
          border-radius: 14px;
          background: #fff;
          color: #332817;
          padding: 0 12px;
          font-size: 16px;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .mm-input:focus {
          border-color: #b89b58;
        }

        .mm-search-wrap {
          position: sticky;
          top: -14px;
          z-index: 5;
          padding: 12px 0;
          margin: 10px 0 8px;
          background: #fff;
        }

        .mm-search-wrap svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #8a7a5c;
        }

        .mm-search-wrap .mm-input {
          padding-left: 40px;
        }

        .mm-user-list {
          display: grid;
          gap: 10px;
          max-height: none;
          overflow: visible;
        }

        .mm-user-row {
          display: grid;
          gap: 12px;
          background: #fffdfa;
          border: 1px solid #eee2cf;
          border-radius: 14px;
          padding: 12px;
        }

        .mm-spin {
          animation: mm-spin 0.8s linear infinite;
        }

        @keyframes mm-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (min-width: 640px) {
          .mm-page {
            padding: 24px;
          }

          .mm-header {
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: 20px;
            margin-bottom: 24px;
          }

          .mm-toolbar {
            display: flex;
            width: auto;
          }

          .mm-icon-btn {
            width: 42px;
          }

          .mm-icon-btn-md {
            height: 42px;
          }

          .mm-stats {
            grid-template-columns: repeat(2, max-content);
            gap: 12px;
            margin-bottom: 20px;
          }

          .mm-card {
            grid-template-columns: 1fr auto;
            align-items: center;
            padding: 16px;
          }

          .mm-card-actions {
            display: flex;
            width: auto;
          }

          .mm-modal-backdrop {
            align-items: center;
            padding: 16px;
          }

          .mm-modal {
            width: min(860px, 100%);
            max-height: 90vh;
            border-radius: 16px;
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
          }

          .mm-modal-header,
          .mm-modal-footer {
            padding: 18px;
          }

          .mm-modal-footer {
            display: flex;
            justify-content: flex-end;
          }

          .mm-action-btn {
            width: auto;
          }

          .mm-modal-body {
            padding: 18px;
          }

          .mm-form-grid {
            grid-template-columns: 1fr 220px;
          }

          .mm-user-row {
            grid-template-columns: 1fr auto;
            align-items: center;
          }

          .mm-user-list {
            max-height: 360px;
            overflow: auto;
            padding-right: 4px;
          }

          .mm-tooltip {
            position: absolute;
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%) translateY(4px);
            background: #332817;
            color: #fff;
            font-size: 11px;
            line-height: 1;
            padding: 7px 9px;
            border-radius: 8px;
            opacity: 0;
            pointer-events: none;
            white-space: nowrap;
            transition: opacity 140ms ease, transform 140ms ease;
            z-index: 20;
            display: block;
          }

          .mm-icon-btn:hover .mm-tooltip {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .mm-page {
          background:
            linear-gradient(180deg, rgba(255,255,255,.96), rgba(246,248,251,.96)),
            radial-gradient(circle at 100% 0%, rgba(4,120,87,.08), transparent 28rem) !important;
          color: var(--enterprise-ink, #102033) !important;
        }
        .mm-header,
        .mm-stat,
        .mm-card,
        .mm-modal,
        .mm-search-wrap {
          border-color: var(--enterprise-border, #dfe7ef) !important;
          border-radius: var(--enterprise-radius-lg, 12px) !important;
          background: var(--enterprise-surface, #ffffff) !important;
          box-shadow: var(--enterprise-shadow-sm, 0 1px 2px rgba(15,23,42,.05)) !important;
        }
        .mm-title,
        .mm-name,
        .mm-modal-title {
          color: var(--enterprise-ink, #102033) !important;
        }
        .mm-subtitle,
        .mm-meta,
        .mm-field label {
          color: var(--enterprise-muted, #617086) !important;
        }
        .mm-input {
          border-color: var(--enterprise-border, #dfe7ef) !important;
          border-radius: var(--enterprise-radius, 10px) !important;
          background: #ffffff !important;
          color: var(--enterprise-ink, #102033) !important;
        }
        .mm-input:focus {
          border-color: rgba(4,120,87,.68) !important;
          box-shadow: 0 0 0 4px rgba(4,120,87,.12) !important;
        }
        .mm-icon-btn-primary,
        .mm-action-btn-primary {
          border-color: transparent !important;
          background: linear-gradient(180deg, var(--enterprise-primary, #047857), var(--enterprise-primary-strong, #065f46)) !important;
          color: #ffffff !important;
          box-shadow: 0 8px 20px rgba(4,120,87,.18) !important;
        }
        .mm-icon-btn-soft,
        .mm-icon-btn-neutral,
        .mm-action-btn-secondary,
        .mm-icon-btn {
          border-color: var(--enterprise-border, #dfe7ef) !important;
          background: #ffffff !important;
          color: var(--enterprise-ink, #102033) !important;
        }
        .mm-badge,
        .mm-avatar {
          border-color: rgba(4,120,87,.22) !important;
          background: var(--enterprise-primary-soft, #ecfdf5) !important;
          color: var(--enterprise-primary-strong, #065f46) !important;
        }
      `}</style>

      <div className="mm-header">
        <div>
          <h2 className="mm-title">{t("page.members.title")} - {teamId}</h2>
          <div className="mm-subtitle">{t("page.members.subtitle")}</div>
        </div>

        <div className="mm-toolbar">
          <IconButton icon={ArrowLeft} label={t("page.members.back")} onClick={() => navigate(-1)} variant="neutral" />
          <IconButton icon={RefreshCw} label={t("page.members.refreshMembers")} onClick={loadMembers} loading={loading} variant="soft" />
          <IconButton icon={UserPlus} label={t("page.members.addMember")} onClick={() => setShowAdd(true)} variant="primary" />
        </div>
      </div>

      <div className="mm-stats">
        <div className="mm-stat">
          <Users size={18} />
          {t("page.members.members")}: {members.length}
        </div>
        <div className="mm-stat">
          <Crown size={18} />
          {t("page.members.leader")}: <span data-no-ui-translate>{leader ? displayNameOf(leader) : "-"}</span>
        </div>
      </div>

      {error && (
        <div className="mm-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="mm-grid">
        {loading ? (
          <div className="mm-empty">{t("page.members.loadingMembers")}</div>
        ) : members.length === 0 ? (
          <div className="mm-empty">{t("page.members.noMembers")}</div>
        ) : (
          members.map((member) => {
            const id = userIdOf(member);
            const mid = membershipIdOf(member);
            const name = displayNameOf(member);
            const busy = busyUserId === id;
            const memberLeader = isLeaderOf(member);

            return (
              <article className="mm-card" key={mid ?? id}>
                <div className="mm-left">
                  <div className="mm-avatar">{initialsOf(name)}</div>

                  <div>
                    <div className="mm-name" title={name} data-no-ui-translate>
                      {name}
                    </div>

                    <div className="mm-meta">
                      <span className="mm-badge" data-no-ui-translate>{String(roleOf(member)).toUpperCase()}</span>
                      {memberLeader && (
                        <span className="mm-badge mm-leader">
                          <Crown size={14} />
                          {t("page.members.leader")}
                        </span>
                      )}
                      <span className="mm-badge">{t("page.members.joined")}: <span data-no-ui-translate>{joinedOf(member)}</span></span>
                    </div>
                  </div>
                </div>

                <div className="mm-card-actions">
                  <IconButton
                    icon={Pencil}
                    label={t("page.members.editRole")}
                    onClick={() => editRole(member)}
                    disabled={Boolean(busyUserId)}
                    variant="neutral"
                  />

                  <IconButton
                    icon={ShieldCheck}
                    label={memberLeader ? t("page.members.unsetLeader") : t("page.members.setLeader")}
                    onClick={() => toggleLeader(member)}
                    loading={busy}
                    disabled={Boolean(busyUserId && busyUserId !== id)}
                    variant={memberLeader ? "soft" : "primary"}
                  />

                  <IconButton
                    icon={Trash2}
                    label={t("page.members.removeMember")}
                    onClick={() => removeMember(member)}
                    loading={busy}
                    disabled={Boolean(busyUserId && busyUserId !== id)}
                    variant="danger"
                  />
                </div>
              </article>
            );
          })
        )}
      </div>

      {showAdd && (
        <div className="mm-modal-backdrop" role="dialog" aria-modal="true">
          <div className="mm-modal">
            <div className="mm-modal-header">
              <h3 className="mm-modal-title">{t("page.members.addMember")}</h3>
              <IconButton icon={X} label={t("common.close")} onClick={closeAddModal} disabled={saving} size="sm" />
            </div>

            <div className="mm-modal-body">
              {usersError && (
                <div className="mm-alert">
                  <AlertCircle size={18} />
                  <span>{usersError}</span>
                </div>
              )}

              <div className="mm-form-grid">
                <div className="mm-field">
                  <label>{t("page.members.selectedUser")}</label>
                  <input
                    className="mm-input"
                    value={form.userLabel}
                    readOnly
                    placeholder={t("page.members.chooseUserBelow")}
                  />
                </div>

                <div className="mm-field">
                  <label>{t("common.role")}</label>
                  <input
                    className="mm-input"
                    value={form.role}
                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                    placeholder={t("page.members.optionalRole")}
                  />
                </div>
              </div>

              <label className="mm-badge" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.markLeader}
                  onChange={(e) => setForm((prev) => ({ ...prev, markLeader: e.target.checked }))}
                />
                {t("page.members.markLeader")}
              </label>

              <div className="mm-search-wrap">
                <Search size={18} />
                <input
                  className="mm-input"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t("page.members.searchUsers")}
                />
              </div>

              <div className="mm-user-list">
                {usersLoading ? (
                  <div className="mm-empty">{t("page.members.loadingUsers")}</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="mm-empty">{t("page.members.noUsers")}</div>
                ) : (
                  filteredUsers.map((user) => {
                    const id = userIdOf(user);
                    const name = displayNameOf(user);
                    const alreadyMember = memberIdsSet.has(String(id));
                    const info = userTeamsMap[id] ?? {};
                    const busy = busyUserId === id;
                    const contact = emailOf(user) || usernameOf(user);

                    return (
                      <div className="mm-user-row" key={id}>
                        <div className="mm-left">
                          <div className="mm-avatar">{initialsOf(name)}</div>
                          <div>
                            <div className="mm-name" data-no-ui-translate>{name}</div>
                            {contact && <div className="mm-sub" data-no-ui-translate>{contact}</div>}
                            <div className="mm-meta">
                              <span className="mm-badge" data-no-ui-translate>
                                {String(user.role ?? user.Role ?? "user").toUpperCase()}
                              </span>
                              <span className="mm-badge">
                                {info.status === "loading"
                                  ? "Checking teams"
                                  : typeof info.teamsCount === "number"
                                    ? `${info.teamsCount} team${info.teamsCount === 1 ? "" : "s"}`
                                    : "Teams unknown"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mm-card-actions">
                          <IconButton
                            icon={Plus}
                            label={t("page.members.useUser")}
                            onClick={() => chooseUser(user)}
                            disabled={saving}
                            variant="neutral"
                          />

                          <IconButton
                            icon={UserPlus}
                            label={alreadyMember ? t("page.members.alreadyInTeam") : t("page.members.addUser")}
                            onClick={() => addMember(id)}
                            loading={busy}
                            disabled={alreadyMember || saving}
                            variant="primary"
                          />

                          <IconButton
                            icon={RefreshCw}
                            label={t("page.members.refreshTeams")}
                            onClick={() => fetchUserTeamsAndUpdate(id)}
                            disabled={saving}
                            variant="soft"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mm-modal-footer">
              <ActionButton icon={X} onClick={closeAddModal} disabled={saving} variant="secondary">
                {t("common.cancel")}
              </ActionButton>

              <ActionButton icon={UserPlus} onClick={() => addMember()} loading={saving}>
                {t("page.members.addMember")}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
