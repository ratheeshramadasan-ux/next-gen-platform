import Client from 'ssh2-sftp-client';
import path from 'path';
import { BaseConnector, ConnectorStatus } from '../shared/BaseConnector';

export class SFTPConnector implements BaseConnector {
    private client = new Client();
    private config: any;
    private stats = {
        processed: 0,
        failures: 0,
        lastPoll: '',
        latency: 0
    };

    constructor(config: any) {
        this.config = config;
    }

    async connect(): Promise<void> {
        const start = Date.now();
        await this.client.connect({
            host: this.config.host,
            port: parseInt(this.config.port) || 22,
            username: this.config.username,
            password: this.config.password,
            privateKey: this.config.privateKey
        });
        this.stats.latency = Date.now() - start;
    }

    async disconnect(): Promise<void> {
        await this.client.end();
    }

    async validate(): Promise<boolean> {
        try {
            await this.connect();
            await this.disconnect();
            return true;
        } catch (error) {
            console.error('[SFTPConnector] Validation failed:', error);
            return false;
        }
    }

    async poll(): Promise<void> {
        this.stats.lastPoll = new Date().toISOString();
        try {
            await this.connect();
            const files = await this.client.list(this.config.remotePath || '/');

            for (const file of files) {
                if (file.type === '-') { // File
                    try {
                        const localPath = path.join(process.cwd(), 'storage/raw', file.name);
                        const remotePath = path.join(this.config.remotePath || '/', file.name);

                        await this.client.fastGet(remotePath, localPath);
                        console.log('[SFTPConnector] File ingested:', file.name);
                        
                        this.stats.processed++;
                        // TODO: Push to Ingestion Queue (BullMQ)
                    } catch (err) {
                        this.stats.failures++;
                        console.error('[SFTPConnector] Error getting file:', file.name, err);
                    }
                }
            }
        } finally {
            await this.disconnect();
        }
    }

    async getStatus(): Promise<ConnectorStatus> {
        return {
            status: 'CONNECTED',
            lastPoll: this.stats.lastPoll,
            filesProcessed: this.stats.processed,
            failures: this.stats.failures,
            latency: this.stats.latency
        };
    }
}
