'use client'

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { activateAdminByTokenAction } from '@/app/actions/tenantActions';

const Logo = dynamic(() => import("@/components/ui/logo"));

function SlugActivationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const token = searchParams.get('token');

  const [step, setStep] = useState<'LOADING' | 'INPUT' | 'SUCCESS' | 'ERROR'>('LOADING');
  const [dob, setDob] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activatedAdmin, setActivatedAdmin] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setStep('ERROR');
      setErrorMsg('Activation token is missing or invalid.');
    } else {
      setStep('INPUT');
    }
  }, [token]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const result = await activateAdminByTokenAction(token!, dob || undefined);

      if (result.success) {
        setActivatedAdmin(result.admin);
        setStep('SUCCESS');
        setTimeout(() => router.push('/login'), 4000);
      } else {
        setErrorMsg(result.error || 'Activation failed. Please try again.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const displaySlug = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/3 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[var(--color-surface)]/80 backdrop-blur-2xl border border-[var(--color-border)] rounded-[2.5rem] p-10 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="mb-6">
            <Logo size={60} />
          </div>
          <h1 className="text-3xl font-black text-[var(--color-heading)] tracking-tight">Identity Activation</h1>
          
          {/* Customer-specific branding */}
          <div className="flex items-center gap-2 mt-3 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full">
            <Building2 size={14} className="text-primary" />
            <span className="text-xs font-bold text-primary tracking-wide">{displaySlug}</span>
          </div>
          
          <p className="text-sm text-[var(--color-text-secondary)] mt-3 font-medium">Enterprise Automation OS • Administrator Portal</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'INPUT' && (
            <motion.form 
              key="input"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onSubmit={handleActivate} 
              className="space-y-6"
            >
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-start gap-4">
                <ShieldCheck className="text-primary mt-1" size={24} />
                <div className="flex-1">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Identity Verification</p>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    You have been provisioned as an administrator for <b className="text-[var(--color-heading)]">{displaySlug}</b>. 
                    Verify your identity below to activate your account.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 ml-1">Date of Birth</label>
                <input 
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl h-14 px-5 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-2 ml-1">Optional — required only if your organization has configured DOB verification.</p>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm font-medium">
                  <AlertCircle size={18} /> {errorMsg}
                </div>
              )}

              <button 
                disabled={isLoading}
                className="w-full bg-[var(--color-text-primary)] text-[var(--color-bg)] h-14 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Activate My Account'}
              </button>
            </motion.form>
          )}

          {step === 'SUCCESS' && (
            <motion.div 
              key="success"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center py-10 space-y-4"
            >
              <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-2xl font-bold">Account Activated</h2>
              {activatedAdmin && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Welcome, <strong className="text-foreground">{activatedAdmin.firstName} {activatedAdmin.lastName}</strong></p>
                  <p>Organization: <strong className="text-foreground">{activatedAdmin.organization}</strong></p>
                </div>
              )}
              <p className="text-muted-foreground text-sm">Your administrator account is now active. Redirecting to login...</p>
            </motion.div>
          )}

          {step === 'ERROR' && (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-10 space-y-4"
            >
              <div className="w-20 h-20 bg-rose-500/20 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-500">
                <AlertCircle size={48} />
              </div>
              <h2 className="text-2xl font-bold">Activation Failed</h2>
              <p className="text-muted-foreground">{errorMsg}</p>
              <button 
                onClick={() => router.push('/login')}
                className="text-primary font-bold hover:underline"
              >
                Return to login
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
           Secure Handshake Protocol v2.1
        </div>
      </motion.div>
    </div>
  );
}

export default function SlugActivationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)]" />}>
      <SlugActivationContent />
    </Suspense>
  );
}
