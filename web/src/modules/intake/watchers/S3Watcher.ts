import { S3Client, ListObjectsV2Command, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { IntakeStorageService } from '../storage/IntakeStorageService';
import { SecretEncryption } from '../security/SecretEncryption';

export async function startS3Watcher(connector: any) {
    const config = connector.configuration;
    
    // Decrypt credentials
    const accessKey = SecretEncryption.decrypt(config.accessKey);
    const secretKey = SecretEncryption.decrypt(config.secretKey);

    const s3 = new S3Client({
        region: config.region,
        credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
        },
    });

    console.log(`[S3Watcher] Polling bucket ${config.bucket} for ${connector.name}...`);

    const objects = await s3.send(
        new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: config.prefix || '',
        })
    );

    for (const item of objects.Contents || []) {
        if (!item.Key || item.Key.endsWith('/')) continue; // Skip folders

        try {
            const file = await s3.send(
                new GetObjectCommand({
                    Bucket: config.bucket,
                    Key: item.Key,
                })
            );

            const stream = await file.Body?.transformToByteArray();
            if (!stream) continue;

            await IntakeStorageService.saveIncomingDocument({
                connectorId: connector.id,
                fileName: path.basename(item.Key),
                content: Buffer.from(stream),
                metadata: {
                    s3Bucket: config.bucket,
                    s3Key: item.Key,
                    etag: item.ETag,
                    size: item.Size
                }
            });

            // Archive file if configured
            if (config.archivePrefix) {
                const archiveKey = item.Key.replace(config.prefix || '', config.archivePrefix);
                
                // Copy to archive
                await s3.send(new CopyObjectCommand({
                    Bucket: config.bucket,
                    CopySource: `${config.bucket}/${item.Key}`,
                    Key: archiveKey
                }));

                // Delete original
                await s3.send(new DeleteObjectCommand({
                    Bucket: config.bucket,
                    Key: item.Key
                }));
                
                console.log(`[S3Watcher] Archived ${item.Key} to ${archiveKey}`);
            }
        } catch (error) {
            console.error(`[S3Watcher] Error processing object ${item.Key}:`, error);
        }
    }
}

import path from 'path';
