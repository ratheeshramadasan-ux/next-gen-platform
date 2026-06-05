import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { IntakeStorageService } from '../storage/IntakeStorageService';
import { SecretEncryption } from '../security/SecretEncryption';

export async function startEmailWatcher(connector: any) {
    const config = connector.configuration;
    
    // Decrypt password
    const password = SecretEncryption.decrypt(config.password);

    const client = new ImapFlow({
        host: config.host,
        port: parseInt(config.port),
        secure: config.secure !== false,
        auth: {
            user: config.username,
            pass: password,
        },
        logger: false
    });

    console.log(`[EmailWatcher] Connecting to ${config.host} for ${connector.name}...`);
    
    await client.connect();

    try {
        const lock = await client.getMailboxLock(config.folder || 'INBOX');
        try {
            for await (const msg of client.fetch('1:*', { source: true, envelope: true })) {
                try {
                    if (!msg.source) continue;
                    
                    const parsed: any = await simpleParser(msg.source);
                    
                    if (parsed.attachments && Array.from(parsed.attachments).length > 0) {
                        for (const attachment of (parsed.attachments as any[])) {
                            // Robust filename extraction
                            const filename = attachment.filename || attachment.checksum || `unnamed_attachment_${Date.now()}`;
                            const ext = filename.split('.').pop()?.toLowerCase();
                            
                            if (config.allowedExtensions && Array.isArray(config.allowedExtensions)) {
                                if (!ext || !config.allowedExtensions.includes(ext)) {
                                    console.log(`[EmailWatcher] Skipping disallowed or missing extension: ${ext || 'none'}`);
                                    continue;
                                }
                            }

                            // Ensure content is a Buffer
                            const content = Buffer.isBuffer(attachment.content) 
                                ? attachment.content 
                                : Buffer.from(attachment.content);

                            await IntakeStorageService.saveIncomingDocument({
                                connectorId: connector.id,
                                fileName: filename,
                                content: content,
                                metadata: {
                                    messageId: msg.envelope?.messageId || 'N/A',
                                    subject: msg.envelope?.subject || 'No Subject',
                                    from: msg.envelope?.from?.[0]?.address || 'Unknown Sender',
                                    receivedAt: msg.envelope?.date || new Date().toISOString()
                                }
                            });
                        }
                    }

                    // Move processed message if configured
                    if (config.moveProcessedTo) {
                        await client.messageMove(msg.uid.toString(), config.moveProcessedTo);
                        console.log(`[EmailWatcher] Moved message ${msg.uid} to ${config.moveProcessedTo}`);
                    }
                } catch (err) {
                    console.error(`[EmailWatcher] Error parsing message ${msg.uid}:`, err);
                }
            }
        } finally {
            lock.release();
        }
    } finally {
        await client.logout();
    }
}
