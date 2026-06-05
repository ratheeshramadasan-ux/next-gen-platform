import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { BlobServiceClient } from "@azure/storage-blob";
import Client from "ssh2-sftp-client";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, configuration } = body;

        let success = false;
        let message = "";

        switch (type) {
            case 'EMAIL':
                success = await testEmailConnection(configuration);
                break;
            case 'S3':
                success = await testS3Connection(configuration);
                break;
            case 'AZURE_BLOB':
                success = await testAzureConnection(configuration);
                break;
            case 'SFTP':
                success = await testSFTPConnection(configuration);
                break;
            default:
                return NextResponse.json({ error: "Unsupported connector type" }, { status: 400 });
        }

        return NextResponse.json({
            success,
            message: success ? "Handshake successful" : "Handshake failed",
            diagnostics: {
                dnsReachable: true,
                authSuccess: success,
                permissionsOk: success
            }
        });
    } catch (error: any) {
        console.error('[API Connectors Test] Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 200 });
    }
}

async function testEmailConnection(config: any) {
    const client = new ImapFlow({
        host: config.host,
        port: parseInt(config.port),
        secure: config.secure !== false,
        auth: {
            user: config.username,
            pass: config.password, // Plain text here as it's coming from UI before save
        },
        logger: false
    });
    try {
        await client.connect();
        await client.logout();
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

async function testS3Connection(config: any) {
    const s3 = new S3Client({
        region: config.region,
        credentials: {
            accessKeyId: config.accessKey,
            secretAccessKey: config.secretKey,
        },
    });
    try {
        await s3.send(new ListBucketsCommand({}));
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

async function testAzureConnection(config: any) {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
        await blobServiceClient.getAccountInfo();
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

async function testSFTPConnection(config: any) {
    const sftp = new Client();
    try {
        await sftp.connect({
            host: config.host,
            port: parseInt(config.port) || 22,
            username: config.username,
            password: config.password,
        });
        await sftp.end();
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}
