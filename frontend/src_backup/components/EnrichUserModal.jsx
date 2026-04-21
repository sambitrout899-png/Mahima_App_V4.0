// src/components/EnrichUserModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const EnrichUserModal = ({ user, isOpen, onClose, onSaved }) => {
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

  useEffect(() => {
    if (user && isOpen) {
      setForm({
        birthday: user.birthday ?? null,
        maritalStatus: user.maritalStatus ?? "",
        sex: user.sex ?? "",
        isBaptized: user.isBaptized ?? null,
        baptismPlace: user.baptismPlace ?? "",
        baptismDate: user.baptismDate ?? null,
        isBornAgain: user.isBornAgain ?? null,
        isBeliever: user.isBeliever ?? null,
        age: user.age ?? undefined,
        aadharNumber: user.aadharNumber ?? "",
        homeAddress: user.homeAddress ?? "",
        currentAddress: user.currentAddress ?? "",
        emergencyContactPhone: user.emergencyContactPhone ?? "",
        isPastor: user.isPastor ?? null,
      });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.put(`/api/users/${user.id}/enrich`, form);
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40"
      style={{ zIndex: 120 }} // above topbar z=60
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            Enrich user: {user.displayName || user.email}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Birthday */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Birthday
              </label>
              <input
                type="date"
                name="birthday"
                value={form.birthday ?? ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {/* Marital Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Marital Status
              </label>
              <input
                type="text"
                name="maritalStatus"
                value={form.maritalStatus ?? ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Single / Married / Divorced / Widowed"
              />
            </div>

            {/* Sex */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Sex
              </label>
              <select
                name="sex"
                value={form.sex ?? ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Age
              </label>
              <input
                type="number"
                name="age"
                value={form.age ?? ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                min={0}
              />
            </div>

            {/* Aadhar Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Aadhar Number
              </label>
              <input
                type="text"
                name="aadharNumber"
                value={form.aadharNumber ?? ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {/* Emergency Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Emergency Contact Phone
              </label>
              <input
                type="text"
                name="emergencyContactPhone"
                value={form.emergencyContactPhone ?? ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {/* Baptism Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Baptism Date
              </label>
              <input
                type="date"
                name="baptismDate"
                value={form.baptismDate ?? ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {/* Baptism Place */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Baptism Place
              </label>
              <input
                type="text"
                name="baptismPlace"
                value={form.baptismPlace ?? ""}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Textareas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Home Address
              </label>
              <textarea
                name="homeAddress"
                value={form.homeAddress ?? ""}
                onChange={handleChange}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Current Address
              </label>
              <textarea
                name="currentAddress"
                value={form.currentAddress ?? ""}
                onChange={handleChange}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Boolean flags */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                name="isBaptized"
                checked={!!form.isBaptized}
                onChange={handleChange}
                className="rounded border-gray-300"
              />
              <span>Is Baptized</span>
            </label>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                name="isBornAgain"
                checked={!!form.isBornAgain}
                onChange={handleChange}
                className="rounded border-gray-300"
              />
              <span>Is Born Again</span>
            </label>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                name="isBeliever"
                checked={!!form.isBeliever}
                onChange={handleChange}
                className="rounded border-gray-300"
              />
              <span>Is Believer</span>
            </label>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                name="isPastor"
                checked={!!form.isPastor}
                onChange={handleChange}
                className="rounded border-gray-300"
              />
              <span>Is Pastor</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save Enrichment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrichUserModal;
