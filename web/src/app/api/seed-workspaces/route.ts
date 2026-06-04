import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) return NextResponse.json({ error: "Missing tenantId" });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { customer: true }
    });

    if (!tenant) return NextResponse.json({ error: "Tenant not found" });

    // 1. Create Workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: "Enterprise Automation Workspace",
        description: "Primary workspace for " + tenant.name,
        tenantId: tenant.id,
        customerId: tenant.customerId
      }
    });

    // 2. Create Hierarchy
    const folderA = await prisma.folder.create({
      data: {
        name: "Financial Audits",
        workspaceId: workspace.id,
        tenantId: tenant.id,
        customerId: tenant.customerId
      }
    });

    await prisma.folder.create({
      data: {
        name: "Q1 Reports",
        parentId: folderA.id,
        workspaceId: workspace.id,
        tenantId: tenant.id,
        customerId: tenant.customerId
      }
    });

    const folderB = await prisma.folder.create({
      data: {
        name: "HR Onboarding",
        workspaceId: workspace.id,
        tenantId: tenant.id,
        customerId: tenant.customerId
      }
    });

    // 3. Create Projects
    await prisma.project.create({
      data: {
        name: "Payroll Sync 2026",
        folderId: folderA.id,
        workspaceId: workspace.id,
        tenantId: tenant.id,
        customerId: tenant.customerId,
        version: "2.1.0"
      }
    });

    await prisma.project.create({
      data: {
        name: "Employee Self Service",
        folderId: folderB.id,
        workspaceId: workspace.id,
        tenantId: tenant.id,
        customerId: tenant.customerId,
        version: "1.0.4"
      }
    });

    return NextResponse.json({ 
      success: true, 
      workspaceId: workspace.id,
      message: "Seeded hierarchy for " + tenant.name 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
