import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';
import { BaseConnector, ConnectorStatus } from '../shared/BaseConnector';

export class EmailConnector implements BaseConnector {
    private client: ImapFlow;
    private config: any;
    private stats = {
        processed: 0,
        failures: 0,
        lastPoll: ''
    };

    constructor(config: any) {
        this.config = config;
        this.client = new ImapFlow({
            host: config.host,
            port: parseInt(config.port),
            secure: config.secure ?? true,
            auth: {
                user: config.username,
                pass: config.password
            },
            logger: false
        });
    }

    async connect(): Promise<void> {
        await this.client.connect();
    }

    async disconnect(): Promise<void> {
        await this.client.logout();
    }

    async validate(): Promise<boolean> {
        try {
            await this.connect();
            await this.disconnect();
            return true;
        } catch (error) {
            console.error('[EmailConnector] Validation failed:', error);
            return false;
        }
    }

    async poll(): Promise<void> {
        this.stats.lastPoll = new Date().toISOString();
        const lock = await this.client.getMailboxLock(this.config.folder || 'INBOX');

        try {
            for await (let msg of this.client.fetch('1:*', { source: true })) {
                try {
                    if (!msg.source) continue;
                    const parsed: any = await simpleParser(msg.source);
                    
                    for (const attachment of parsed.attachments) {
                        const fileName = attachment.filename || `attachment_${Date.now()}`;
                        const filePath = path.join(process.cwd(), 'storage/raw', fileName);
                        
                        fs.writeFileSync(filePath, attachment.content);
                        console.log('[EmailConnector] File ingested:', fileName);
                        
                        this.stats.processed++;
                        // TODO: Push to Ingestion Queue (BullMQ)
                    }
                    
                    // Mark as seen or move to processed folder
                    if (this.config.moveProcessedTo) {
                        await this.client.messageMove(msg.uid.toString(), this.config.moveProcessedTo);
                    }
                } catch (err) {
                    this.stats.failures++;
                    console.error('[EmailConnector] Error parsing message:', err);
                }
            }
        } finally {
            lock.release();
        }
    }

    async getStatus(): Promise<ConnectorStatus> {
        return {
            status: 'CONNECTED', // Simplification for now
            lastPoll: this.stats.lastPoll,
            filesProcessed: this.stats.processed,
            failures: this.stats.failures
        };
    }
}
