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
      </nav>
    </aside>
  )
}
