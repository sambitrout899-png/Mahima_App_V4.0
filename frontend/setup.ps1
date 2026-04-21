# Write polished Mahima UI files (overwrite src/)
# Run this from: C:\Users\Administrator\Projects\mahima-frontend

# Ensure src folder exists
if (-not (Test-Path src)) { New-Item -ItemType Directory -Path src | Out-Null }
if (-not (Test-Path src\components)) { New-Item -ItemType Directory -Path src\components | Out-Null }
if (-not (Test-Path src\pages)) { New-Item -ItemType Directory -Path src\pages | Out-Null }
if (-not (Test-Path src\api)) { New-Item -ItemType Directory -Path src\api | Out-Null }

# src/main.jsx
@"
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const qc = new QueryClient()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
"@ | Set-Content -Path src\main.jsx -Encoding UTF8

# src/index.css (Tailwind + palette)
@"
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Mahima brand colors */
:root{
  --mahima-500: #4f46e5; /* indigo-600-ish */
  --mahima-400: #6366f1;
  --mahima-600: #4338ca;
  --accent-500: #06b6d4; /* cyan */
}

/* small utility tweaks */
body { background-color: #f8fafc; }
"@ | Set-Content -Path src\index.css -Encoding UTF8

# src/api/storage.js - localStorage data layer (CRUD)
@"
const KEY_USERS = 'mahima_users_v1'
const KEY_TEAMS = 'mahima_teams_v1'
const KEY_MEETINGS = 'mahima_meetings_v1'

function read(key){ try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
function write(key, arr){ localStorage.setItem(key, JSON.stringify(arr)) }

function id(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7) }

export const usersApi = {
  list: () => Promise.resolve(read(KEY_USERS)),
  get: (idv) => Promise.resolve(read(KEY_USERS).find(x=>x.id===idv)),
  create: (u) => {
    const all = read(KEY_USERS)
    const n = { ...u, id: id(), createdAt: new Date().toISOString() }
    all.unshift(n); write(KEY_USERS, all); return Promise.resolve(n)
  },
  update: (idv, patch) => {
    const all = read(KEY_USERS).map(x => x.id === idv ? ({ ...x, ...patch }) : x)
    write(KEY_USERS, all); return Promise.resolve(all.find(x=>x.id===idv))
  },
  delete: (idv) => {
    const all = read(KEY_USERS).filter(x=>x.id!==idv); write(KEY_USERS, all); return Promise.resolve()
  }
}

export const teamsApi = {
  list: () => Promise.resolve(read(KEY_TEAMS)),
  create: (t) => { const all=read(KEY_TEAMS); const n={...t,id:id()}; all.unshift(n); write(KEY_TEAMS, all); return Promise.resolve(n) },
  update: (idv,patch) => { const all = read(KEY_TEAMS).map(x=>x.id===idv?({...x,...patch}):x); write(KEY_TEAMS, all); return Promise.resolve(all.find(x=>x.id===idv)) },
  delete: (idv) => { const all = read(KEY_TEAMS).filter(x=>x.id!==idv); write(KEY_TEAMS, all); return Promise.resolve() }
}

export const meetingsApi = {
  list: () => Promise.resolve(read(KEY_MEETINGS)),
  create: (m) => { const all=read(KEY_MEETINGS); const n={...m,id:id()}; all.unshift(n); write(KEY_MEETINGS, all); return Promise.resolve(n) },
  update: (idv,patch) => { const all = read(KEY_MEETINGS).map(x=>x.id===idv?({...x,...patch}):x); write(KEY_MEETINGS, all); return Promise.resolve(all.find(x=>x.id===idv)) },
  delete: (idv) => { const all = read(KEY_MEETINGS).filter(x=>x.id!==idv); write(KEY_MEETINGS, all); return Promise.resolve() }
}
"@ | Set-Content -Path src\api\storage.js -Encoding UTF8

# src/components/Logo.jsx
@"
import React from 'react'
export default function Logo({ className='h-8 w-auto' }){
  return (
    <div className={className} aria-hidden='true'>
      <svg viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-8 w-8'>
        <rect width='48' height='48' rx='8' fill='var(--mahima-500)' />
        <path d='M14 30c4-6 10-10 18-10' stroke='white' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'/>
        <circle cx='34' cy='16' r='3.2' fill='white'/>
      </svg>
    </div>
  )
}
"@ | Set-Content -Path src\components\Logo.jsx -Encoding UTF8

# src/components/Modal.jsx
@"
import React from 'react'
export default function Modal({ open, title, onClose, children }){
  if (!open) return null
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/40' onClick={onClose}></div>
      <div className='relative bg-white rounded-lg shadow-lg w-full max-w-xl p-6 z-10'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-semibold'>{title}</h3>
          <button onClick={onClose} className='text-gray-500'>Close</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}
"@ | Set-Content -Path src\components\Modal.jsx -Encoding UTF8

# src/components/FormInput.jsx
@"
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
"@ | Set-Content -Path src\components\FormInput.jsx -Encoding UTF8

# src/components/Topbar.jsx
@"
import React from 'react'
import Logo from './Logo'
export default function Topbar(){ 
  return (
    <header className='h-16 bg-white flex items-center justify-between px-6 border-b'>
      <div className='flex items-center gap-3'>
        <Logo />
        <div className='hidden sm:block text-lg font-semibold'>Mahima Frontend</div>
      </div>
      <div className='flex items-center gap-3'>
        <div className='text-sm text-gray-600'>Sammy</div>
      </div>
    </header>
  )
}
"@ | Set-Content -Path src\components\Topbar.jsx -Encoding UTF8

# src/components/Sidebar.jsx
@"
import React from 'react'
import { NavLink } from 'react-router-dom'
import Logo from './Logo'
export default function Sidebar(){
  return (
    <aside className='w-64 bg-white border-r p-4 hidden md:block'>
      <div className='flex items-center gap-3 mb-6'>
        <Logo />
        <div className='font-bold text-xl'>Mahima</div>
      </div>
      <nav className='flex flex-col gap-1'>
        <NavLink to='/' className={({isActive})=>isActive? 'px-3 py-2 rounded bg-indigo-50 text-indigo-700':'px-3 py-2 rounded text-gray-700 hover:bg-gray-100'} end>Landing</NavLink>
        <NavLink to='/users' className={({isActive})=>isActive? 'px-3 py-2 rounded bg-indigo-50 text-indigo-700':'px-3 py-2 rounded text-gray-700 hover:bg-gray-100'}>Users</NavLink>
        <NavLink to='/teams' className={({isActive})=>isActive? 'px-3 py-2 rounded bg-indigo-50 text-indigo-700':'px-3 py-2 rounded text-gray-700 hover:bg-gray-100'}>Teams</NavLink>
        <NavLink to='/meetings' className={({isActive})=>isActive? 'px-3 py-2 rounded bg-indigo-50 text-indigo-700':'px-3 py-2 rounded text-gray-700 hover:bg-gray-100'}>Meetings</NavLink>
        <NavLink to='/health' className={({isActive})=>isActive? 'px-3 py-2 rounded bg-indigo-50 text-indigo-700':'px-3 py-2 rounded text-gray-700 hover:bg-gray-100'}>Health</NavLink>
      </nav>
    </aside>
  )
}
"@ | Set-Content -Path src\components\Sidebar.jsx -Encoding UTF8

# src/components/Layout.jsx
@"
import React from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout({ children }){
  return (
    <div className='min-h-screen flex bg-gray-50'>
      <Sidebar />
      <div className='flex-1 flex flex-col'>
        <Topbar />
        <main className='p-6 lg:p-10'>{children}</main>
      </div>
    </div>
  )
}
"@ | Set-Content -Path src\components\Layout.jsx -Encoding UTF8

# src/pages/Landing.jsx
@"
import React from 'react'
import { Link } from 'react-router-dom'
export default function Landing(){
  return (
    <div className='max-w-5xl mx-auto'>
      <div className='bg-white rounded-lg p-8 shadow-lg flex flex-col md:flex-row items-center gap-6'>
        <div>
          <h1 className='text-3xl font-bold mb-2'>Welcome to Mahima</h1>
          <p className='text-gray-600 mb-4'>A simple admin UI demo — manage users, teams and meetings with a beautiful interface.</p>
          <div className='flex gap-3'>
            <Link to='/users' className='px-4 py-2 bg-indigo-600 text-white rounded'>Manage Users</Link>
            <Link to='/teams' className='px-4 py-2 border rounded'>Manage Teams</Link>
          </div>
        </div>
        <div className='flex-1 text-center'>
          <img src='https://via.placeholder.com/320x180.png?text=Mahima+Illustration' alt='Mahima' className='mx-auto rounded' />
        </div>
      </div>

      <section className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-6'>
        <div className='bg-white p-4 rounded shadow'>
          <h3 className='font-semibold mb-2'>Fast</h3>
          <p className='text-sm text-gray-600'>Built with Vite + React for a snappy dev experience.</p>
        </div>
        <div className='bg-white p-4 rounded shadow'>
          <h3 className='font-semibold mb-2'>Extendable</h3>
          <p className='text-sm text-gray-600'>Replace localStorage with your backend by swapping the api/storage.js functions.</p>
        </div>
        <div className='bg-white p-4 rounded shadow'>
          <h3 className='font-semibold mb-2'>Beautiful</h3>
          <p className='text-sm text-gray-600'>Polished layout and accessible components out of the box.</p>
        </div>
      </section>
    </div>
  )
}
"@ | Set-Content -Path src\pages\Landing.jsx -Encoding UTF8

# src/pages/UsersPage.jsx
@"
import React, { useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import { usersApi } from '../api/storage'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function useUsers(){ return useQuery(['users'], usersApi.list) }

export default function UsersPage(){
  const qc = useQueryClient()
  const { data, isLoading } = useUsers()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ username:'', displayName:'', email:'' })

  const createM = useMutation(usersApi.create, { onSuccess: ()=>{ qc.invalidateQueries(['users']); setOpen(false); setForm({username:'',displayName:'',email:''}) }})
  const updateM = useMutation(({id,patch})=>usersApi.update(id,patch), { onSuccess: ()=>{ qc.invalidateQueries(['users']); setOpen(false); setEditing(null); setForm({username:'',displayName:'',email:''}) }})
  const deleteM = useMutation(usersApi.delete, { onSuccess: ()=> qc.invalidateQueries(['users']) })

  function startEdit(u){ setEditing(u); setForm({ username: u.username, displayName: u.displayName, email: u.email }); setOpen(true) }

  return (
    <Layout>
      <div className='flex items-center justify-between mb-4'>
        <h1 className='text-2xl font-bold'>Users</h1>
        <div>
          <button onClick={()=>{ setForm({username:'',displayName:'',email:''}); setEditing(null); setOpen(true) }} className='px-3 py-2 bg-indigo-600 text-white rounded'>Add User</button>
        </div>
      </div>

      <div className='space-y-2'>
        {isLoading && <div className='p-4 bg-white rounded shadow-sm'>Loading…</div>}
        {!isLoading && (data||[]).map(u=>(
          <div key={u.id} className='p-3 bg-white rounded shadow-sm flex justify-between items-center'>
            <div>
              <div className='font-medium'>{u.displayName || u.username}</div>
              <div className='text-xs text-gray-500'>{u.email}</div>
            </div>
            <div className='flex items-center gap-2'>
              <button onClick={()=>startEdit(u)} className='px-3 py-1 border rounded text-sm'>Edit</button>
              <button onClick={()=>{ if(confirm('Delete user?')) deleteM.mutate(u.id) }} className='px-3 py-1 rounded text-sm bg-red-50 text-red-700'>Delete</button>
            </div>
          </div>
        ))}
        {(data||[]).length===0 && <div className='p-4 bg-white rounded shadow-sm text-gray-500'>No users yet. Add one!</div>}
      </div>

      <Modal open={open} title={editing ? 'Edit user' : 'Add user'} onClose={()=>setOpen(false)}>
        <div className='space-y-3'>
          <FormInput label='Username' value={form.username} onChange={v=>setForm(s=>({...s,username:v}))} />
          <FormInput label='Display name' value={form.displayName} onChange={v=>setForm(s=>({...s,displayName:v}))} />
          <FormInput label='Email' value={form.email} onChange={v=>setForm(s=>({...s,email:v}))} />
          <div className='flex justify-end gap-2'>
            <button onClick={()=>setOpen(false)} className='px-3 py-2 border rounded'>Cancel</button>
            <button onClick={()=>{
              if (editing) updateM.mutate({ id: editing.id, patch: form })
              else createM.mutate(form)
            }} className='px-3 py-2 bg-indigo-600 text-white rounded'>{editing ? 'Save' : 'Create'}</button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
"@ | Set-Content -Path src\pages\UsersPage.jsx -Encoding UTF8

# src/pages/TeamsPage.jsx
@"
import React, { useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import { teamsApi } from '../api/storage'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function useTeams(){ return useQuery(['teams'], teamsApi.list) }

export default function TeamsPage(){
  const qc = useQueryClient()
  const { data, isLoading } = useTeams()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name:'', description:'' })

  const createM = useMutation(teamsApi.create, { onSuccess: ()=>{ qc.invalidateQueries(['teams']); setOpen(false); setForm({name:'',description:''}) }})
  const updateM = useMutation(({id,patch})=>teamsApi.update(id,patch), { onSuccess: ()=>{ qc.invalidateQueries(['teams']); setOpen(false); setEditing(null); setForm({name:'',description:''}) }})
  const deleteM = useMutation(teamsApi.delete, { onSuccess: ()=> qc.invalidateQueries(['teams']) })

  function startEdit(t){ setEditing(t); setForm({ name: t.name, description: t.description }); setOpen(true) }

  return (
    <Layout>
      <div className='flex items-center justify-between mb-4'>
        <h1 className='text-2xl font-bold'>Teams</h1>
        <div>
          <button onClick={()=>{ setForm({name:'',description:''}); setEditing(null); setOpen(true) }} className='px-3 py-2 bg-indigo-600 text-white rounded'>Add Team</button>
        </div>
      </div>

      <div className='space-y-2'>
        {isLoading && <div className='p-4 bg-white rounded shadow-sm'>Loading…</div>}
        {!isLoading && (data||[]).map(t=>(
          <div key={t.id} className='p-3 bg-white rounded shadow-sm flex justify-between items-center'>
            <div>
              <div className='font-medium'>{t.name}</div>
              <div className='text-xs text-gray-500'>{t.description}</div>
            </div>
            <div className='flex items-center gap-2'>
              <button onClick={()=>startEdit(t)} className='px-3 py-1 border rounded text-sm'>Edit</button>
              <button onClick={()=>{ if(confirm('Delete team?')) deleteM.mutate(t.id) }} className='px-3 py-1 rounded text-sm bg-red-50 text-red-700'>Delete</button>
            </div>
          </div>
        ))}
        {(data||[]).length===0 && <div className='p-4 bg-white rounded shadow-sm text-gray-500'>No teams yet. Add one!</div>}
      </div>

      <Modal open={open} title={editing ? 'Edit team' : 'Add team'} onClose={()=>setOpen(false)}>
        <div className='space-y-3'>
          <FormInput label='Team name' value={form.name} onChange={v=>setForm(s=>({...s,name:v}))} />
          <FormInput label='Description' value={form.description} onChange={v=>setForm(s=>({...s,description:v}))} />
          <div className='flex justify-end gap-2'>
            <button onClick={()=>setOpen(false)} className='px-3 py-2 border rounded'>Cancel</button>
            <button onClick={()=>{
              if (editing) updateM.mutate({ id: editing.id, patch: form })
              else createM.mutate(form)
            }} className='px-3 py-2 bg-indigo-600 text-white rounded'>{editing ? 'Save' : 'Create'}</button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
"@ | Set-Content -Path src\pages\TeamsPage.jsx -Encoding UTF8

# src/pages/MeetingsPage.jsx
@"
import React, { useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import { meetingsApi } from '../api/storage'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function useMeetings(){ return useQuery(['meetings'], meetingsApi.list) }

export default function MeetingsPage(){
  const qc = useQueryClient()
  const { data, isLoading } = useMeetings()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title:'', time:'', link:'' })

  const createM = useMutation(meetingsApi.create, { onSuccess: ()=>{ qc.invalidateQueries(['meetings']); setOpen(false); setForm({title:'',time:'',link:''}) }})
  const updateM = useMutation(({id,patch})=>meetingsApi.update(id,patch), { onSuccess: ()=>{ qc.invalidateQueries(['meetings']); setOpen(false); setEditing(null); setForm({title:'',time:'',link:''}) }})
  const deleteM = useMutation(meetingsApi.delete, { onSuccess: ()=> qc.invalidateQueries(['meetings']) })

  function startEdit(m){ setEditing(m); setForm({ title: m.title, time: m.time, link: m.link }); setOpen(true) }

  return (
    <Layout>
      <div className='flex items-center justify-between mb-4'>
        <h1 className='text-2xl font-bold'>Meetings</h1>
        <div>
          <button onClick={()=>{ setForm({title:'',time:'',link:''}); setEditing(null); setOpen(true) }} className='px-3 py-2 bg-indigo-600 text-white rounded'>Add Meeting</button>
        </div>
      </div>

      <div className='space-y-2'>
        {isLoading && <div className='p-4 bg-white rounded shadow-sm'>Loading…</div>}
        {!isLoading && (data||[]).map(m=>(
          <div key={m.id} className='p-3 bg-white rounded shadow-sm flex justify-between items-center'>
            <div>
              <div className='font-medium'>{m.title}</div>
              <div className='text-xs text-gray-500'>{m.time} • {m.link}</div>
            </div>
            <div className='flex items-center gap-2'>
              <button onClick={()=>startEdit(m)} className='px-3 py-1 border rounded text-sm'>Edit</button>
              <button onClick={()=>{ if(confirm('Delete meeting?')) deleteM.mutate(m.id) }} className='px-3 py-1 rounded text-sm bg-red-50 text-red-700'>Delete</button>
            </div>
          </div>
        ))}
        {(data||[]).length===0 && <div className='p-4 bg-white rounded shadow-sm text-gray-500'>No meetings yet. Add one!</div>}
      </div>

      <Modal open={open} title={editing ? 'Edit meeting' : 'Add meeting'} onClose={()=>setOpen(false)}>
        <div className='space-y-3'>
          <FormInput label='Title' value={form.title} onChange={v=>setForm(s=>({...s,title:v}))} />
          <FormInput label='Time' value={form.time} onChange={v=>setForm(s=>({...s,time:v}))} placeholder='2025-10-01 10:00' />
          <FormInput label='Link' value={form.link} onChange={v=>setForm(s=>({...s,link:v}))} />
          <div className='flex justify-end gap-2'>
            <button onClick={()=>setOpen(false)} className='px-3 py-2 border rounded'>Cancel</button>
            <button onClick={()=>{
              if (editing) updateM.mutate({ id: editing.id, patch: form })
              else createM.mutate(form)
            }} className='px-3 py-2 bg-indigo-600 text-white rounded'>{editing ? 'Save' : 'Create'}</button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
"@ | Set-Content -Path src\pages\MeetingsPage.jsx -Encoding UTF8

# src/pages/NotFound.jsx
@"
import React from 'react'
import Layout from '../components/Layout'
export default function NotFound(){ return (<Layout><div className='text-center py-20'><h2 className='text-2xl font-bold'>Page not found</h2></div></Layout>) }
"@ | Set-Content -Path src\pages\NotFound.jsx -Encoding UTF8

# src/App.jsx (routes)
@"
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import UsersPage from './pages/UsersPage'
import TeamsPage from './pages/TeamsPage'
import MeetingsPage from './pages/MeetingsPage'
import NotFound from './pages/NotFound'
import './index.css'

export default function App(){
  return (
    <Routes>
      <Route path='/' element={<Landing/>} />
      <Route path='/users' element={<UsersPage/>} />
      <Route path='/teams' element={<TeamsPage/>} />
      <Route path='/meetings' element={<MeetingsPage/>} />
      <Route path='*' element={<NotFound/>} />
    </Routes>
  )
}
"@ | Set-Content -Path src\App.jsx -Encoding UTF8

Write-Host 'Files written. Starting dev server...' -ForegroundColor Green
& 'C:\Program Files\nodejs\npm.cmd' run dev
