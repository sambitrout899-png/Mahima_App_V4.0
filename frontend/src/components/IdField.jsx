import React, { useEffect } from "react";

/**
 * IdField component: readonly id input
 * Props:
 *  - form: object
 *  - setField: function(name, value)
 *
 * If no id present and setField is provided, a UUID will be generated and set.
 */
function genUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function IdField({ form = {}, setField }) {
  useEffect(() => {
    try {
      if ((!form || !form.id) && typeof setField === "function") {
        const uuid = genUuid();
        setField("id", uuid);
      }
    } catch (e) {
      // swallow errors from mismatch setField signatures
      // component still renders readonly input
      // eslint-disable-next-line no-console
      console.warn("IdField: setField call failed:", e);
    }
  }, [form, setField]);

  const valueToShow = form && form.id ? form.id : "";

  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      id
      <input
        readOnly
        value={valueToShow}
        placeholder="(auto-generated)"
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 4,
          boxSizing: "border-box",
        }}
        onChange={() => {}}
      />
    </label>
  );
}
