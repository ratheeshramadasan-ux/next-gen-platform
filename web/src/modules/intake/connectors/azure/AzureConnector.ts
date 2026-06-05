import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs';
import path from 'path';
import { BaseConnector, ConnectorStatus } from '../shared/BaseConnector';

export class AzureConnector implements BaseConnector {
    private client: BlobServiceClient;
    private config: any;
    private stats = {
        processed: 0,
        failures: 0,
        lastPoll: ''
    };

    constructor(config: any) {
        this.config = config;
        this.client = BlobServiceClient.fromConnectionString(config.connectionString);
    }

    async connect(): Promise<void> {
        // Azure SDK handles connection via client instantiation
    }

    async disconnect(): Promise<void> {
        // No explicit disconnect needed for BlobServiceClient
    }

    async validate(): Promise<boolean> {
        try {
            const containerClient = this.client.getContainerClient(this.config.containerName);
            await containerClient.getProperties();
            return true;
        } catch (error) {
            console.error('[AzureConnector] Validation failed:', error);
            return false;
        }
    }

    async poll(): Promise<void> {
        this.stats.lastPoll = new Date().toISOString();
        try {
            const containerClient = this.client.getContainerClient(this.config.containerName);
            
            for await (const blob of containerClient.listBlobsFlat()) {
                try {
                    const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
                    const filePath = path.join(process.cwd(), 'storage/raw', blob.name);
                    
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    
                    await blockBlobClient.downloadToFile(filePath);
                    
                    console.log('[AzureConnector] File ingested:', blob.name);
                    this.stats.processed++;
                    
                    // TODO: Push to Ingestion Queue (BullMQ)
                } catch (err) {
                    this.stats.failures++;
                    console.error('[AzureConnector] Error downloading blob:', blob.name, err);
                }
            }
        } catch (err) {
            console.error('[AzureConnector] Polling failed:', err);
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
