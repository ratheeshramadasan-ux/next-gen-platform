"use client";

import React from "react";
import { 
  MoreVertical, 
  Edit3, 
  Lock, 
  FileText, 
  FileJson, 
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  History,
  Eye,
  Trash2,
  Badge
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../ui/table";
import { Button } from "../../ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { IconWrapper } from "../../ui/icon-wrapper";

interface AssetTableProps {
  assets: any[];
  loading: boolean;
  onRefresh: () => void;
}

export function AssetTable({ assets, loading }: AssetTableProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm font-medium text-muted-foreground">Loading assets...</span>
        </div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-muted/40 rounded-full flex items-center justify-center mx-auto border border-border/20">
            <FileText size={40} className="text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-bold text-foreground/60">No Assets Found</h3>
          <p className="text-sm text-muted-foreground/40 max-w-xs mx-auto">
            Get started by creating your first asset to securely manage credentials and data.
          </p>
        </div>
      </div>
    );
  }

  const getTypeIcon = (type: string, isSecret: boolean) => {
    if (isSecret) return <IconWrapper icon={Lock} size={14} className="text-primary" />;
    switch (type.toLowerCase()) {
      case 'json': return <IconWrapper icon={FileJson} size={14} className="text-primary/70" />;
      case 'datatable': return <IconWrapper icon={TableIcon} size={14} className="text-primary/70" />;
      default: return <IconWrapper icon={FileText} size={14} className="text-muted-foreground/60" />;
    }
  };

  return (
    <div className="flex-1 overflow-auto custom-scrollbar">
      <Table>
        <TableHeader className="bg-muted/20 sticky top-0 z-10 backdrop-blur-md">
          <TableRow className="hover:bg-transparent border-border/40">
            <TableHead className="w-[300px] text-xs font-black uppercase tracking-wider py-4">Asset Name</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider py-4">Type</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider py-4">Status</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider py-4">Created On</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider py-4">Created By</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider py-4">Encryption</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider py-4 text-center">Version</TableHead>
            <TableHead className="text-xs font-black uppercase tracking-wider py-4 text-right pr-6">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow key={asset.id} className="group border-border/20 hover:bg-foreground/[0.02] transition-colors">
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center border border-border/20 group-hover:bg-foreground/10 transition-colors">
                    {getTypeIcon(asset.type, asset.isSecret)}
                  </div>
                  <span className={cn(
                    "font-bold text-sm",
                    asset.isSecret ? "text-primary hover:underline cursor-pointer" : "text-foreground"
                  )}>
                    {asset.name}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  asset.isSecret 
                    ? "bg-primary/10 text-primary border-primary/20" 
                    : "bg-foreground/5 text-muted-foreground border-border/40"
                )}>
                  {asset.type}
                </div>
              </TableCell>
              <TableCell>
                <div className={cn(
                  "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
                  asset.status === 'ENABLED' ? "text-emerald-500" : "text-rose-500"
                )}>
                  {asset.status === 'ENABLED' ? <IconWrapper icon={CheckCircle2} size={12} /> : <IconWrapper icon={XCircle} size={12} />}
                  {asset.status}
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground font-medium">
                {format(new Date(asset.createdAt), "dd MMM yyyy")}<br/>
                <span className="opacity-50">{format(new Date(asset.createdAt), "hh:mm a")}</span>
              </TableCell>
              <TableCell className="text-xs font-bold text-foreground/70">
                {asset.createdBy || "System"}
              </TableCell>
              <TableCell>
                <div className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                  asset.encryptionProfile === 'STANDARD' 
                    ? "text-primary/80 bg-primary/10" 
                    : "text-primary bg-primary/20"
                )}>
                  {asset.encryptionProfile}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs font-black text-muted-foreground/60">{asset._count?.versions || 1}</span>
              </TableCell>
              <TableCell className="text-right pr-6">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground">
                    <IconWrapper icon={Edit3} size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-rose-500">
                    <IconWrapper icon={Trash2} size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-foreground/5 text-muted-foreground">
                    <IconWrapper icon={MoreVertical} size={14} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
