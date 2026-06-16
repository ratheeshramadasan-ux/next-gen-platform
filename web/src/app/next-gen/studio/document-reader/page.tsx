"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAppProjectAction } from "@/app/actions/tenantActions";
import { DocReaderRegistry } from "@/components/studio/doc-reader/DocReaderRegistry";
import { DocumentReaderStudio } from "@/document-reader/components/DocumentReaderStudio";
import { DUDashboard } from "@/document-reader/dashboard/DUDashboard";

type ProjectSummary = {
  name: string;
};

function DocReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId");
  const view = searchParams.get("view");
  const [project, setProject] = useState<ProjectSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProject() {
      if (projectId) {
        setProject({ name: "Document Model" });
        const timeout = new Promise<{ success: false; project?: null }>(resolve => {
          window.setTimeout(() => resolve({ success: false, project: null }), 5000);
        });
        const result = await Promise.race([getAppProjectAction(projectId), timeout]);
        if (!cancelled && result.success && result.project) {
          setProject(result.project);
        }
      }
    }
    loadProject();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleSelectProject = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", id);
    router.push(`?${params.toString()}`);
  };

  // DU Dashboard view
  if (view === "dashboard") {
    return (
      <DUDashboard
        onOpenProject={(id) => {
          const params = new URLSearchParams();
          params.set("projectId", id);
          router.push(`?${params.toString()}`);
        }}
      />
    );
  }

  if (!projectId) {
    return <DocReaderRegistry onSelectProject={handleSelectProject} />;
  }

  return (
    <DocumentReaderStudio
      projectId={projectId}
      projectName={project?.name || "Initializing..."}
      onBack={() => {
        router.push("/next-gen/studio/document-reader");
      }}
    />
  );
}

export default function DocReaderPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    }>
      <DocReaderContent />
    </Suspense>
  );
}
