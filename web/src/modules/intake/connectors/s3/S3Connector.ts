import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { BaseConnector, ConnectorStatus } from '../shared/BaseConnector';

export class S3Connector implements BaseConnector {
    private client: S3Client;
    private config: any;
    private stats = {
        processed: 0,
        failures: 0,
        lastPoll: ''
    };

    constructor(config: any) {
        this.config = config;
        this.client = new S3Client({
            region: config.region,
            endpoint: config.endpoint,
            credentials: {
                accessKeyId: config.accessKey,
                secretAccessKey: config.secretKey
            },
            forcePathStyle: true
        });
    }

    async connect(): Promise<void> {
        // AWS SDK doesn't require explicit connect for S3
    }

    async disconnect(): Promise<void> {
        this.client.destroy();
    }

    async validate(): Promise<boolean> {
        try {
            await this.client.send(new ListObjectsV2Command({
                Bucket: this.config.bucket,
                MaxKeys: 1
            }));
            return true;
        } catch (error) {
            console.error('[S3Connector] Validation failed:', error);
            return false;
        }
    }

    async poll(): Promise<void> {
        this.stats.lastPoll = new Date().toISOString();
        try {
            const files = await this.client.send(new ListObjectsV2Command({
                Bucket: this.config.bucket
            }));

            for (const file of files.Contents || []) {
                try {
                    const response = await this.client.send(new GetObjectCommand({
                        Bucket: this.config.bucket,
                        Key: file.Key!
                    }));

                    const stream = response.Body as any;
                    const filePath = path.join(process.cwd(), 'storage/raw', file.Key!);
                    
                    // Ensure directory exists
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    
                    const writer = fs.createWriteStream(filePath);
                    await new Promise<void>((resolve, reject) => {
                        stream.pipe(writer);
                        writer.on('finish', () => resolve());
                        writer.on('error', reject);
                    });

                    console.log('[S3Connector] File ingested:', file.Key);
                    this.stats.processed++;
                    
                    // TODO: Push to Ingestion Queue (BullMQ)
                } catch (err) {
                    this.stats.failures++;
                    console.error('[S3Connector] Error downloading file:', file.Key, err);
                }
            }
        } catch (err) {
            console.error('[S3Connector] Polling failed:', err);
        }
    }

    async getStatus(): Promise<ConnectorStatus> {
        return {
            status: 'CONNECTED',
            lastPoll: this.stats.lastPoll,
            filesProcessed: this.stats.processed,
            failures: this.stats.failures
        };
    }
}
