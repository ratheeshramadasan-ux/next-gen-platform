import { prisma } from '@/lib/prisma';
import { startEmailWatcher } from '../watchers/EmailWatcher';
import { startS3Watcher } from '../watchers/S3Watcher';
import { startAzureWatcher } from '../watchers/AzureWatcher';
import { startSFTPWatcher } from '../watchers/SFTPWatcher';

export class PollingEngine {
    private static interval: NodeJS.Timeout | null = null;
    private static isRunning = false;

    /**
     * Starts the global auto-polling engine.
     * This iterates over all active connectors and triggers their respective watchers.
     */
    static start(intervalMs: number = 60000) {
        if (this.interval) return;

        console.log(`[PollingEngine] Starting intake polling engine (Interval: ${intervalMs}ms)`);
        
        this.interval = setInterval(() => this.pollAll(), intervalMs);
        // Run immediately on start
        this.pollAll();
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        console.log('[PollingEngine] Stopped');
    }

    private static async pollAll() {
        if (this.isRunning) {
            console.log('[PollingEngine] Previous poll still in progress, skipping...');
            return;
        }

        this.isRunning = true;
        try {
            const activeConnectors = await prisma.intakeConnector.findMany({
                where: {
                    enabled: true,
                    status: 'ACTIVE'
                }
            });

            console.log(`[PollingEngine] Found ${activeConnectors.length} active connectors to poll`);

            for (const connector of activeConnectors) {
                // Record start of run
                const run = await prisma.intakeRun.create({
                    data: {
                        connectorId: connector.id,
                        status: 'RUNNING'
                    }
                });

                try {
                    switch (connector.type) {
                        case 'EMAIL':
                            await startEmailWatcher(connector);
                            break;
                        case 'S3':
                            await startS3Watcher(connector);
                            break;
                        case 'AZURE_BLOB':
                            await startAzureWatcher(connector);
                            break;
                        case 'SFTP':
                            await startSFTPWatcher(connector);
                            break;
                        default:
                            console.warn(`[PollingEngine] Unknown connector type: ${connector.type}`);
                    }

                    // Update run as success
                    await prisma.intakeRun.update({
                        where: { id: run.id },
                        data: {
                            status: 'SUCCESS',
                            completedAt: new Date()
                        }
                    });

                    // Update connector heartbeat
                    await prisma.intakeConnector.update({
                        where: { id: connector.id },
                        data: { lastHeartbeat: new Date() }
                    });

                } catch (error: any) {
                    console.error(`[PollingEngine] Error polling connector ${connector.id}:`, error);
                    
                    await prisma.intakeRun.update({
                        where: { id: run.id },
                        data: {
                            status: 'FAILED',
                            completedAt: new Date(),
                            errorMessage: error.message || 'Unknown error during polling'
                        }
                    });
                }
            }
        } catch (error) {
            console.error('[PollingEngine] Fatal error in polling cycle:', error);
        } finally {
            this.isRunning = false;
        }
    }
}
