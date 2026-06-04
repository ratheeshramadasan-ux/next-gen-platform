"use client";

import React from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { apiSpec } from "@/lib/api-spec";
import { ArrowLeft, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function SwaggerPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] -m-8">
      {/* Custom Header */}
      <div className="bg-white dark:bg-[#111] border-b border-border px-8 py-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/integration-hub"
            className="w-10 h-10 rounded-sm border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
               <BookOpen size={20} className="text-emerald-500" />
               <h1 className="text-xl font-extrabold tracking-tight">Swagger Hub</h1>
               <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-500 uppercase">Live Docs</div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Interactive API Explorer & Specification</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 border border-primary/20 text-primary">
              <ShieldCheck size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Authorized Session</span>
           </div>
           <button className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-sm text-xs font-bold hover:opacity-90 transition-opacity">
              <ExternalLink size={14} />
              Export OAS 3.0
           </button>
        </div>
      </div>

      {/* Swagger UI Container */}
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto bg-white dark:bg-[#111] rounded-sm border border-border shadow-2xl overflow-hidden custom-swagger">
          <SwaggerUI 
            spec={apiSpec} 
            deepLinking={true}
            displayOperationId={true}
          />
        </div>
      </div>

      <style jsx global>{`
        .custom-swagger .swagger-ui {
          filter: invert(0);
        }
        .dark .custom-swagger .swagger-ui {
          filter: invert(0.9) hue-rotate(180deg);
        }
        .dark .custom-swagger .swagger-ui .opblock-summary-method {
          filter: invert(1) hue-rotate(-180deg);
        }
        .dark .custom-swagger .swagger-ui .opblock-summary-path {
          filter: invert(1) hue-rotate(-180deg);
          color: #eee !important;
        }
        .dark .custom-swagger .swagger-ui section.models {
          border-top: 1px solid #333;
        }
        .dark .custom-swagger .swagger-ui .info .title,
        .dark .custom-swagger .swagger-ui .info p,
        .dark .custom-swagger .swagger-ui .info li,
        .dark .custom-swagger .swagger-ui .opblock .opblock-section-header h4,
        .dark .custom-swagger .swagger-ui .btn,
        .dark .custom-swagger .swagger-ui select,
        .dark .custom-swagger .swagger-ui .opblock-description-wrapper p,
        .dark .custom-swagger .swagger-ui .responses-inner h4,
        .dark .custom-swagger .swagger-ui .responses-inner h5 {
          color: #ddd !important;
        }
        
        /* Modern styling overrides */
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 30px 0; padding: 0 20px; }
        .swagger-ui .scheme-container { 
          background: transparent; 
          box-shadow: none; 
          padding: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .dark .swagger-ui .scheme-container {
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
}
