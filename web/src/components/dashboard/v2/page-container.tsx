"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { navigationConfig } from "@/lib/nav-config";

interface PageContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageContainer = ({ title, description, children, actions }: PageContainerProps) => {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Helper to find label from config
  const getLabel = (slug: string, isLast: boolean) => {
    // Try to find in main nav
    const item = navigationConfig.find(n => n.path === `/${slug}` || n.children?.some(c => c.path === `/${segments.slice(0, segments.indexOf(slug) + 1).join("/")}`));
    if (item) {
       const child = item.children?.find(c => c.path === pathname);
       if (isLast && child) return child.label;
       return item.label;
    }
    return slug.replace(/-/g, " ");
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
             <Link href="/overview" className="hover:text-primary transition-colors">Platform</Link>
             {segments.map((segment, i) => {
                const isLast = i === segments.length - 1;
                return (
                  <React.Fragment key={i}>
                     <ChevronRight className="w-2.5 h-2.5 opacity-40" />
                     <span className={cn(isLast ? "text-primary bg-primary/10 px-2 py-0.5 rounded" : "hover:text-primary transition-colors cursor-pointer")}>
                        {getLabel(segment, isLast)}
                     </span>
                  </React.Fragment>
                );
             })}
          </nav>

          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">
                {title}
            </h1>
            <p className="text-sm text-muted-foreground font-medium max-w-2xl mt-1">
                {description}
            </p>
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>

      {/* Main Content Card */}
      <div className="flex-1 studio-card p-6 border border-border/50 relative overflow-hidden group">
         {/* Decorative grid for high-fidelity look */}
         <div className="absolute inset-0 studio-grid-dots opacity-20 pointer-events-none" />
         
         <div className="relative z-10 w-full h-full">
            {children}
         </div>
      </div>
    </div>
  );
};
