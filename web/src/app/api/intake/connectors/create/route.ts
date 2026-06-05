import { prisma } from "@/lib/prisma";
import { SecretEncryption } from "@/modules/intake/security/SecretEncryption";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, type, configuration, customerId, tenantId, userId, pollingInterval } = body;

        if (!name || !type || !configuration || !customerId || !tenantId || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Define which fields are sensitive based on connector type
        const sensitiveFieldsMap: Record<string, string[]> = {
            'EMAIL': ['password'],
            'S3': ['accessKey', 'secretKey'],
            'AZURE_BLOB': ['connectionString'],
            'SFTP': ['password']
        };

        const sensitiveFields = sensitiveFieldsMap[type] || [];
        const encryptedConfiguration = SecretEncryption.encryptConfig(configuration, sensitiveFields);

        const connector = await prisma.intakeConnector.create({
            data: {
                name,
                type,
                configuration: encryptedConfiguration,
                customerId,
                tenantId,
                createdBy: userId,
                pollingInterval: pollingInterval || 60,
                status: "ACTIVE" // Auto-activate for now, or use INITIALIZING if background tasks handle it
            }
        });

        return NextResponse.json(connector);
    } catch (error: any) {
        console.error('[API Connectors Create] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
