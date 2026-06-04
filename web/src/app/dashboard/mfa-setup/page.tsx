'use client'

import React, { useState } from 'react';
import { Smartphone, ShieldCheck, Copy, CheckCircle2, Loader2, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MFASetupPage() {
  const [step, setStep] = useState<'CHOICE' | 'QR' | 'VERIFY' | 'DONE'>('CHOICE');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const mockSecret = "JBSWY3DPEHPK3PXP"; // Base32 encoded secret

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulation
    setTimeout(() => {
      setIsLoading(false);
      setStep('DONE');
    }, 1500);
  };

  return (
    <div className="min-h-full bg-[var(--color-bg)] flex items-center justify-center p-6 relative">
      <div className="absolute top-0 right-0 p-10 opacity-10">
         <Smartphone size={400} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-[var(--color-surface)]/80 backdrop-blur-2xl border border-[var(--color-border)] rounded-sm p-12 shadow-2xl relative z-10"
      >
        <AnimatePresence mode="wait">
          {step === 'CHOICE' && (
            <motion.div key="choice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
               <h2 className="text-3xl font-black mb-2 tracking-tight uppercase">Enhance Security</h2>
               <p className="text-muted-foreground mb-8 font-medium">Multi-Factor Authentication is required for Super Admin accounts.</p>
               
               <div className="space-y-4">
                  <MethodCard 
                    title="Authenticator App" 
                    desc="Google, Okta, or Microsoft Authenticator" 
                    icon={Smartphone} 
                    onClick={() => setStep('QR')}
                    active
                  />
                  <MethodCard 
                    title="Security Key (FIDO2)" 
                    desc="YubiKey or Hardware Token" 
                    icon={Key} 
                    disabled
                  />
               </div>
            </motion.div>
          )}

          {step === 'QR' && (
            <motion.div key="qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               <h2 className="text-2xl font-bold mb-6">Setup Authenticator App</h2>
               <div className="flex flex-col md:flex-row gap-8 items-center bg-black/20 p-8 rounded-sm border border-white/5">
                  <div className="w-40 h-40 bg-white p-2 rounded-sm">
                    {/* Simulated QR Code */}
                    <div className="w-full h-full bg-black flex items-center justify-center text-white font-black text-center text-[10px] uppercase">
                       QR CODE<br/>PLACEHOLDER
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                     <p className="text-sm text-muted-foreground leading-relaxed">
                        1. Open your authenticator app.<br/>
                        2. Scan this QR code.<br/>
                        3. If you can’t scan, enter this code manually:
                     </p>
                     <div className="flex items-center gap-2 bg-muted p-3 rounded-sm border border-border group">
                        <code className="text-sm font-black text-primary flex-1">{mockSecret}</code>
                        <button className="p-1 hover:text-primary transition-colors"><Copy size={16}/></button>
                     </div>
                  </div>
               </div>
               <button 
                  onClick={() => setStep('VERIFY')}
                  className="w-full bg-white text-black h-14 rounded-sm font-black mt-8 hover:bg-white/90"
               >
                  I've scanned the code
               </button>
            </motion.div>
          )}

          {step === 'VERIFY' && (
            <motion.form key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleVerify}>
               <h2 className="text-2xl font-bold mb-2">Verify Connection</h2>
               <p className="text-sm text-muted-foreground mb-8">Enter the 6-digit code shown in your app.</p>
               
               <div className="flex justify-between gap-3 mb-8">
                  <input 
                    autoFocus
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full h-20 bg-muted/50 border border-primary/30 rounded-sm text-center text-4xl font-black tracking-[1rem] outline-none focus:ring-4 focus:ring-primary/20 transition-all placeholder:opacity-10"
                  />
               </div>

               <button 
                  disabled={isLoading || otp.length < 6}
                  className="w-full bg-primary text-white h-14 rounded-sm font-black uppercase text-xs tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
               >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Validate & Save'}
               </button>
            </motion.form>
          )}

          {step === 'DONE' && (
            <motion.div key="done" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-10">
               <div className="w-24 h-24 bg-emerald-500/20 border border-emerald-400/50 rounded-full flex items-center justify-center mx-auto text-emerald-400 mb-8 shadow-[0_0_50px_rgba(52,211,153,0.3)]">
                  <CheckCircle2 size={56} />
               </div>
               <h2 className="text-3xl font-black mb-2">Security Activated</h2>
               <p className="text-muted-foreground mb-10">Your account is now hardened with Multi-Factor Authentication.</p>
               <button 
                  onClick={() => window.location.href = '/dashboard/bot-agents'}
                  className="px-10 py-4 bg-white text-black rounded-sm font-black uppercase text-xs"
               >
                  Bot Agent Control
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

const MethodCard = ({ title, desc, icon: Icon, onClick, active, disabled }: any) => (
  <div 
    onClick={!disabled ? onClick : undefined}
    className={`p-6 border rounded-sm flex items-center gap-6 cursor-pointer transition-all ${
      active ? 'bg-primary/5 border-primary shadow-[0_0_30px_rgba(79,70,229,0.1)]' : 'bg-muted/50 border-border hover:border-white/20'
    } ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
  >
     <div className={`w-14 h-14 rounded-sm flex items-center justify-center ${active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
        <Icon size={28} />
     </div>
     <div className="flex-1">
        <h4 className="font-bold">{title}</h4>
        <p className="text-xs text-muted-foreground">{desc}</p>
     </div>
     {disabled && <span className="bg-muted px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest opacity-60">Soon</span>}
  </div>
);
