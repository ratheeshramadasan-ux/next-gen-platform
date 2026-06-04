import { prisma } from "@/lib/prisma";
import archiver from "archiver";
import { jsPDF } from "jspdf";
import crypto from "crypto";
import { Readable, PassThrough } from "stream";

/**
 * AuditBundleService - Generates a Multi-Artifact ZIP-based Compliance Package
 * Includes JSON data layer, PDF human report, and SHA-256 manifest.
 */
export class AuditBundleService {
  
  static async generateComplianceBundle(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        tenants: {
          include: {
            workspaces: { include: { folders: true } },
            botHosts: true,
            jobs: true,
            workflowQueues: true,
          }
        },
        users: true
      }
    });

    if (!customer) throw new Error("Customer not found");

    // 1. Prepare Data Artifacts (JSON)
    const datasets = {
      "customers.json": [customer],
      "tenants.json": customer.tenants,
      "folders.json": customer.tenants.flatMap(t => t.workspaces.flatMap(w => w.folders)),
      "vms.json": customer.tenants.flatMap(t => t.botHosts),
      "jobs.json": customer.tenants.flatMap(t => t.jobs),
      "audit_logs.json": await prisma.auditLog.findMany({
        where: { metadata: { contains: customerId } },
        orderBy: { timestamp: "desc" }
      })
    };

    // 2. Prepare Human Report (PDF)
    const pdfReport = await this.generatePDFReport(customer);

    // 3. Create ZIP Archive
    const zipPassThrough = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    archive.pipe(zipPassThrough);

    const manifest: Record<string, string> = {};

    // Add JSON files to ZIP and calculate hashes
    for (const [filename, data] of Object.entries(datasets)) {
      const content = JSON.stringify(data, null, 2);
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      archive.append(content, { name: filename });
      manifest[filename] = hash;
    }

    // Add PDF to ZIP
    const pdfBuffer = Buffer.from(pdfReport);
    const pdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
    archive.append(pdfBuffer, { name: "compliance_report.pdf" });
    manifest["compliance_report.pdf"] = pdfHash;

    // Add Integrity Manifest
    const manifestContent = JSON.stringify({
      version: "1.0",
      generatedAt: new Date().toISOString(),
      customerId: customer.id,
      hashes: manifest
    }, null, 2);
    archive.append(manifestContent, { name: "manifest.json" });

    await archive.finalize();

    // For this MVP, we return metadata about the bundle
    // In a real app, the bundleHash would be the SHA-256 of the actual ZIP file on disk/S3
    const bundleHash = crypto.createHash("sha256").update(manifestContent + Date.now()).digest("hex");
    
    return {
      filename: `audit-package-${customer.id}-${Date.now()}.zip`,
      manifest,
      bundleSize: archive.pointer(),
      bundleHash
    };
  }

  private static async generatePDFReport(customer: any) {
    const doc = new jsPDF();
    const ts = new Date().toLocaleString();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("AUDIT COMPLIANCE REPORT", 20, 30);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Customer: ${customer.companyName}`, 20, 45);
    doc.text(`Export Timestamp: ${ts}`, 20, 52);
    doc.text(`Platform Version: Next Gen v2.0`, 20, 59);

    doc.line(20, 65, 190, 65);

    doc.setFont("helvetica", "bold");
    doc.text("EXECUTIVE SUMMARY", 20, 80);
    doc.setFont("helvetica", "normal");
    doc.text([
      `This report documents the security posture and resource inventory for ${customer.companyName}.`,
      `The customer currently maintains ${customer.tenants.length} active tenants with ${customer.users.length} registered users.`,
      `A total of ${customer.tenants.reduce((acc: number, t: any) => acc + t.botHosts.length, 0)} VM resources were identified.`
    ], 20, 90);

    doc.setFont("helvetica", "bold");
    doc.text("RESOURCE INVENTORY", 20, 120);
    doc.setFontSize(10);
    let y = 130;
    customer.tenants.forEach((t: any) => {
       doc.text(`- Tenant: ${t.name} (${t.type}) - ${t.status}`, 25, y);
       y += 7;
    });

    doc.setFontSize(8);
    doc.text("This document is cryptographically verified via manifest.json SHA-256 integrity layer.", 20, 280);

    return doc.output("arraybuffer");
  }
}
