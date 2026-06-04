"use client";

import React from "react";
import { PageContainer } from "@/components/dashboard/v2/page-container";
import { Plus, Map, Settings, Users, Shield, Zap, Layout, ArrowRight, Folder, Database, Search } from "lucide-react";
import { getWorkspaces, createWorkspaceAction } from "@/app/actions/workspaceActions";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SpacesPage() {
  const { activeTenant } = useAppContext();
  const [workspaces, setWorkspaces] = React.useState<any[]>([]);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    const loadSpaces = async () => {
      if (activeTenant) {
        setIsLoading(true);
        try {
          const data = await getWorkspaces(activeTenant.id);
          setWorkspaces(data);
        } catch (e) {
          console.error("Failed to load workspaces:", e);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadSpaces();
  }, [activeTenant?.id]);

  const handleCreateSpace = async () => {
    if (!activeTenant) return;
    setIsCreating(true);
    const res = await createWorkspaceAction({
      tenantId: activeTenant.id,
      name: `New Space ${workspaces.length + 1}`,
      description: "Provisioned as a sovereign execution boundary."
    });

    if (res.success) {
      toast.success("Workspace Provisioned", {
        description: "Your new organizational space is ready for deployment."
      });
      const updated = await getWorkspaces(activeTenant.id);
      setWorkspaces(updated);
    } else {
      toast.error("Provisioning Failed", {
        description: res.error
      });
    }
    setIsCreating(false);
  };

  const filteredSpaces = workspaces.filter(ws => 
    ws.resource.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <PageContainer title="My Spaces" description="Calibrating resource graph...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4 opacity-40">
            <Layout className="w-12 h-12 animate-pulse text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Mapping Orbital Boundaries...</span>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="My Spaces"
      description="Manage your organizational boundaries, projects, and focus environments."
      actions={
        <button 
          onClick={handleCreateSpace}
          disabled={isCreating}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50 shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          {isCreating ? "Provisioning..." : "Create New Space"}
        </button>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Header Tools */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/20 border border-border/40 p-4 rounded-3xl backdrop-blur-sm">
           <div className="relative w-full md:w-96 group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
             <input 
               type="text" 
               placeholder="Search orbital registry..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-background border border-border/50 rounded-2xl pl-11 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-primary/50 transition-all shadow-inner"
             />
           </div>
           
           <div className="flex items-center gap-6 px-4">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{workspaces.length} Spaces Registered</span>
              </div>
              <div className="h-4 w-px bg-border/50" />
              <div className="flex items-center gap-2">
                 <Database className="w-4 h-4 text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synapse-V Ready</span>
              </div>
           </div>
        </div>

        {/* Space Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSpaces.map((space: any) => (
            <div key={space.id} className="bg-muted/10 border border-border/40 rounded-[2rem] p-8 flex flex-col gap-6 hover:border-primary/40 transition-all group relative overflow-hidden">
               {/* Background Glow */}
               <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />
               
               <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-background border border-border/50 flex items-center justify-center text-primary shadow-xl group-hover:scale-105 transition-transform">
                        <Map className="w-7 h-7" />
                     </div>
                     <div className="flex flex-col gap-1">
                        <span className="text-sm font-black tracking-tight">{space.resource.name}</span>
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
                          space.isDefault ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                        )}>
                           {space.isDefault ? "Primary Node" : "Tenant Member"}
                        </span>
                     </div>
                  </div>
                  {space.isProtected && <Shield className="w-4 h-4 text-amber-500" />}
               </div>

               <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                     <span>Resource Capacity</span>
                     <span className="text-foreground">{space.isDefault ? "High Efficiency" : "On-Demand"}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                     <div className="h-full bg-primary shadow-[0_0_8px_var(--primary)]" style={{ width: space.isDefault ? '85%' : '30%' }} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                     <div className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold">{space.folders?.length || 0} Sub-folders</span>
                     </div>
                     <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
               </div>

               <div className="flex items-center gap-3 pt-4 border-t border-border/20 relative z-10">
                  <button className="flex-1 bg-background hover:bg-muted py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border/50 transition-all flex items-center justify-center gap-2">
                     <Settings className="w-3.5 h-3.5" />
                     Manage
                  </button>
                  <button className="flex-1 bg-background hover:bg-muted py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border/50 transition-all flex items-center justify-center gap-2">
                     <Users className="w-3.5 h-3.5" />
                     Access
                  </button>
               </div>
            </div>
          ))}

          {/* New Space Placeholder */}
          <div 
             onClick={handleCreateSpace}
             className="bg-background/20 border-2 border-dashed border-border/40 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center gap-4 hover:border-primary/50 transition-all cursor-pointer group"
          >
             <div className="w-16 h-16 rounded-3xl bg-muted/40 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
             </div>
             <div className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground">Initialize Orbital Boundary</span>
                <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">New Workspace Provisioning</span>
             </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
