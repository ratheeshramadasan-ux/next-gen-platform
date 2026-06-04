'use client'

import * as React from 'react'
import { useState } from 'react'
import Image from 'next/image';
import dynamic from 'next/dynamic';

const Logo = dynamic(() => import("@/components/ui/logo"));

interface InputProps {
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  [key: string]: any;
}

export const AppInput = (props: InputProps) => {
  const { label, placeholder, icon, type = "text", ...rest } = props;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div className="w-full relative">
      { label && 
        <label className='block mb-2 text-sm text-[var(--color-text-primary)]'>
          {label}
        </label>
      }
      <div className="relative w-full">
        <input
          type={type}
          className="peer relative z-10 border border-[var(--color-border)] h-12 w-full rounded-md bg-[var(--color-surface)] px-4 font-thin outline-none drop-shadow-sm transition-all duration-200 ease-in-out focus:bg-[var(--color-bg)] focus:ring-2 focus:ring-[var(--color-text-primary)]/20 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] placeholder:font-medium"
          placeholder={placeholder}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />
        {isHovering && (
          <>
            <div
              className="absolute pointer-events-none top-0 left-0 right-0 h-[1px] z-20 rounded-t-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 0px, var(--color-text-primary) 0%, transparent 70%)`,
              }}
            />
            <div
              className="absolute pointer-events-none bottom-0 left-0 right-0 h-[1px] z-20 rounded-b-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 1px, var(--color-text-primary) 0%, transparent 70%)`,
              }}
            />
          </>
        )}
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

const LoginPage = () => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const section = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - section.left,
      y: e.clientY - section.top
    });
  };

  return (
    <div className="min-h-screen w-full bg-[var(--color-bg)] flex items-center justify-center p-4">
      {/* Decorative ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <div 
        className='card w-full max-w-md bg-[var(--color-surface)]/80 backdrop-blur-xl rounded-sm overflow-hidden shadow-2xl border border-[var(--color-border)] relative'
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          className={`absolute pointer-events-none w-[300px] h-[300px] bg-gradient-to-r from-purple-300/10 via-blue-300/10 to-pink-300/10 rounded-full blur-3xl transition-opacity duration-200 ${
            isHovering ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            transform: `translate(${mousePosition.x - 150}px, ${mousePosition.y - 150}px)`,
            transition: 'transform 0.1s ease-out'
          }}
        />

        <div className="p-8 md:p-10 relative z-10 flex flex-col items-center">
          <div className="mb-8">
            <Logo size={56} />
          </div>
          
          <div className="text-center mb-8">
            <h1 className='text-3xl font-bold text-[var(--color-heading)] mb-2'>Super Admin</h1>
            <p className='text-sm text-[var(--color-text-secondary)]'>Sign in to manage the platform</p>
          </div>

          <form className='w-full flex flex-col gap-5' onSubmit={(e)=>{e.preventDefault();}}>
            <AppInput placeholder="Admin Email" type="email" />
            <AppInput placeholder="Password" type="password" />
            
            <div className="flex justify-between items-center mt-1">
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                <input type="checkbox" className="rounded border-[var(--color-border)] bg-[var(--color-surface)] text-blue-500 focus:ring-blue-500/20" />
                Remember me
              </label>
            </div>

            <button 
              className="group/button relative w-full inline-flex justify-center items-center overflow-hidden rounded-md bg-[var(--color-text-primary)] px-8 py-3 mt-4 text-sm font-semibold text-[var(--color-bg)] transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-primary)]/50 cursor-pointer"
            >
              <span className="relative z-10">Sign In</span>
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
