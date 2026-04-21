import React from 'react'
export default function FormInput({ label, value, onChange, type='text', placeholder='' }){
  return (
    <label className='block'>
      <div className='text-sm text-gray-600 mb-1'>{label}</div>
      <input value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
             className='w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-300'/>
    </label>
  )
}
