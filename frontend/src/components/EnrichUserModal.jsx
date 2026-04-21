// src/components/EnrichUserModal.jsx
import React, { useState, useEffect, useRef } from "react";
import api from "../api";

const EnrichUserModal = ({ user, isOpen, onClose, onSaved }) => {
  const originalRef = useRef(null);

  const [form, setForm] = useState({
    birthday: null,
    maritalStatus: "",
    sex: "",
    isBaptized: null,
    baptismPlace: "",
    baptismDate: null,
    isBornAgain: null,
    isBeliever: null,
    age: undefined,
    aadharNumber: "",
    homeAddress: "",
    currentAddress: "",
    emergencyContactPhone: "",
    isPastor: null,
  });

  // ✅ Load + FIX PascalCase mapping
useEffect(() => {
  if (user && isOpen) {
    const formatDate = (val) => {
      if (!val) return null;
      try {
        return new Date(val).toISOString().split("T")[0];
      } catch {
        return null;
      }
    };

   const normalized = {
  birthday: formatDate(user.birthday ?? user.Birthday),
  maritalStatus: user.maritalStatus ?? user.MaritalStatus ?? null,
  sex: user.sex ?? user.Sex ?? null,
  isBaptized: user.isBaptized ?? user.IsBaptized ?? false,
  baptismPlace: user.baptismPlace ?? user.BaptismPlace ?? null,
  baptismDate: formatDate(user.baptismDate ?? user.BaptismDate),
  isBornAgain: user.isBornAgain ?? user.IsBornAgain ?? false,
  isBeliever: user.isBeliever ?? user.IsBeliever ?? false,
  age: user.age ?? user.Age ?? null,
  aadharNumber: user.aadharNumber ?? user.AadharNumber ?? null,
  homeAddress: user.homeAddress ?? user.HomeAddress ?? null,
  currentAddress: user.currentAddress ?? user.CurrentAddress ?? null,
  emergencyContactPhone:
    user.emergencyContactPhone ?? user.EmergencyContactPhone ?? null,
  isPastor: user.isPastor ?? user.IsPastor ?? false,
};

    setForm(normalized);
    originalRef.current = normalized;
  }
}, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (name === "age") {
      setForm((prev) => ({
        ...prev,
        [name]: value ? Number(value) : undefined,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ✅ Safe diff update
const buildPayload = () => {
  const original = originalRef.current || {};
  const payload = {};

  const map = {
    birthday: "Birthday",
    maritalStatus: "MaritalStatus",
    sex: "Sex",
    isBaptized: "IsBaptized",
    baptismPlace: "BaptismPlace",
    baptismDate: "BaptismDate",
    isBornAgain: "IsBornAgain",
    isBeliever: "IsBeliever",
    age: "Age",
    aadharNumber: "AadharNumber",
    homeAddress: "HomeAddress",
    currentAddress: "CurrentAddress",
    emergencyContactPhone: "EmergencyContactPhone",
    isPastor: "IsPastor",
  };

  for (const key in form) {
  const newVal = form[key];
  const oldVal = original[key];

  const isEqual = (a, b) => {
    if (a && b && typeof a === "string" && typeof b === "string") {
      return a.startsWith(b) || b.startsWith(a);
    }
    return JSON.stringify(a) === JSON.stringify(b);
  };

  if (isEqual(newVal, oldVal)) continue;

  payload[map[key]] =
    newVal === "" || newVal === undefined ? null : newVal;
}

  return payload;
};
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = buildPayload();

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      await api.put(`/users/${user.id}/enrich`, payload);

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error("Enrich failed:", err);
      alert(err?.message || "Failed to save enrichment");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40" style={{ zIndex: 120 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            Enrich user: {user.displayname || user.email}
          </h2>
          <button onClick={onClose} className="text-gray-500 text-xl">×</button>
        </div>

        {/* ✅ YOUR ORIGINAL FORM FULLY RESTORED */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label>Birthday</label>
              <input type="date" name="birthday" value={form.birthday ?? ""} onChange={handleChange} />
            </div>

            <div>
              <label>Marital Status</label>
              <input name="maritalStatus" value={form.maritalStatus ?? ""} onChange={handleChange} />
            </div>

            <div>
              <label>Sex</label>
              <select name="sex" value={form.sex ?? ""} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label>Age</label>
              <input type="number" name="age" value={form.age ?? ""} onChange={handleChange} />
            </div>

            <div>
              <label>Aadhar Number</label>
              <input name="aadharNumber" value={form.aadharNumber ?? ""} onChange={handleChange} />
            </div>

            <div>
              <label>Emergency Contact</label>
              <input name="emergencyContactPhone" value={form.emergencyContactPhone ?? ""} onChange={handleChange} />
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label>Baptism Date</label>
              <input type="date" name="baptismDate" value={form.baptismDate ?? ""} onChange={handleChange} />
            </div>

            <div>
              <label>Baptism Place</label>
              <input name="baptismPlace" value={form.baptismPlace ?? ""} onChange={handleChange} />
            </div>

            <div>
              <label>Home Address</label>
              <textarea name="homeAddress" value={form.homeAddress ?? ""} onChange={handleChange} />
            </div>

            <div>
              <label>Current Address</label>
              <textarea name="currentAddress" value={form.currentAddress ?? ""} onChange={handleChange} />
            </div>

          </div>

          <div className="flex gap-4">

            <label><input type="checkbox" name="isBaptized" checked={form.isBaptized || false} onChange={handleChange} /> Is Baptized</label>
            <label><input type="checkbox" name="isBornAgain" checked={form.isBornAgain || false} onChange={handleChange} /> Is Born Again</label>
            <label><input type="checkbox" name="isBeliever" checked={form.isBeliever || false} onChange={handleChange} /> Is Believer</label>
            <label><input type="checkbox" name="isPastor" checked={form.isPastor || false} onChange={handleChange} /> Is Pastor</label>

          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Save Enrichment</button>
          </div>

        </form>

      </div>
    </div>
  );
};
export default EnrichUserModal;
