"use client";

import React, { useState } from "react";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Shield, 
  Info,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  Clock,
  FileJson,
  Table as TableIcon,
  Lock,
  Code,
  Binary,
  Database,
  Globe,
  RotateCcw,
  AlertCircle
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { cn } from "@/lib/utils";
import { createAsset } from "../../../app/actions/assetActions";
import { IconWrapper } from "../../ui/icon-wrapper";

interface CreateAssetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId?: string | null;
}

const STEPS = [
  { id: 1, title: "Basic Info", description: "Name and type" },
  { id: 2, title: "Asset Value", description: "Content & security" },
  { id: 3, title: "Review", description: "Final check" }
];

const ASSET_TYPES = [
  { id: 'String', label: 'Text', icon: Type, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'Number', label: 'Number', icon: Hash, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { id: 'Boolean', label: 'Boolean', icon: ToggleLeft, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { id: 'Date', label: 'Date', icon: Calendar, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  { id: 'DateTime', label: 'DateTime', icon: Clock, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { id: 'JSON', label: 'JSON', icon: FileJson, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  { id: 'DataTable', label: 'DataTable', icon: TableIcon, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  { id: 'Credential', label: 'Credential', icon: Lock, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'XML', label: 'XML', icon: Code, color: 'text-slate-500', bgColor: 'bg-slate-500/10' },
  { id: 'Binary', label: 'File / Binary', icon: Binary, color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
  { id: 'SecretReference', label: 'Vault Ref', icon: Shield, color: 'text-rose-600', bgColor: 'bg-rose-600/10' },
  { id: 'CustomObject', label: 'Custom Object', icon: Globe, color: 'text-blue-600', bgColor: 'bg-blue-600/10' }
];

export function CreateAssetDrawer({ isOpen, onClose, onSuccess, projectId }: CreateAssetDrawerProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "String",
    value: "",
    isSecret: false,
    encryptionProfile: "STANDARD",
    // Credential specific
    username: "",
    password: "",
    domain: ""
  });
  
  const [backupValue, setBackupValue] = useState("");
  const [hasEverBeenSecret, setHasEverBeenSecret] = useState(false);
  const [isRetyping, setIsRetyping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const nextStep = () => {
    setError(null);
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };
  const prevStep = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleCreate = async () => {
    if (!projectId) {
      setError("Project ID is missing. Cannot create asset.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createAsset({
        ...formData,
        projectId
      });
      onSuccess();
      resetForm();
    } catch (err: any) {
      console.error("Failed to create asset:", err);
      setError(err.message || "Failed to create asset. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "String",
      value: "",
      isSecret: false,
      encryptionProfile: "STANDARD",
      username: "",
      password: "",
      domain: ""
    });
    setBackupValue("");
    setHasEverBeenSecret(false);
    setIsRetyping(false);
    setError(null);
    setCurrentStep(1);
  };

  const handleTypeSelect = (typeId: string) => {
    const isSecretType = typeId === 'Credential' || typeId === 'SecretReference';
    setFormData({
      ...formData, 
      type: typeId, 
      isSecret: isSecretType
    });
    if (isSecretType) {
      setHasEverBeenSecret(true);
      setIsRetyping(false);
    }
  };

  const toggleSecret = () => {
    const nextSecretState = !formData.isSecret;
    if (nextSecretState) {
      // Enabling Secret: Save current value to backup
      if (formData.value) {
        setBackupValue(formData.value);
        setHasEverBeenSecret(true);
      }
      setIsRetyping(false);
      setFormData({ ...formData, isSecret: nextSecretState });
    } else {
      // Disabling Secret: Blank the value immediately
      setIsRetyping(true);
      setFormData({ ...formData, isSecret: nextSecretState, value: "" });
    }
  };

  const restoreValue = () => {
    setFormData({ ...formData, value: backupValue });
    setIsRetyping(false); // Mask it again for safety after restoration
  };

  const handleValueChange = (val: string) => {
    setFormData({ ...formData, value: val });
    if (!formData.isSecret && hasEverBeenSecret) {
      setIsRetyping(true);
    }
  };

  const shouldMask = (formData.isSecret || (hasEverBeenSecret && !formData.isSecret && !isRetyping));

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/40">
          <div>
            <h2 className="text-xl font-bold text-foreground">Create Asset</h2>
            <p className="text-sm text-muted-foreground">New project-level resource</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted">
            <IconWrapper icon={X} size={20} />
          </Button>
        </div>

        {/* Stepper */}
        <div className="px-8 py-6 border-b border-border/20">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
            {STEPS.map((step) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300",
                  currentStep === step.id 
                    ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" 
                    : currentStep > step.id 
                      ? "bg-emerald-500 text-white" 
                      : "bg-muted text-muted-foreground border border-border/40"
                )}>
                  {currentStep > step.id ? <IconWrapper icon={Check} size={14} /> : step.id}
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  currentStep === step.id ? "text-primary" : "text-muted-foreground/60"
                )}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Asset Name <span className="text-rose-500">*</span></label>
                <Input 
                  placeholder="Enter asset name" 
                  className="bg-muted/40 border-border/40 h-12 font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Description</label>
                <Textarea 
                  placeholder="Enter description (optional)" 
                  className="bg-muted/40 border-border/40 min-h-[100px] resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Asset Type <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-4 gap-3">
                  {ASSET_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleTypeSelect(type.id)}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-xl border transition-all hover:scale-105",
                        formData.type === type.id 
                          ? "bg-primary/10 border-primary shadow-sm" 
                          : "bg-muted/20 border-border/40 grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", type.bgColor)}>
                        <IconWrapper icon={type.icon} size={20} className={type.color} />
                      </div>
                      <span className="text-[10px] font-bold text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Value Input Section */}
              <div className="space-y-4">
                {formData.type === 'Credential' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Username</label>
                      <Input 
                        placeholder="Username / Identity" 
                        className="bg-muted/40 border-border/40 h-12"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Password / Secret</label>
                      <Input 
                        type="password"
                        placeholder="********" 
                        className="bg-muted/40 border-border/40 h-12"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Domain / Scope (Optional)</label>
                      <Input 
                        placeholder="LDAP domain or environment" 
                        className="bg-muted/40 border-border/40 h-12"
                        value={formData.domain}
                        onChange={(e) => setFormData({...formData, domain: e.target.value})}
                      />
                    </div>
                  </div>
                ) : formData.type === 'JSON' || formData.type === 'DataTable' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{formData.type} Data</label>
                    <Textarea 
                      placeholder={`Enter ${formData.type} content...`} 
                      className={cn(
                        "bg-muted/40 border-border/40 font-mono text-xs min-h-[200px]",
                        shouldMask && "mask-text-security"
                      )}
                      value={formData.value}
                      onChange={(e) => handleValueChange(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Value</label>
                    <div className="relative">
                      <Input 
                        type={shouldMask ? "password" : "text"}
                        placeholder={shouldMask ? "********" : `Enter ${formData.type.toLowerCase()} value`} 
                        className="bg-muted/40 border-border/40 h-12 pr-10"
                        value={formData.value}
                        onChange={(e) => handleValueChange(e.target.value)}
                      />
                      {shouldMask && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40">
                          <IconWrapper icon={Lock} size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Security Section */}
              <div className="pt-6 border-t border-border/20 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", formData.isSecret ? "bg-primary/10" : "bg-muted")}>
                      <IconWrapper icon={Lock} size={16} className={formData.isSecret ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Mark as Secret</h4>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Encrypt and mask this value</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasEverBeenSecret && !formData.isSecret && !isRetyping && backupValue && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-3 text-[10px] font-black text-primary hover:bg-primary/10 flex items-center gap-1.5"
                        onClick={restoreValue}
                      >
                        <IconWrapper icon={RotateCcw} size={12} />
                        RESTORE
                      </Button>
                    )}
                    <Button 
                      variant={formData.isSecret ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-8 rounded-full text-[10px] font-black px-4",
                        formData.isSecret && "bg-primary hover:bg-primary/90 border-none"
                      )}
                      onClick={toggleSecret}
                      disabled={formData.type === 'Credential' || formData.type === 'SecretReference'}
                    >
                      {formData.isSecret ? "ENABLED" : "ENABLE"}
                    </Button>
                  </div>
                </div>

                {hasEverBeenSecret && !formData.isSecret && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <IconWrapper icon={AlertCircle} size={14} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-[10px] text-primary/80 leading-relaxed font-medium">
                      {isRetyping 
                        ? "You are now retyping in unmasked mode. Security is currently disabled for this value." 
                        : "Security was previously enabled. For your protection, the value remains masked. You can retype in unmasked mode or click RESTORE to reveal the original value."}
                    </p>
                  </div>
                )}

                {formData.isSecret && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Encryption Profile</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'STANDARD', title: 'Standard', desc: 'AES-256 GCM' },
                        { id: 'HIGH_COMPLEX', title: 'Advanced', desc: 'Envelope' }
                      ].map((profile) => (
                        <button
                          key={profile.id}
                          onClick={() => setFormData({...formData, encryptionProfile: profile.id})}
                          className={cn(
                            "flex flex-col p-3 rounded-xl border text-left transition-all",
                            formData.encryptionProfile === profile.id 
                              ? "bg-primary/5 border-primary" 
                              : "bg-muted/10 border-border/40 hover:bg-muted/20"
                          )}
                        >
                          <span className="text-xs font-bold">{profile.title}</span>
                          <span className="text-[10px] text-muted-foreground opacity-60">{profile.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-6 bg-muted/20 border border-border/20 rounded-2xl space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b border-border/40 pb-2">Review Summary</h3>
                <div className="grid grid-cols-2 gap-y-6 gap-x-2">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block mb-1">Asset Name</span>
                    <span className="text-sm font-black">{formData.name || "Untitled"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block mb-1">Type</span>
                    <span className="text-sm font-black">{formData.type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block mb-1">Security Status</span>
                    <span className={cn(
                      "text-xs font-black px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5",
                      formData.isSecret 
                        ? "bg-primary/10 text-primary border-primary/20" 
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    )}>
                      {formData.isSecret ? <IconWrapper icon={Lock} size={10} /> : <IconWrapper icon={Shield} size={10} />}
                      {formData.isSecret ? "SECRET" : "PLAINTEXT"}
                    </span>
                  </div>
                  {formData.isSecret && (
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block mb-1">Encryption</span>
                      <span className="text-sm font-black">{formData.encryptionProfile}</span>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t border-border/40">
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block mb-2">Description</span>
                  <p className="text-xs text-muted-foreground leading-relaxed ">
                    {formData.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
                <IconWrapper icon={Check} size={16} className="text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ready to create. This asset will be available to all workflows within the <strong>{projectId}</strong> project.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/40 space-y-4 bg-muted/10">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 animate-in slide-in-from-top-1">
              <AlertCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-rose-600 font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={currentStep === 1 ? onClose : prevStep}
              className="h-11 px-6 rounded-xl font-bold border-border/60"
              disabled={isSubmitting}
            >
              {currentStep === 1 ? "Cancel" : <><IconWrapper icon={ChevronLeft} size={16} className="mr-2" /> Previous</>}
            </Button>

            {currentStep < 3 ? (
              <Button 
                onClick={nextStep}
                disabled={currentStep === 1 && !formData.name}
                className="h-11 px-8 rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/20"
              >
                Next <IconWrapper icon={ChevronRight} size={16} className="ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleCreate}
                disabled={isSubmitting}
                className="h-11 px-10 rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/20"
              >
                {isSubmitting ? "Creating..." : "Create Asset"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
