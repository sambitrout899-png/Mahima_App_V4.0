import React from 'react'
import Logo from './Logo'
export default function Topbar(){
  return (
    <header className='h-16 bg-white flex items-center justify-between px-6 border-b'>
      <div className='flex items-center gap-3'>
        <Logo />
        <div className='hidden sm:block text-lg font-semibold'>Mahima App</div>
      </div>
      <div className='flex items-center gap-3'>
        <div className='text-sm text-gray-600'>Sammy</div>
      </div>
    </header>
  )
}
