"use client";

import React from "react";
import { Search, Clock, FileText, Mail, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  sender: string;
  time: string;
  type: "Email" | "PDF" | "Image";
  status: string;
  tenant: string;
  folder: string;
}

const MOCK_DOCS: Document[] = [
  { id: "1", name: "Vendor_Onboarding_Request.eml", sender: "sarah.jenkins@supplier.com", time: "10m ago", type: "Email", status: "Needs Validation", tenant: "UAT", folder: "Finance/Ops" },
  { id: "2", name: "Q3_Financial_Report_Final.pdf", sender: "Finance Dept", time: "1h ago", type: "PDF", status: "Pending", tenant: "PROD", folder: "Finance/Reporting" },
  { id: "3", name: "Receipt_Taxi_Oct24.jpg", sender: "Expense Claim", time: "2h ago", type: "Image", status: "Flagged", tenant: "SANDBOX", folder: "HR/Expenses" },
  { id: "4", name: "Contract_Renewal_Discussion.eml", sender: "legal@partner.net", time: "3h ago", type: "Email", status: "Active", tenant: "UAT", folder: "Legal/General" },
];

export const DocumentInbox = ({ selectedId, onSelect }: { selectedId: string, onSelect: (id: string) => void }) => {
  return (
    <div className="w-80 border-r border-border bg-muted/10 flex flex-col shrink-0">
      <div className="p-4 border-b border-border bg-background">
        <h3 className="text-sm font-bold flex items-center justify-between mb-4 px-1">
          Pending Review
          <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">12</span>
        </h3>
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input 
            type="text" 
            placeholder="Search documents..." 
            className="w-full bg-muted/50 border border-border rounded-sm pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {MOCK_DOCS.map((doc) => (
          <div
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            className={cn(
              "p-3 rounded-sm cursor-pointer transition-all border group relative",
              selectedId === doc.id 
                ? "bg-background border-primary/20 shadow-sm ring-1 ring-primary/10" 
                : "bg-transparent border-transparent hover:bg-background/80 hover:border-border/50"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-sm flex items-center justify-center border",
                doc.type === "Email" ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500" :
                doc.type === "PDF" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              )}>
                {doc.type === "Email" ? <Mail size={14} /> : 
                 doc.type === "PDF" ? <FileText size={14} /> : 
                 <ImageIcon size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-80">{doc.type}</span>
                  <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">{doc.time}</span>
                </div>
                <h4 className={cn(
                  "text-xs font-bold truncate leading-tight mt-0.5",
                  selectedId === doc.id ? "text-primary" : "text-foreground"
                )}>
                  {doc.name}
                </h4>
                <p className="text-[10px] text-muted-foreground truncate opacity-70 mt-0.5 font-medium">From: {doc.sender}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                    doc.tenant === "PROD" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                    doc.tenant === "UAT" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                    "bg-primary/10 text-primary border border-primary/20"
                  )}>
                    {doc.tenant}
                  </span>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[100px]">
                    {doc.folder}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
