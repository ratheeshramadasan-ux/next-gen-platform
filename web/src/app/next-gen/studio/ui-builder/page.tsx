"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppDesigner } from "@/components/studio/app-designer/AppDesigner";
import { AppRegistry } from "@/components/studio/app-designer/AppRegistry";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { Loader2, Layout } from "lucide-react";

function AppBuilderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId");
  const [project, setProject] = React.useState<any>(null);

  const handleSelectProject = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", id);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="h-full w-full bg-transparent overflow-hidden">
       {projectId ? (
          <StudioLayout 
            projectName={project?.name || "App Designer"}
            folderName={project?.folder?.name || "Applications"}
            activeProjectId={projectId}
            studioLabel="Designer"
            moduleName="Application Builder"
            hiddenTabs={["schedule", "trigger", "connectors"]}
            toolboxLabel="Components"
            toolboxIcon={Layout}
            defaultTab="studio"
            basePath="/next-gen/studio/ui-builder"
            onSave={() => {
               window.dispatchEvent(new CustomEvent("app-designer-save"));
            }}
            sidebar={<div id="studio-sidebar-content" className="h-full flex flex-col" />}
            properties={<div id="studio-properties-panel" className="h-full flex flex-col" />}
            bottomDock={<div className="h-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/10 ">Application Resource Monitor</div>}
          >
            <AppDesigner 
               projectId={projectId} 
               onLoadProject={(p) => setProject(p)}
            />
          </StudioLayout>
       ) : (
          <AppRegistry onSelectProject={handleSelectProject} />
       )}
    </div>
  );
}

export default function AppBuilderPage() {
  return (
    <Suspense fallback={
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    }>
      <AppBuilderContent />
    </Suspense>
  );
}
