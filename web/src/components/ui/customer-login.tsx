'use client'

import * as React from 'react'
import { useState } from 'react'
import dynamic from 'next/dynamic';

const Logo = dynamic(() => import("@/components/ui/logo"));
import { AppInput } from './login-1'; // Reusing the AppInput we just updated

interface CustomerLoginProps {
  customerId: string;
  customerName: string;
  logoUrl?: string | null;
  slug: string;
  isRegistrationEnabled: boolean;
}

const CustomerLogin = ({ customerId, customerName, logoUrl, slug, isRegistrationEnabled }: CustomerLoginProps) => {
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
          <div className="mb-8 block text-center">
            {logoUrl ? (
               <img src={logoUrl} alt={customerName} className="h-12 w-auto max-w-[200px] object-contain drop-shadow-md" />
            ) : (
               <Logo size={48} />
            )}
          </div>
          
          <div className="text-center mb-8">
            <h1 className='text-2xl font-bold text-[var(--color-heading)] mb-2'>Sign in to {customerName}</h1>
            <p className='text-sm text-[var(--color-text-secondary)]'>Welcome back! Please enter your details.</p>
          </div>

          <form className='w-full flex flex-col gap-5' onSubmit={(e)=>{e.preventDefault();}}>
            <AppInput placeholder="Email" type="email" />
            <AppInput placeholder="Password" type="password" />
            
            <div className="flex justify-between items-center mt-1">
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                <input type="checkbox" className="rounded border-[var(--color-border)] bg-[var(--color-surface)] text-blue-500 focus:ring-blue-500/20" />
                Remember me
              </label>
              <a href="#" className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors">Forgot password?</a>
            </div>

            <button 
              onClick={() => {
                localStorage.setItem("nextgen_active_customer", customerId);
                window.location.href = "/next-gen/overview";
              }}
              className="group/button relative w-full inline-flex justify-center items-center overflow-hidden rounded-md bg-[var(--color-text-primary)] px-8 py-3 mt-2 text-sm font-semibold text-[var(--color-bg)] transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-primary)]/50 cursor-pointer"
            >
              <span className="relative z-10">Sign In</span>
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
            </button>
          </form>

          {isRegistrationEnabled && (
            <p className="mt-8 text-sm text-[var(--color-text-secondary)] text-center">
              Don't have an account?{' '}
              <a href={`/${slug}/register`} className="font-semibold text-[var(--color-text-primary)] hover:underline transition-all">
                Sign up
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomerLogin;
