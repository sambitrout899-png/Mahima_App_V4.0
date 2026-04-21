import React from 'react'
export default function Input({ label, id, error, ...props }) {
  return (
    <label className='block text-sm'>
      {label && <div className='text-gray-600 mb-1'>{label}</div>}
      <input id={id} {...props} className='w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300'/>
      {error && <div className='text-xs text-red-600 mt-1'>{error}</div>}
    </label>
  )
}
