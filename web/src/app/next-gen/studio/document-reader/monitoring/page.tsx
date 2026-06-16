"use client";

import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { MonitoringDashboard } from "@/document-reader/monitoring/MonitoringDashboard";

export default function MonitoringPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    }>
      <div className="h-screen">
        <MonitoringDashboard />
      </div>
    </Suspense>
  );
}
