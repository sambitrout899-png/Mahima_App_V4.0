import React, { useState } from 'react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

// Small inline validation
function validate(payload){
  const errors = {};
  if (!payload.username || payload.username.length < 2) errors.username = 'Enter a username (min 2 chars)';
  if (!payload.displayName) errors.displayName = 'Enter display name';
  if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)) errors.email = 'Invalid email';
  return errors;
}

export default function UserForm({ initial = null, onCreate, onUpdate, onCancel }){
  const [form, setForm] = useState(initial ? { username: initial.username, displayName: initial.displayName, email: initial.email } : { username: '', displayName: '', email: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function submit(){
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      if (initial) await onUpdate(initial.id, form);
      else await onCreate(form);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Input label="Username" value={form.username} onChange={e=>setForm(s=>({...s,username:e.target.value}))} error={errors.username} />
      <Input label="Display name" value={form.displayName} onChange={e=>setForm(s=>({...s,displayName:e.target.value}))} error={errors.displayName} />
      <Input label="Email" value={form.email} onChange={e=>setForm(s=>({...s,email:e.target.value}))} error={errors.email} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit}>{loading ? 'Saving...' : (initial ? 'Save' : 'Create')}</Button>
      </div>
    </div>
  );
}
