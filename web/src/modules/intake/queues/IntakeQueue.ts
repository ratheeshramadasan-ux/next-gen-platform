import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

export const redisConnection = new IORedis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null, // Required by BullMQ
});

export const intakeQueue = new Queue('document-intake', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export const startIntakeWorker = () => {
    // We'll import it dynamically to avoid circular dependencies if any
    const { startIntakeWorker: start } = require('../workers/IntakeWorker');
    return start();
};

console.log(`[IntakeQueue] Initialized queue on redis://${REDIS_HOST}:${REDIS_PORT}`);
