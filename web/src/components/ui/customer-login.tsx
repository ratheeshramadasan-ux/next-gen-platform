'use client'

import * as React from 'react'
import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Eye, EyeOff, ArrowRight, Shield, Building2, AlertCircle, Loader2, CheckCircle2, Lock, Mail, Globe, Key } from 'lucide-react'
import { cn } from '@/lib/utils'

const Logo = dynamic(() => import("@/components/ui/logo"))

// ─── Theme map: ThemeName → CSS class (mirrors globals.css) ──────────────────
const THEME_CLASS_MAP: Record<string, string> = {
  "Sand Serenity":       "theme-sand-serenity",
  "Ink Wash":            "theme-ink-wash",
  "Jade Pebble":         "theme-jade-pebble",
  "Opaline":             "theme-opaline",
  "Arctic Reflection":   "theme-arctic-reflection",
  "Mocha Espresso":      "theme-mocha-espresso",
  "Minimalist Slate":    "theme-minimalist-slate",
  "Pure Alabaster":      "theme-pure-alabaster",
  "Woodland":            "theme-woodland",
  "Midnight Aurora":     "theme-midnight-aurora",
  "Wraith":              "theme-wraith",
  "Next Gen Ultra":      "theme-next-gen-ultra",
  "Deep Space":          "theme-deep-space",
  "Cyberpunk Neon":      "theme-cyberpunk-neon",
  "Emerald Empire":      "theme-emerald-empire",
  "Crimson Velvet":      "theme-crimson-velvet",
  "Oceanic Depth":       "theme-oceanic-depth",
  "Jet Black":           "theme-jet-black",
  "Aurora Glass":        "theme-aurora-glass",
  "Frosted Glass":       "theme-frosted-glass",
  "Obsidian Glass":      "theme-obsidian-glass",
  "Silk Glass":          "theme-silk-glass",
  "Horizon Glass":       "theme-horizon-glass",
  "Lavender Mist":       "theme-lavender-mist",
  "Champagne Glass":     "theme-champagne-glass",
}

// Themes that use light backgrounds — affects text/overlay choices
const LIGHT_THEMES = new Set([
  "Sand Serenity", "Ink Wash", "Jade Pebble", "Opaline",
  "Arctic Reflection", "Mocha Espresso", "Minimalist Slate", "Pure Alabaster",
  "Aurora Glass", "Frosted Glass", "Silk Glass", "Lavender Mist", "Champagne Glass",
])

const DEFAULT_THEME = "Midnight Aurora"

interface CustomerLoginProps {
  customerId: string
  customerName: string
  logoUrl?: string | null
  slug: string
  host: string
  isRegistrationEnabled: boolean
  authType?: string | null
  allowedDomains?: string | null
  mfaEnforced?: boolean
  industry?: string | null
  location?: string | null
  theme?: string | null
}

type Step = 'email' | 'password' | 'mfa' | 'success'

