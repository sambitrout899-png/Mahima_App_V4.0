import React, { useEffect, useState } from "react";
import api from "../../api/axios";
export function useChickenAccess() {
  const [access, setAccess] = useState({
    enabled: false,
    canAssign: false,
    loading: true
  });
  useEffect(() => {
    let active = true;
    const refresh = () => api.get("/chicken-sale/access").then(({
      data
    }) => active && setAccess({
      ...data,
      loading: false
    })).catch(() => active && setAccess({
      enabled: false,
      canAssign: false,
      loading: false
    }));
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("chicken-access-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("chicken-access-changed", refresh);
    };
  }, []);
  return access;
}
export function ChickenUserAssignment({
  userId
}) {
  const access = useChickenAccess();
  const [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    setMessage("");
    if (access.canAssign && userId) api.get(`/chicken-sale/access/${userId}`).then(({
      data
    }) => {
      if (active) {
        setEnabled(data.enabled);
        setBusy(false);
      }
    }).catch(() => active && setMessage("Unable to load chicken sale access. Reopen this user to retry."));
    return () => {
      active = false;
    };
  }, [userId, access.canAssign]);
  if (!access.canAssign || !userId) return null;
  const change = async () => {
    setBusy(true);
    setMessage("");
    try {
      const {
        data
      } = await api.put(`/chicken-sale/access/${userId}`, {
        enabled: !enabled
      });
      setEnabled(data.enabled);
      setMessage("Module assignment saved immediately.");
      window.dispatchEvent(new Event("chicken-access-changed"));
    } catch {
      setMessage("Assignment could not be saved. Please retry.");
    } finally {
      setBusy(false);
    }
  };
  return <div style={{
    padding: 16,
    marginTop: 16,
    border: "1px solid #d6e5df",
    borderRadius: 12,
    background: "#f2faf6"
  }}>
<label style={{
      display: "flex",
      alignItems: "center",
      gap: 10
    }}>
<input type="checkbox" checked={enabled} disabled={busy} onChange={change} />
<strong>Mahima Chicken Sale</strong>
</label>
<small>Assign access directly to this user. Changes save immediately and do not depend on their role.</small>{message && <p role="status">{message}</p>}</div>;
}
