import Link from "next/link";
import { Building2, ArrowLeft, Globe } from "lucide-react";

export default function SlugNotFound() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-rose-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-8%] w-[45%] h-[45%] bg-slate-600/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
          <div className="p-10 flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Building2 size={28} className="text-white/20" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white mb-1">Portal Not Found</h1>
              <p className="text-sm text-white/35 leading-relaxed">
                This organization portal doesn't exist or is no longer active.
                Contact your administrator if you believe this is an error.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
              <Globe size={12} className="text-white/25" />
              <span className="text-[11px] font-mono text-white/25">portal not found</span>
            </div>
          </div>
          <div className="px-8 py-4 border-t border-white/5 flex justify-center">
            <Link href="/" className="flex items-center gap-2 text-xs text-white/25 hover:text-white/50 transition-colors">
              <ArrowLeft size={12} /> Back to platform
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
