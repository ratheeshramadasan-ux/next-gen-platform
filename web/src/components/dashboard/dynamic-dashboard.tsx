"use client";

import React from "react";
import { WidgetConfig, WidgetRegistry } from "./widget-registry";
import { cn } from "@/lib/utils";

interface DynamicDashboardProps {
  dashboardId: string;
  widgets: WidgetConfig[];
}

export const DynamicDashboard = ({ dashboardId, widgets }: DynamicDashboardProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
      {widgets.map((widget) => {
        const WidgetComponent = WidgetRegistry[widget.type];
        
        // Define column spans based on widget size
        const colSpan = widget.size === "full" ? "lg:col-span-12" 
                      : widget.size === "lg" ? "lg:col-span-8"
                      : widget.size === "md" ? "lg:col-span-6"
                      : "lg:col-span-4 md:col-span-1";

        return (
          <div key={widget.id} className={cn(colSpan, "h-full min-h-[180px]")}>
             {WidgetComponent ? (
               <WidgetComponent config={widget} />
             ) : (
               <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-sm flex items-center justify-center text-rose-500 text-xs font-bold">
                  Unknown Widget: {widget.type}
               </div>
             )}
          </div>
        );
      })}
    </div>
  );
};
