// src/features/teams/MembersPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function MembersPage() {
  // route is nested under /teams/:teamId/members
  const { teamId } = useParams(); // ensure your route uses :teamId
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/teams/${encodeURIComponent(teamId)}/members`);
      if (!res.ok) throw new Error(`GET members failed ${res.status}`);
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) fetchMembers();
  }, [teamId]);

  const addMember = async () => {
    if (!newUserId || !newUserId.trim()) return alert("Enter UserId (UUID) of the user to add.");
    setAdding(true);
    try {
      const payload = { userId: newUserId.trim(), roleInTeam: newRole || null, isLeader: false };
      const res = await fetch(`${API_BASE}/api/teams/${encodeURIComponent(teamId)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!(res.ok || res.status === 201)) {
        const txt = await res.text();
        throw new Error(`POST failed ${res.status} - ${txt}`);
      }
      const created = await res.json();
      setMembers((m) => [...m, created]);
      setNewUserId("");
      setNewRole("");
    } catch (err) {
      console.error(err);
      alert("Add failed: " + (err.message || err));
    } finally {
      setAdding(false);
    }
  };

  const makeLeader = async (member) => {
    if (!window.confirm(`Make ${member.memberName ?? member.UserName ?? member.userName ?? String(member.userId ?? member.UserId)} the leader?`)) return;
    try {
      const userId = member.userId ?? member.UserId;
      const res = await fetch(`${API_BASE}/api/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleInTeam: member.roleInTeam ?? member.RoleInTeam, isLeader: true })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`PUT failed ${res.status} - ${txt}`);
      }
      await fetchMembers(); // refresh to reflect single-leader state
    } catch (err) {
      console.error(err);
      alert("Set leader failed: " + (err.message || err));
    }
  };

  const removeMember = async (member) => {
    if (!window.confirm("Remove member?")) return;
    try {
      const userId = member.userId ?? member.UserId;
      const res = await fetch(`${API_BASE}/api/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`, {
        method: "DELETE"
      });
      if (!(res.ok || res.status === 204)) {
        const txt = await res.text();
        throw new Error(`DELETE failed ${res.status} - ${txt}`);
      }
      setMembers((m) => m.filter(x => String(x.userId ?? x.UserId) !== String(userId)));
    } catch (err) {
      console.error(err);
      alert("Delete failed: " + (err.message || err));
    }
  };

  return (
    <div className="p-4 border rounded bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Members for Team {teamId}</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/teams")} className="px-2 py-1 border rounded bg-white">Back to Teams</button>
          <button onClick={fetchMembers} className="px-2 py-1 border rounded bg-white">Refresh</button>
        </div>
      </div>

      {error && <div className="mb-2 text-red-600">{error}</div>}

      <div className="mb-4 flex gap-2 items-center">
        <input value={newUserId} onChange={(e) => setNewUserId(e.target.value)} placeholder="UserId (UUID)" className="border rounded p-2" />
        <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Role (optional)" className="border rounded p-2" />
        <button onClick={addMember} disabled={adding} className="px-3 py-1 bg-blue-600 text-white rounded">{adding ? "Adding..." : "Add Member"}</button>
      </div>

      <div>
        {loading ? <div>Loading members…</div> : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className="border-b py-2">UserId</th>
                <th className="border-b py-2">Role</th>
                <th className="border-b py-2">Joined</th>
                <th className="border-b py-2">Leader</th>
                <th className="border-b py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const uid = m.userId ?? m.UserId;
                const role = m.roleInTeam ?? m.RoleInTeam;
                const joined = m.joinedAt ?? m.JoinedAt;
                const isLeader = (m.isLeader ?? m.IsLeader) === true;
                return (
                  <tr key={String(uid)} className="hover:bg-gray-50">
                    <td className="py-2 text-sm">{String(uid)}</td>
                    <td className="py-2">{role ?? "-"}</td>
                    <td className="py-2">{joined ? new Date(joined).toLocaleString() : "-"}</td>
                    <td className="py-2">{isLeader ? <strong>Leader</strong> : ""}</td>
                    <td className="py-2">
                      <button onClick={() => makeLeader(m)} className="mr-2 px-2 py-1 border rounded">Make Leader</button>
                      <button onClick={() => removeMember(m)} className="px-2 py-1 border rounded bg-red-50 text-red-600">Remove</button>
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && <tr><td colSpan={5} className="py-4 text-gray-600">No members yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
