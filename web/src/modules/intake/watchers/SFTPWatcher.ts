import Client from "ssh2-sftp-client";
import { IntakeStorageService } from '../storage/IntakeStorageService';
import { SecretEncryption } from '../security/SecretEncryption';
import path from 'path';

export async function startSFTPWatcher(connector: any) {
    const config = connector.configuration;
    const sftp = new Client();

    // Decrypt password
    const password = SecretEncryption.decrypt(config.password);

    console.log(`[SFTPWatcher] Connecting to ${config.host} for ${connector.name}...`);

    try {
        await sftp.connect({
            host: config.host,
            port: parseInt(config.port) || 22,
            username: config.username,
            password: password,
        });

        const files = await sftp.list(config.remotePath || '/');

        for (const file of files) {
            if (file.type === 'd') continue; // Skip directories

            try {
                const remoteFilePath = `${config.remotePath || '/'}/${file.name}`;
                const content = await sftp.get(remoteFilePath);

                await IntakeStorageService.saveIncomingDocument({
                    connectorId: connector.id,
                    fileName: file.name,
                    content: content as Buffer,
                    metadata: {
                        sftpHost: config.host,
                        remotePath: remoteFilePath,
                        size: file.size,
                        modifyTime: file.modifyTime
                    }
                });

                // Archive if configured
                if (config.archivePath) {
                    const archiveFilePath = `${config.archivePath}/${file.name}`;
                    
                    // Move to archive (using rename)
                    await sftp.rename(remoteFilePath, archiveFilePath);
                    
                    console.log(`[SFTPWatcher] Archived SFTP file ${file.name} to ${archiveFilePath}`);
                } else {
                    // If no archive path, maybe we should delete to avoid re-processing?
                    // For now, assume polling logic handles it or user provides archive path.
                }
            } catch (error) {
                console.error(`[SFTPWatcher] Error processing SFTP file ${file.name}:`, error);
            }
        }
    } finally {
        await sftp.end();
    }
}
