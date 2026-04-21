import React from 'react';

export default function UserRow({ user, onEdit, onDelete }) {
  return (
    <div className="p-4 bg-white rounded shadow-sm flex justify-between items-center">
      <div>
        <div className="font-medium">{user.displayName || user.username}</div>
        <div className="text-xs text-gray-500">{user.email}</div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onEdit} className="px-3 py-1 border rounded text-sm">Edit</button>
        <button onClick={()=>{ if(confirm('Delete user?')) onDelete() }} className="px-3 py-1 rounded text-sm bg-red-50 text-red-700">Delete</button>
      </div>
    </div>
  );
}
