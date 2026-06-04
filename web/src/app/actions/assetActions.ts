"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// Encryption helper (Mocking for now, would use real keys in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "next-gen-platform-secret-key-32-chars-long!";
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  // Ensure the key is exactly 32 bytes for aes-256-cbc
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string) {
  const [ivHex, encryptedHex] = text.split(":");
  if (!ivHex || !encryptedHex) return text;
  
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(encryptedHex, "hex");
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export async function getAssets(projectId: string) {
  try {
    const assets = await prisma.asset.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { versions: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Mask secret values in metadata for UI
    return assets.map(asset => ({
      ...asset,
      // For UI, we don't return the secret value even if it's in metadata
      // (Value is usually in versions or secretStore)
    }));
  } catch (error) {
    console.error("Error fetching assets:", error);
    throw new Error("Failed to fetch assets");
  }
}

export async function createAsset(data: any) {
  const { 
    name, 
    description, 
    type, 
    value, 
    isSecret, 
    encryptionProfile, 
    projectId,
    username,
    password,
    domain
  } = data;

  try {
    console.log("Creating asset with data:", { ...data, value: isSecret ? "********" : value });
    
    // Explicitly check for model existence to debug the 'undefined' issue
    if (!(prisma as any).asset) {
      console.error("CRITICAL: 'asset' model is missing from Prisma client instance.");
      throw new Error("System Error: Asset Management module not initialized in database client. Please refresh the page.");
    }

    // Get project context to inherit tenant/customer/workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true, customerId: true, tenantId: true, name: true }
    });

    if (!project) {
      console.error("Project not found for ID:", projectId);
      throw new Error(`Project not found (ID: ${projectId})`);
    }

    console.log("Found project context:", project.name);

    const asset = await prisma.$transaction(async (tx) => {
      const newAsset = await tx.asset.create({
        data: {
          name,
          description,
          type,
          isSecret,
          encryptionProfile,
          projectId,
          workspaceId: project.workspaceId,
          customerId: project.customerId,
          tenantId: project.tenantId,
          status: "ENABLED",
        }
      });

      // Create initial version
      let metadataJson: any = {};
      if (type === 'Credential') {
        metadataJson = { username, domain, hasPassword: !!password };
      } else {
        metadataJson = { value: isSecret ? "********" : value };
      }

      await tx.assetVersion.create({
        data: {
          assetId: newAsset.id,
          versionNumber: 1,
          metadataJson,
          changeReason: "Initial creation"
        }
      });

      // Handle secret storage
      if (isSecret || type === 'Credential') {
        const payloadToEncrypt = type === 'Credential' 
          ? JSON.stringify({ username, password, domain })
          : value;

        await tx.assetSecretStore.create({
          data: {
            assetId: newAsset.id,
            versionNumber: 1,
            encryptedPayload: encrypt(payloadToEncrypt),
            keyReference: "SYSTEM_AES_256",
          }
        });
      }

      // Audit log
      await tx.assetAccessAudit.create({
        data: {
          assetId: newAsset.id,
          action: "CREATE",
          actorType: "USER",
          actorId: "current-user-id", // Should get from session
          outcome: "SUCCESS"
        }
      });

      return newAsset;
    });

    revalidatePath("/studio");
    return asset;
  } catch (error: any) {
    console.error("Error creating asset:", error);
    throw new Error(error.message || "Failed to create asset");
  }
}
export async function getAsset(name: string, projectId: string) {
  try {
    const asset = await prisma.asset.findFirst({
      where: { name, projectId },
      include: {
        secretStore: true
      }
    });

    if (!asset) throw new Error(`Asset not found: ${name}`);

    let value: any = null;
    if (asset.secretStore) {
      const decrypted = decrypt(asset.secretStore.encryptedPayload);
      try {
        // If it's a Credential, it was stored as a JSON string of {username, password, domain}
        value = JSON.parse(decrypted);
      } catch {
        value = decrypted;
      }
    }

    // Wrap password in a special object as requested
    if (asset.type === 'Credential' && value && typeof value === 'object') {
      return {
        username: value.username,
        domain: value.domain,
        password: {
          _isPassword: true,
          value: value.password
        }
      };
    }

    return value;
  } catch (error: any) {
    console.error("Error getting asset:", error);
    throw new Error(error.message || "Failed to get asset");
  }
}
