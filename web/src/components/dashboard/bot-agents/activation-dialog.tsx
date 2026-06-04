"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { activateBotHostAction } from "@/app/actions/botAgentActions";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

interface ActivationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  host: {
    id: string;
    hostname: string;
    tenantId: string;
  } | null;
  tenants: Array<{ id: string; name: string }>;
  role: string;
}

export function ActivationDialog({
  isOpen,
  onClose,
  host,
  tenants,
  role,
}: ActivationDialogProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    host?.tenantId || ""
  );
  const [agentMode, setAgentMode] = useState<string>("Unattended");
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (host) {
      setSelectedTenantId(host.tenantId);
    }
  }, [host]);

  const handleActivate = async () => {
    if (!host) return;

    setIsSubmitting(true);
    try {
      const result = await activateBotHostAction(
        host.id,
        selectedTenantId,
        role,
        agentMode
      );
      if (result.success) {
        toast.success("Agent Activated", {
          description: `Host ${host.hostname} has been activated successfully.`,
        });
        onClose();
      } else {
        toast.error("Activation Failed", {
          description: result.error || "An unknown error occurred.",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to perform activation.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border-border bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl font-black tracking-tight">
            Activate Bot Agent
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Assign host <span className="font-bold text-foreground">{host?.hostname}</span> to a tenant and generate a trust token.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tenant" className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
              Select Target Tenant
            </Label>
            <Select
              value={selectedTenantId}
              onValueChange={setSelectedTenantId}
            >
              <SelectTrigger id="tenant" className="border-border bg-background/50">
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              This runner will be scoped to the selected environment's orchestration queue.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mode" className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
              Agent Mode
            </Label>
            <Select
              value={agentMode}
              onValueChange={setAgentMode}
            >
              <SelectTrigger id="mode" className="border-border bg-background/50">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                <SelectItem value="Unattended">Unattended (Background)</SelectItem>
                <SelectItem value="Attended">Attended (User Assisted)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Determines if this agent runs silently or interacts with a human.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border bg-background hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            onClick={handleActivate}
            disabled={isSubmitting || !selectedTenantId}
            className="bg-primary text-primary-foreground hover:opacity-90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : (
              "Confirm Activation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
