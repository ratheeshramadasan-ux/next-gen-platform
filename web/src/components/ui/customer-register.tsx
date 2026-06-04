'use client'

import * as React from 'react'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { registerUserAction } from '@/app/actions/accessActions';
import { AppInput } from './login-1';

const Logo = dynamic(() => import("@/components/ui/logo"));

interface CustomerRegisterProps {
  customerName: string;
  slug: string;
  tenantId: string;
  customerId: string;
  isRegistrationEnabled: boolean;
}

const CustomerRegister = ({ customerName, slug, tenantId, customerId, isRegistrationEnabled }: CustomerRegisterProps) => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });

  const handleMouseMove = (e: React.MouseEvent) => {
    const section = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - section.left,
      y: e.clientY - section.top
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const res = await registerUserAction({
      ...formData,
      tenantId,
      customerId
    });

    if (res.success) {
      setIsSuccess(true);
    } else {
      setError(res.error || "Registration failed.");
    }
    setIsSubmitting(false);
  };

  if (!isRegistrationEnabled) {
    return (
      <div className="min-h-screen w-full bg-[var(--color-bg)] flex items-center justify-center p-4">
        <div className="card w-full max-w-md bg-[var(--color-surface)]/80 backdrop-blur-xl rounded-sm p-10 text-center shadow-2xl border border-[var(--color-border)]">
          <h1 className="text-2xl font-bold text-[var(--color-heading)] mb-4">Registration Disabled</h1>
          <p className="text-[var(--color-text-secondary)] mb-6">This module is not accepting new registrations.</p>
          <a href={`/${slug}/login`} className="text-blue-500 hover:text-blue-400 no-underline transition-colors">Return to login</a>
        </div>
      </div>
    );
  }

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
            <Logo size={48} />
          </div>
          
          {isSuccess ? (
             <div className="text-center w-full">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                   <ShieldCheck size={32} />
                </div>
                <h1 className='text-2xl font-bold text-[var(--color-heading)] mb-4'>Registration Received</h1>
                <p className='text-sm text-[var(--color-text-secondary)] mb-8'>
                  Your account has been created and is now **Pending Approval**. A Tenant or Customer Administrator will review your request shortly. You will be notified once your access is activated.
                </p>
                <a href={`/${slug}/login`} className="w-full inline-block rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-8 py-3 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-muted-surface)] transition-colors">
                  Return to login
                </a>
             </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className='text-2xl font-bold text-[var(--color-heading)] mb-2'>Join {customerName}</h1>
                <p className='text-sm text-[var(--color-text-secondary)]'>Create an account to get started.</p>
              </div>

              <form className='w-full flex flex-col gap-5' onSubmit={handleSubmit}>
                <AppInput 
                  placeholder="Full Name" 
                  type="text" 
                  required 
                  value={formData.fullName} 
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} 
                />
                <AppInput 
                  placeholder="Email Address" 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                />
                <AppInput 
                  placeholder="Password" 
                  type="password" 
                  required 
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                />
                
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-sm flex items-center gap-3 text-rose-500 text-[11px] font-bold">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}
                
                <button 
                  disabled={isSubmitting}
                  className="group/button relative w-full inline-flex justify-center items-center overflow-hidden rounded-md bg-[var(--color-text-primary)] px-8 py-3 mt-4 text-sm font-semibold text-[var(--color-bg)] transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-primary)]/50 disabled:opacity-70 disabled:hover:scale-100 cursor-pointer"
                >
                  <span className="relative z-10">{isSubmitting ? 'Registering...' : 'Create Account'}</span>
                  {!isSubmitting && (
                    <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                      <div className="relative h-full w-8 bg-white/20" />
                    </div>
                  )}
                </button>
              </form>

              <p className="mt-8 text-sm text-[var(--color-text-secondary)] text-center">
                Already have an account?{' '}
                <a href={`/${slug}/login`} className="font-semibold text-[var(--color-text-primary)] hover:underline transition-all">
                  Sign in
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomerRegister;
