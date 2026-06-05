import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { intakeQueue } from '../queues/IntakeQueue';
import crypto from 'crypto';

export interface SaveDocumentData {
    connectorId: string;
    fileName: string;
    content: Buffer;
    metadata?: Record<string, any>;
}

export class IntakeStorageService {
    private static STORAGE_ROOT = path.join(process.cwd(), 'storage/intake');

    /**
     * Saves an incoming document to disk and creates a database record.
     * Then publishes a message to the ingestion queue.
     */
    static async saveIncomingDocument(data: SaveDocumentData): Promise<string> {
        // Ensure storage directory exists
        if (!fs.existsSync(this.STORAGE_ROOT)) {
            fs.mkdirSync(this.STORAGE_ROOT, { recursive: true });
        }

        const timestamp = Date.now();
        const fileHash = crypto.createHash('sha256').update(data.content).digest('hex');
        const sanitizedFileName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
        const storagePath = path.join(this.STORAGE_ROOT, uniqueFileName);

        // Write file to disk
        fs.writeFileSync(storagePath, data.content);

        // Create record in database
        const document = await prisma.intakeDocument.create({
            data: {
                connectorId: data.connectorId,
                fileName: data.fileName,
                storagePath: storagePath,
                status: 'PENDING_CLASSIFICATION',
            }
        });

        console.log(`[IntakeStorageService] Saved document: ${data.fileName} (ID: ${document.id})`);

        // Publish to BullMQ for processing
        try {
            await intakeQueue.add('process-document', {
                documentId: document.id,
                storagePath,
                connectorId: data.connectorId,
                checksum: fileHash,
                metadata: data.metadata
            });
        } catch (error) {
            console.error(`[IntakeStorageService] Failed to queue document ${document.id}:`, error);
            // We still return the ID as the file is saved and DB record created
        }

        return document.id;
    }
}
