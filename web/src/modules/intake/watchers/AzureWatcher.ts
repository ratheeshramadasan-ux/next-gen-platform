import { BlobServiceClient } from "@azure/storage-blob";
import { IntakeStorageService } from '../storage/IntakeStorageService';
import { SecretEncryption } from '../security/SecretEncryption';
import path from 'path';

export async function startAzureWatcher(connector: any) {
    const config = connector.configuration;
    
    // Decrypt connection string
    const connectionString = SecretEncryption.decrypt(config.connectionString);

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(config.container);

    console.log(`[AzureWatcher] Polling container ${config.container} for ${connector.name}...`);

    for await (const blob of containerClient.listBlobsFlat({
        prefix: config.prefix || '',
    })) {
        try {
            const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
            const download = await blockBlobClient.download();

            const chunks: Buffer[] = [];
            for await (const chunk of download.readableStreamBody!) {
                chunks.push(chunk as Buffer);
            }
            const content = Buffer.concat(chunks);

            await IntakeStorageService.saveIncomingDocument({
                connectorId: connector.id,
                fileName: path.basename(blob.name),
                content,
                metadata: {
                    azureContainer: config.container,
                    azureBlobName: blob.name,
                    etag: blob.properties.etag,
                    contentLength: blob.properties.contentLength
                }
            });

            // Archive if configured
            if (config.archivePrefix) {
                const archiveName = blob.name.replace(config.prefix || '', config.archivePrefix);
                const archiveBlobClient = containerClient.getBlockBlobClient(archiveName);
                
                // Copy to archive
                await archiveBlobClient.beginCopyFromURL(blockBlobClient.url);
                
                // Delete original
                await blockBlobClient.delete();
                
                console.log(`[AzureWatcher] Archived blob ${blob.name} to ${archiveName}`);
            }
        } catch (error) {
            console.error(`[AzureWatcher] Error processing blob ${blob.name}:`, error);
        }
    }
}
