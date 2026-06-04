"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Plus, 
  Filter, 
  RefreshCw, 
  FileText, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock,
  LayoutGrid,
  Lock,
  AlertCircle
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { cn } from "@/lib/utils";
import { AssetSummaryCards } from "./AssetSummaryCards";
import { AssetTable } from "./AssetTable";
import { CreateAssetDrawer } from "./CreateAssetDrawer";
import { getAssets } from "../../../app/actions/assetActions";
import { IconWrapper } from "../../ui/icon-wrapper";

interface AssetManagerProps {
  projectId?: string | null;
}

export function AssetManager({ projectId }: AssetManagerProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    type: "All Types",
    status: "All Status",
    encryption: "All"
  });

  const loadAssets = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getAssets(projectId);
      setAssets(data);
    } catch (error) {
      console.error("Failed to load assets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [projectId]);

  const stats = {
    total: assets.length,
    credentials: assets.filter(a => a.type === "Credential").length,
    enabled: assets.filter(a => a.status === "ENABLED").length,
    disabled: assets.filter(a => a.status === "DISABLED").length,
    expiringSoon: assets.filter(a => a.metadata?.expiresSoon).length // Mocked for now
  };

  return (
    <div className="flex flex-col h-full bg-transparent p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Assets
          </h1>
          <p className="text-sm text-muted-foreground">Manage and secure all assets used in this project</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 mb-6 bg-card/40 backdrop-blur-md p-2 rounded-xl border border-border/40">
        <div className="relative flex-1 max-w-sm">
          <IconWrapper icon={Search} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder="Search assets..." 
            className="pl-10 bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-primary/40 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select 
          className="bg-muted/40 border-none rounded-md px-3 h-10 text-sm font-medium focus:ring-1 focus:ring-primary/40 outline-none min-w-[140px]"
          value={activeFilters.type}
          onChange={(e) => setActiveFilters({...activeFilters, type: e.target.value})}
        >
          <option>All Types</option>
          <option>Credential</option>
          <option>String</option>
          <option>Number</option>
          <option>Boolean</option>
          <option>DataTable</option>
          <option>JSON</option>
        </select>

        <select 
          className="bg-muted/40 border-none rounded-md px-3 h-10 text-sm font-medium focus:ring-1 focus:ring-primary/40 outline-none min-w-[140px]"
          value={activeFilters.status}
          onChange={(e) => setActiveFilters({...activeFilters, status: e.target.value})}
        >
          <option>All Status</option>
          <option>Enabled</option>
          <option>Disabled</option>
        </select>

        <select 
          className="bg-muted/40 border-none rounded-md px-3 h-10 text-sm font-medium focus:ring-1 focus:ring-primary/40 outline-none min-w-[140px]"
          value={activeFilters.encryption}
          onChange={(e) => setActiveFilters({...activeFilters, encryption: e.target.value})}
        >
          <option>All</option>
          <option>Standard</option>
          <option>Advanced</option>
        </select>

        <Button variant="outline" size="icon" className="h-10 w-10 border-border/40 bg-muted/40">
          <IconWrapper icon={Filter} size={16} />
        </Button>

        <Button 
          className="ml-auto bg-primary text-white hover:bg-primary/90 flex items-center gap-2 h-10 px-4 shadow-lg shadow-primary/20"
          onClick={() => setIsDrawerOpen(true)}
        >
          <IconWrapper icon={Plus} size={18} />
          Create Asset
        </Button>

        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={loadAssets}>
          <IconWrapper icon={RefreshCw} size={16} className={cn(loading && "animate-spin")} />
        </Button>
      </div>

      {/* Summary Cards */}
      {!projectId ? (
        <div className="p-12 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col items-center justify-center text-center gap-4">
          <AlertCircle size={40} className="text-amber-500/40" />
          <h3 className="text-lg font-bold text-amber-600">Active Project Required</h3>
          <p className="text-sm text-amber-600/60 max-w-sm">
            Please select an active project from the context switcher to manage assets.
          </p>
        </div>
      ) : (
        <AssetSummaryCards stats={stats} />
      )}

      {/* Table Area */}
      <div className="flex-1 min-h-0 bg-card/20 backdrop-blur-sm border border-border/40 rounded-2xl mt-6 flex flex-col overflow-hidden">
        <AssetTable 
          assets={assets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))} 
          loading={loading}
          onRefresh={loadAssets}
        />
      </div>

      {/* Create Drawer */}
      <CreateAssetDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSuccess={() => {
          setIsDrawerOpen(false);
          loadAssets();
        }}
        projectId={projectId}
      />
    </div>
  );
}
