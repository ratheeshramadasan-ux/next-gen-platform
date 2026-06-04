"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { CAService } from "@/lib/services/CAService";

export async function registerVMAction(payload: {
  hostname: string;
  osType: string;
  tenantId: string;
  role: string;
}) {
  try {
    // 1. Authorization check
    if (payload.role !== "Platform Admin" && payload.role !== "Tenant Admin") {
      throw new Error("Unauthorized: Insufficient privileges for VM registration.");
    }

    // 2. Generate One-Time Activation Token (OTAT)
    const activationToken = uuidv4().split("-")[0].toUpperCase();

    const vm = await prisma.botHost.create({
      data: {
        hostname: payload.hostname,
        osType: payload.osType,
        tenantId: payload.tenantId,
        status: "Registered",
        activationToken: activationToken,
      }
    });

    return { success: true, vmId: vm.id, activationToken };
  } catch (e: any) {
    console.error("VM Registration failed:", e);
    return { success: false, error: e.message };
  }
}

export async function activateVMAction(payload: {
  vmId: string;
  activationToken: string;
  fingerprint: string;
}) {
  try {
    const vm = await prisma.botHost.findUnique({
      where: { id: payload.vmId }
    });

    if (!vm) throw new Error("VM not found");

    // 1. Validate Token
    if (vm.activationToken !== payload.activationToken) {
      throw new Error("Invalid activation token.");
    }

    if (vm.status !== "Registered" && vm.status !== "Validated") {
      throw new Error(`VM is in ${vm.status} state and cannot be activated.`);
    }

    // 2. Perform Secure Activation (Section 6.3)
    // Use the Internal CA Service to issue a VM-bound identity certificate
    const certResult = await CAService.issueVMCertificate(payload.vmId, vm.tenantId);

    await prisma.botHost.update({
      where: { id: payload.vmId },
      data: {
        status: "Active",
        fingerprint: payload.fingerprint,
        mtlsCertThumbprint: certResult.id, // Reference to the credential record
        activationToken: null, // Clear OTAT after use
        lastHeartbeat: new Date()
      }
    });

    return { 
      success: true, 
      certificate: certResult.certificate,
      certId: certResult.id
    };
  } catch (e: any) {
    console.error("VM Activation failed:", e);
    return { success: false, error: e.message };
  }
}

export async function deactivateVMAction(vmId: string, role: string) {
  try {
    await prisma.botHost.update({
      where: { id: vmId },
      data: { status: "Disabled" }
    });

    revalidatePath("/next-gen/monitoring");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
