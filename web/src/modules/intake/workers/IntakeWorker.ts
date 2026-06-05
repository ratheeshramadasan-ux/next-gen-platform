import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues/IntakeQueue';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const startIntakeWorker = () => {
    console.log('[IntakeWorker] Starting worker on queue: document-intake');
    
    const worker = new Worker('document-intake', async (job: Job) => {
        const { documentId, storagePath, fileName } = job.data;
        
        console.log(`[IntakeWorker] Processing document ${documentId} (${fileName})...`);

        try {
            // 1. Verify file exists
            if (!fs.existsSync(storagePath)) {
                throw new Error(`Storage file not found: ${storagePath}`);
            }

            // 2. Mock Virus Scan
            console.log(`[IntakeWorker] Virus scanning ${fileName}... OK`);

            // 3. Mock Image Normalization / OCR Pre-processing
            console.log(`[IntakeWorker] Normalizing document structure...`);
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 4. Update Document Status
            await prisma.intakeDocument.update({
                where: { id: documentId },
                data: {
                    status: 'CLASSIFIED' // Moving forward in the pipeline
                }
            });

            console.log(`[IntakeWorker] Successfully processed ${documentId}`);
            
            return { status: 'SUCCESS', documentId };
        } catch (error: any) {
            console.error(`[IntakeWorker] Error processing document ${documentId}:`, error);
            
            await prisma.intakeDocument.update({
                where: { id: documentId },
                data: {
                    status: 'FAILED_PROCESSING'
                }
            });
            
            throw error; // Re-throw to trigger BullMQ retry
        }
    }, { 
        connection: redisConnection,
        concurrency: 5 // Process up to 5 documents in parallel
    });

    worker.on('completed', (job) => {
        console.log(`[IntakeWorker] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[IntakeWorker] Job ${job?.id} failed after attempts:`, err);
    });

    return worker;
};
