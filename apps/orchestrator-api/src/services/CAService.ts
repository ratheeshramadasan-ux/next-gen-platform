import forge from "node-forge";
import { prisma } from "../lib/prisma.js";
import { randomUUID } from "node:crypto";

/**
 * CAService - Implements Platform-Owned CA hierarchy (Root -> Tenant -> VM)
 * Uses node-forge for PKI operations.
 */
export class CAService {
  private static ENCRYPTION_KEY = process.env.CA_SECRET || "nexus-platform-pki-secret-key-2026";

  /**
   * Generates a Self-Signed Root CA for the platform.
   * Should be called only once during platform initialization.
   */
  static async generateRootCA() {
    console.log("[CA] Generating Platform Root CA...");
    
    const keys = forge.pki.rsa.generateKeyPair(4096);
    const cert = forge.pki.createCertificate();
    
    cert.publicKey = keys.publicKey;
    cert.serialNumber = "01";
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 20); // 20 years

    const attrs = [
      { name: "commonName", value: "NexusAI Platform Root CA" },
      { name: "organizationName", value: "NexusAI" },
      { name: "organizationalUnitName", value: "Platform Security" }
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    // Extensions for CA
    cert.setExtensions([
      { name: "basicConstraints", cA: true },
      { name: "keyUsage", keyCertSign: true, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true },
      { name: "subjectKeyIdentifier" }
    ]);

    // Self-sign
    cert.sign(keys.privateKey, forge.md.sha256.create());

    const pemCert = forge.pki.certificateToPem(cert);
    const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

    return await prisma.securityCredential.create({
      data: {
        type: "ROOT_CA",
        privateKey: pemKey, // In production, encrypt this
        certificate: pemCert,
        expiresAt: cert.validity.notAfter
      }
    });
  }

  /**
   * Generates a Tenant-scoped Intermediate CA signed by the Root CA.
   */
  static async generateTenantCA(tenantId: string) {
    const rootCred = await prisma.securityCredential.findFirst({
      where: { type: "ROOT_CA", isActive: true }
    });

    if (!rootCred) throw new Error("Root CA not found. Platform initialization required.");

    const rootKey = forge.pki.privateKeyFromPem(rootCred.privateKey);
    const rootCert = forge.pki.certificateFromPem(rootCred.certificate);

    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = randomUUID().replace(/-/g, "").substring(0, 16);
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5); // 5 years

    const subject = [
      { name: "commonName", value: `NexusAI Tenant CA (${tenantId})` },
      { name: "organizationName", value: "NexusAI" },
      { name: "organizationalUnitName", value: tenantId }
    ];
    cert.setSubject(subject);
    cert.setIssuer(rootCert.subject.attributes);

    cert.setExtensions([
      { name: "basicConstraints", cA: true, pathLenConstraint: 0 },
      { name: "keyUsage", keyCertSign: true, digitalSignature: true },
      { name: "authorityKeyIdentifier", keyIdentifier: rootCert.generateSubjectKeyIdentifier().at(0) }
    ]);

    cert.sign(rootKey, forge.md.sha256.create());

    return await prisma.securityCredential.create({
      data: {
        type: "TENANT_CA",
        ownerId: tenantId,
        privateKey: forge.pki.privateKeyToPem(keys.privateKey),
        certificate: forge.pki.certificateToPem(cert),
        expiresAt: cert.validity.notAfter
      }
    });
  }

  /**
   * Issues a leaf certificate for a VM, signed by the Tenant CA.
   * CN = VM_ID, OU = Tenant_ID
   */
  static async issueVMCertificate(vmId: string, tenantId: string) {
    let tenantCred = await prisma.securityCredential.findFirst({
      where: { type: "TENANT_CA", ownerId: tenantId, isActive: true }
    });

    if (!tenantCred) {
      tenantCred = await this.generateTenantCA(tenantId);
    }

    const tenantKey = forge.pki.privateKeyFromPem(tenantCred.privateKey);
    const tenantCert = forge.pki.certificateFromPem(tenantCred.certificate);

    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = randomUUID().replace(/-/g, "").substring(0, 16);
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1); // 1 year

    const subject = [
      { name: "commonName", value: vmId },
      { name: "organizationName", value: "NexusAI" },
      { name: "organizationalUnitName", value: tenantId }
    ];
    cert.setSubject(subject);
    cert.setIssuer(tenantCert.subject.attributes);

    cert.setExtensions([
      { name: "basicConstraints", cA: false },
      { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
      { name: "subjectAltName", altNames: [{ type: 2, value: vmId }] } // DNS type for VM identifier
    ]);

    cert.sign(tenantKey, forge.md.sha256.create());

    return await prisma.securityCredential.create({
      data: {
        type: "VM_CERT",
        ownerId: vmId,
        privateKey: forge.pki.privateKeyToPem(keys.privateKey),
        certificate: forge.pki.certificateToPem(cert),
        expiresAt: cert.validity.notAfter
      }
    });
  }
}
