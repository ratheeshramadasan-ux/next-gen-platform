"use client";

import React, { useState } from "react";
import { X, Save, Zap, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MasterDropdown } from "./MasterDropdown";
import { createDiscoveryAssessment } from "@/app/actions/discoveryActions";
import { analyzeAssetIntelligence } from "@/app/actions/aiActions";
import { toast } from "sonner";

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId: string;
}

export function AssessmentModal({ isOpen, onClose, onSuccess, customerId }: AssessmentModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    businessUnitId: "",
    environmentType: "CLOUD",
    regionId: "",
    frameworks: [] as string[],
    pamPlatforms: [] as string[],
    criticality: "MEDIUM"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAISuggest = async () => {
    if (!formData.name) {
      toast.error("Please enter an assessment name first.");
      return;
    }
    setIsAnalyzing(true);
    // Simulate AI analysis based on name
    setTimeout(() => {
      const name = formData.name.toLowerCase();
      let updates: any = {};
      
      if (name.includes("cloud") || name.includes("azure") || name.includes("aws")) {
        updates.environmentType = "CLOUD";
        updates.frameworks = ["nist-id", "soc2-id"]; // Mock IDs
      }
      
      if (name.includes("pci") || name.includes("finance")) {
        updates.criticality = "CRITICAL";
        updates.frameworks = [...(updates.frameworks || []), "pci-id"];
      }

      setFormData(prev => ({ ...prev, ...updates }));
      setAiConfidence(0.94);
      setIsAnalyzing(false);
      toast.success("AI has suggested classifications based on assessment context.");
    }, 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.businessUnitId) {
      toast.error("Please fill in required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createDiscoveryAssessment({
        name: formData.name,
        organizationId: customerId,
        businessUnitId: formData.businessUnitId,
        environmentType: formData.environmentType as any,
        regionId: formData.regionId || undefined,
        createdBy: "Sarah Chen" // Mock user
      });

      if (result.success) {
        toast.success("Assessment created successfully");
        onSuccess();
        onClose();
      } else {
        toast.error(result.error);
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
           <div>
              <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                 <Zap size={20} className="text-primary" />
                 Create New Assessment
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Enterprise Discovery Hub</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-muted rounded-sm transition-all">
              <X size={18} className="text-muted-foreground" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Assessment Name</label>
                    <div className="relative">
                       <input 
                          required
                          type="text" 
                          placeholder="e.g. Q3 North America Audit"
                          className="w-full bg-background/20 border border-border rounded-sm px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                       />
                       <button 
                          type="button"
                          onClick={handleAISuggest}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-sm transition-all"
                          title="Auto-classify with AI"
                       >
                          {isAnalyzing ? <Zap size={14} className="animate-spin" /> : <Zap size={14} />}
                       </button>
                    </div>
                    {aiConfidence && (
                       <div className="flex items-center gap-1.5 px-1 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">AI Confidence: {(aiConfidence * 100).toFixed(0)}%</span>
                       </div>
                    )}
                 </div>

                 <MasterDropdown 
                    label="Business Unit"
                    category="business_units"
                    placeholder="Select Unit..."
                    value={formData.businessUnitId}
                    onChange={(val) => setFormData({ ...formData, businessUnitId: val })}
                 />

                 <MasterDropdown 
                    label="Environment Type"
                    category="environment_types"
                    value={formData.environmentType}
                    onChange={(val) => setFormData({ ...formData, environmentType: val })}
                 />
              </div>

              {/* Scoping */}
              <div className="space-y-4">
                 <MasterDropdown 
                    label="Target Region"
                    category="regions"
                    value={formData.regionId}
                    onChange={(val) => setFormData({ ...formData, regionId: val })}
                 />

                 <MasterDropdown 
                    multiSelect
                    label="Compliance Frameworks"
                    category="compliance_frameworks"
                    selectedValues={formData.frameworks}
                    onMultiChange={(vals) => setFormData({ ...formData, frameworks: vals })}
                    onChange={() => {}}
                 />

                 <MasterDropdown 
                    multiSelect
                    label="Target PAM Platforms"
                    category="pam_platforms"
                    selectedValues={formData.pamPlatforms}
                    onMultiChange={(vals) => setFormData({ ...formData, pamPlatforms: vals })}
                    onChange={() => {}}
                 />
              </div>
           </div>

           <div className="p-4 bg-primary/5 border border-primary/20 rounded-sm flex gap-3">
              <AlertCircle size={18} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-primary/80 font-medium leading-relaxed uppercase tracking-widest">
                 Initializing an assessment will automatically trigger background discovery jobs for selected regions. 
                 Report accuracy depends on the quality of configured connectors.
              </p>
           </div>
        </form>

        <div className="px-8 py-6 border-t border-border bg-muted/20 flex justify-end gap-3">
           <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2 border border-border text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-muted transition-all"
           >
              Cancel
           </button>
           <button 
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-8 py-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-sm shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2"
           >
              {isSubmitting ? "Initializing..." : "Create Assessment"}
              <Save size={14} />
           </button>
        </div>
      </div>
    </div>
  );
}