const CustomerLogin = ({
  customerId,
  customerName,
  logoUrl,
  slug,
  host,
  isRegistrationEnabled,
  authType,
  allowedDomains,
  mfaEnforced,
  industry,
  location,
  theme,
}: CustomerLoginProps) => {
  const resolvedTheme = (theme && THEME_CLASS_MAP[theme]) ? theme : DEFAULT_THEME
  const themeClass = THEME_CLASS_MAP[resolvedTheme]
  const isLight = LIGHT_THEMES.has(resolvedTheme)

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const allowedDomainList = useMemo(() =>
    allowedDomains ? allowedDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean) : []
  , [allowedDomains])

  // Apply theme class to <html> so CSS variables take effect globally on this page
  useEffect(() => {
    const html = document.documentElement
    // Remove any existing theme classes
    Array.from(html.classList).forEach(c => { if (c.startsWith('theme-')) html.classList.remove(c) })
    html.classList.add(themeClass)
    return () => { html.classList.remove(themeClass) }
  }, [themeClass])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const validateEmail = () => {
    setError('')
    if (!email || !email.includes('@')) { setError('Please enter a valid email address.'); return false }
    if (allowedDomainList.length > 0) {
      const domain = email.split('@')[1]?.toLowerCase()
      if (!domain || !allowedDomainList.includes(domain)) {
        setError(`This email domain is not authorized. Allowed: ${allowedDomainList.join(', ')}`)
        return false
      }
    }
    return true
  }

  const handleEmailSubmit = (e: React.FormEvent) => { e.preventDefault(); if (validateEmail()) setStep('password') }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!password) { setError('Please enter your password.'); return }
    mfaEnforced ? setStep('mfa') : doLogin()
  }

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (mfaCode.length !== 6) { setError('Please enter your 6-digit verification code.'); return }
    doLogin()
  }

  const doLogin = () => {
    setIsLoading(true)
    setTimeout(() => {
      setStep('success')
      localStorage.setItem('nextgen_active_customer', customerId)
      setTimeout(() => { window.location.href = '/next-gen/overview' }, 800)
    }, 1200)
  }

  const handleSsoLogin = () => {
    setIsLoading(true)
    setTimeout(() => { localStorage.setItem('nextgen_active_customer', customerId); window.location.href = '/next-gen/overview' }, 1000)
  }

  const isSsoOnly = authType === 'SSO Only'
  const hasSso = authType?.includes('SSO') || authType === 'SAML' || authType === 'OIDC'

  // Derived style tokens based on whether we're on a light or dark theme
  const s = {
    page:       isLight ? "bg-background"                             : "bg-background",
    glow1:      isLight ? "bg-primary/10"                             : "bg-primary/8",
    glow2:      isLight ? "bg-accent/10"                              : "bg-accent/8",
    grid:       isLight
      ? "bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:64px_64px]"
      : "bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]",
    urlBadge:   isLight ? "bg-foreground/5 border-foreground/10"      : "bg-white/5 border-white/10",
    urlText:    isLight ? "text-foreground/40"                        : "text-white/40",
    urlAccent:  isLight ? "text-foreground/70"                        : "text-white/70",
    card:       isLight ? "bg-card border-border"                     : "bg-white/[0.03] border-white/10",
    topLine:    isLight ? "via-primary/40"                            : "via-primary/60",
    logoBox:    isLight ? "bg-foreground/5 border-border"             : "bg-white/5 border-white/10",
    logoBg:     isLight ? "text-foreground/30"                        : "text-white/40",
    heading:    isLight ? "text-foreground"                           : "text-white",
    subtext:    isLight ? "text-muted-foreground"                     : "text-white/35",
    badge:      isLight ? "bg-primary/10 border-primary/20 text-primary" : "bg-primary/10 border-primary/20 text-primary",
    label:      isLight ? "text-muted-foreground"                     : "text-white/40",
    input:      isLight ? "bg-muted/40 border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-primary/5" : "bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:bg-primary/5",
    inputIcon:  isLight ? "text-muted-foreground"                     : "text-white/30",
    chip:       isLight ? "bg-muted/40 border-border text-muted-foreground hover:text-foreground" : "bg-white/5 border-white/10 text-white/50 hover:text-white/70",
    divider:    isLight ? "bg-foreground/10"                          : "bg-white/10",
    dividerTxt: isLight ? "text-foreground/25"                        : "text-white/25",
    checkLabel: isLight ? "text-muted-foreground"                     : "text-white/40",
    forgotLink: "text-primary hover:text-primary/80",
    btn:        "bg-primary hover:bg-primary/90 text-primary-foreground",
    btnSso:     isLight ? "bg-foreground/5 border-border text-foreground/70 hover:bg-foreground/10" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
    btnSsoIcon: isLight ? "text-foreground/30"                        : "text-white/40",
    errBg:      "bg-destructive/10 border-destructive/20",
    errTxt:     "text-destructive",
    hintTxt:    isLight ? "text-muted-foreground/60"                  : "text-white/25",
    footer:     isLight ? "border-border"                             : "border-white/5",
    footerTxt:  isLight ? "text-muted-foreground/40"                  : "text-white/20",
    glow:       isLight ? "bg-primary"                                : "bg-primary",
    mfaCircle:  "bg-primary/10 border-primary/20",
    mfaIcon:    "text-primary",
    successCircle: "bg-emerald-500/10 border-emerald-500/20",
  }

  return (
    <div className={cn("min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden", s.page)}>
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={cn("absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full blur-[120px]", s.glow1)} />
        <div className={cn("absolute bottom-[-10%] right-[-8%] w-[45%] h-[45%] rounded-full blur-[100px]", s.glow2)} />
        <div className={s.grid} />
      </div>

      {/* Portal URL badge */}
      <div className={cn("relative z-10 mb-8 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border", s.urlBadge)}>
        <Globe size={12} className={cn("text-primary")} />
        <span className={cn("text-[11px] font-mono", s.urlText)}>
          {host}/
          <span className={cn("font-semibold", s.urlAccent)}>{slug}</span>
          /login
        </span>
      </div>

      {/* Card */}
      <div ref={cardRef} onMouseMove={handleMouseMove} className="relative z-10 w-full max-w-[420px]">
        {/* Cursor glow */}
        <div
          className="pointer-events-none absolute w-[350px] h-[350px] rounded-full opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
            transform: `translate(${mousePos.x - 175}px, ${mousePos.y - 175}px)`,
            transition: 'transform 0.08s ease-out',
          }}
        />

        <div className={cn("border rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl", s.card)}>
          {/* Top accent line */}
          <div className={cn("h-px w-full bg-gradient-to-r from-transparent to-transparent", s.topLine)} />

          <div className="p-8">
            {/* Customer branding */}
            <div className="flex flex-col items-center mb-8">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl border", s.logoBox)}>
                {logoUrl ? (
                  <img src={logoUrl} alt={customerName} className="w-10 h-10 object-contain" />
                ) : (
                  <Building2 size={28} className={s.logoBg} />
                )}
              </div>
              <h1 className={cn("text-xl font-bold text-center leading-tight", s.heading)}>{customerName}</h1>
              {(industry || location) && (
                <p className={cn("text-xs mt-1 text-center", s.subtext)}>
                  {[industry, location].filter(Boolean).join(' · ')}
                </p>
              )}
              <div className={cn("flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full border", s.badge)}>
                <Shield size={10} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Secure Portal</span>
              </div>
            </div>

            {/* SSO-only path */}
            {isSsoOnly ? (
              <div className="flex flex-col gap-3">
                <p className={cn("text-center text-sm mb-2", s.subtext)}>Sign in with your organization identity</p>
                {['Microsoft Azure AD', 'Google Workspace', 'Okta'].map(provider => (
                  <button key={provider} onClick={handleSsoLogin} disabled={isLoading}
                    className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border", s.btnSso)}>
                    <Key size={15} className={s.btnSsoIcon} />
                    {provider}
                    <ArrowRight size={14} className="ml-auto opacity-40" />
                  </button>
                ))}
              </div>
            ) : (
              <>
                {step === 'email' && (
                  <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={cn("text-[11px] font-semibold uppercase tracking-wider", s.label)}>Work Email</label>
                      <div className="relative">
                        <Mail size={15} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", s.inputIcon)} />
                        <input autoFocus type="email" value={email}
                          onChange={e => { setEmail(e.target.value); setError('') }}
                          placeholder={allowedDomainList.length > 0 ? `user@${allowedDomainList[0]}` : 'you@company.com'}
                          className={cn("w-full pl-10 pr-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all", s.input)}
                        />
                      </div>
                      {allowedDomainList.length > 0 && (
                        <p className={cn("text-[11px] flex items-center gap-1.5", s.hintTxt)}>
                          <Shield size={10} /> Authorized: {allowedDomainList.join(', ')}
                        </p>
                      )}
                    </div>
                    {error && <ErrorBanner message={error} className={cn(s.errBg, s.errTxt)} />}
                    <SubmitButton loading={false} label="Continue" icon={<ArrowRight size={15} />} className={s.btn} />
                    {hasSso && (
                      <>
                        <Divider className={s.divider} textClass={s.dividerTxt} />
                        <button type="button" onClick={handleSsoLogin}
                          className={cn("w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-all", s.btnSso)}>
                          <Key size={15} className={s.btnSsoIcon} /> Continue with SSO
                        </button>
                      </>
                    )}
                  </form>
                )}

                {step === 'password' && (
                  <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                    <button type="button" onClick={() => { setStep('email'); setError('') }}
                      className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors w-fit", s.chip)}>
                      <Mail size={12} />{email}<span className="opacity-40 ml-1">Edit</span>
                    </button>
                    <div className="flex flex-col gap-1.5">
                      <label className={cn("text-[11px] font-semibold uppercase tracking-wider", s.label)}>Password</label>
                      <div className="relative">
                        <Lock size={15} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", s.inputIcon)} />
                        <input autoFocus type={showPassword ? 'text' : 'password'} value={password}
                          onChange={e => { setPassword(e.target.value); setError('') }}
                          placeholder="Enter your password"
                          className={cn("w-full pl-10 pr-11 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all", s.input)}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className={cn("absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors", s.inputIcon, "hover:text-foreground")}>
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded accent-primary" />
                        <span className={cn("text-xs", s.checkLabel)}>Remember this device</span>
                      </label>
                      <a href="#" className={cn("text-xs font-medium transition-colors", s.forgotLink)}>Forgot password?</a>
                    </div>
                    {error && <ErrorBanner message={error} className={cn(s.errBg, s.errTxt)} />}
                    <SubmitButton loading={isLoading} label="Sign In" icon={<ArrowRight size={15} />} className={s.btn} />
                  </form>
                )}

                {step === 'mfa' && (
                  <form onSubmit={handleMfaSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col items-center gap-2 py-2 text-center">
                      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-1 border", s.mfaCircle)}>
                        <Shield size={20} className={s.mfaIcon} />
                      </div>
                      <p className={cn("text-sm font-semibold", s.heading)}>Two-Factor Verification</p>
                      <p className={cn("text-xs", s.subtext)}>Enter the 6-digit code from your authenticator app</p>
                    </div>
                    <input autoFocus type="text" inputMode="numeric" maxLength={6} value={mfaCode}
                      onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '')); setError('') }}
                      placeholder="000000"
                      className={cn("w-full text-center text-2xl tracking-[0.5em] py-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono", s.input)}
                    />
                    {error && <ErrorBanner message={error} className={cn(s.errBg, s.errTxt)} />}
                    <SubmitButton loading={isLoading} disabled={mfaCode.length !== 6} label="Verify & Sign In" className={s.btn} />
                    <button type="button" onClick={() => setStep('password')} className={cn("text-xs text-center transition-colors", s.subtext, "hover:opacity-80")}>Back</button>
                  </form>
                )}

                {step === 'success' && (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className={cn("w-14 h-14 rounded-full flex items-center justify-center border", s.successCircle)}>
                      <CheckCircle2 size={24} className="text-emerald-500" />
                    </div>
                    <p className={cn("text-sm font-semibold", s.heading)}>Authenticated</p>
                    <p className={cn("text-xs", s.subtext)}>Redirecting to your workspace…</p>
                    <div className={cn("w-full mt-2 h-1 rounded-full overflow-hidden", isLight ? "bg-foreground/10" : "bg-white/10")}>
                      <div className="h-full bg-primary rounded-full" style={{ animation: 'growBar 0.8s ease-out forwards' }} />
                    </div>
                  </div>
                )}
              </>
            )}

            {isRegistrationEnabled && step === 'email' && (
              <p className={cn("mt-6 text-center text-xs", s.subtext)}>
                Don't have an account?{' '}
                <a href={`/${slug}/register`} className={cn("font-semibold transition-colors", s.forgotLink)}>Request access</a>
              </p>
            )}
          </div>

          {/* Footer */}
          <div className={cn("px-8 py-4 border-t flex items-center justify-between", s.footer)}>
            <div className="flex items-center gap-1.5">
              <Logo size={16} />
              <span className={cn("text-[10px] font-medium", s.footerTxt)}>NextGen Platform</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className={cn("text-[10px]", s.footerTxt)}>Secure · Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      <p className={cn("relative z-10 mt-6 text-[11px] text-center", s.hintTxt)}>
        This portal is exclusively for <span className="opacity-60">{customerName}</span> users.
        {allowedDomainList.length > 0 && <> · {allowedDomainList.join(', ')}</>}
      </p>

      <style>{`@keyframes growBar { from { width: 0 } to { width: 100% } }`}</style>
    </div>
  )
}

function ErrorBanner({ message, className }: { message: string; className: string }) {
  return (
    <div className={cn("flex items-start gap-2 p-3 rounded-lg border", className)}>
      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
      <p className="text-xs">{message}</p>
    </div>
  )
}

function Divider({ className, textClass }: { className: string; textClass: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className={cn("flex-1 h-px", className)} />
      <span className={cn("text-[11px]", textClass)}>or</span>
      <div className={cn("flex-1 h-px", className)} />
    </div>
  )
}

function SubmitButton({ loading, disabled, label, icon, className }: {
  loading: boolean; disabled?: boolean; label: string; icon?: React.ReactNode; className: string
}) {
  return (
    <button type="submit" disabled={loading || disabled}
      className={cn("w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50", className)}>
      {loading ? <Loader2 size={15} className="animate-spin" /> : <>{label}{icon}</>}
    </button>
  )
}

export default CustomerLogin
