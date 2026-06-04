"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutomationStudioRoot() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/automation-studio/designer");
  }, [router]);

  return (
    <div className="h-screen w-full bg-[#0d0d0e] flex flex-col items-center justify-center text-center">
       <div className="relative mb-8">
          <div className="w-16 h-16 rounded-sm border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
       </div>
       <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/20">Handshaking Studio...</h2>
       <p className="text-[10px] font-bold text-primary/40 uppercase mt-2 tracking-widest tracking-tighter">Redirecting to Designer Engine</p>
    </div>
  );
}
