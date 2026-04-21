import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../users';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import UserForm from './UserForm';
import UserRow from './UserRow';

// Page: list, search, pagination, create/edit/delete
export default function UsersPage(){
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading, error } = useQuery(['users', { search, page, pageSize }], () => usersApi.list({ search, page, limit: pageSize }), { keepPreviousData: true });

  const createM = useMutation(usersApi.create, { onSuccess: ()=> qc.invalidateQueries(['users']) });
  const updateM = useMutation(({id, payload}) => usersApi.update(id, payload), { onSuccess: ()=> qc.invalidateQueries(['users']) });
  const deleteM = useMutation((id) => usersApi.remove(id), { onSuccess: ()=> qc.invalidateQueries(['users']) });

  function openCreate(){ setEditing(null); setOpenForm(true); }
  function openEdit(u){ setEditing(u); setOpenForm(true); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="flex items-center gap-3">
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..." />
          <Button onClick={openCreate}>Add user</Button>
        </div>
      </div>

      <div>
        {isLoading && <div className="p-6 bg-white rounded shadow-sm flex items-center gap-3"><Spinner/> Loading users...</div>}
        {error && <div className="p-4 bg-red-50 text-red-700 rounded">Error loading users</div>}
        {!isLoading && data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(data.items || []).map(u => (
                <UserRow key={u.id} user={u} onEdit={()=>openEdit(u)} onDelete={()=>deleteM.mutate(u.id)} />
              ))}
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">Showing {(data.items||[]).length} of {data.total || 0}</div>
              <div className="flex items-center gap-2">
                <Button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} variant="ghost">Prev</Button>
                <div className="px-3 py-2 rounded bg-white border">{page}</div>
                <Button onClick={()=>setPage(p=>p+1)} variant="ghost">Next</Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={openForm} onClose={()=>setOpenForm(false)} title={editing ? 'Edit user' : 'Create user'}>
        <UserForm
          initial={editing}
          onCancel={()=>setOpenForm(false)}
          onCreate={async (payload) => { await createM.mutateAsync(payload); setOpenForm(false); }}
          onUpdate={async (id, payload) => { await updateM.mutateAsync({id, payload}); setOpenForm(false); }}
        />
      </Modal>
    </div>
  );
}
