import React from 'react'
export default function Input({ label, id, error, ...props }) {
  return (
    <label className='block text-sm'>
      {label && <div className='mb-1 text-xs font-bold uppercase tracking-wide text-slate-500'>{label}</div>}
      <input id={id} {...props} className='w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'/>
      {error && <div className='mt-1 text-xs font-semibold text-rose-600'>{error}</div>}
    </label>
  )
}
