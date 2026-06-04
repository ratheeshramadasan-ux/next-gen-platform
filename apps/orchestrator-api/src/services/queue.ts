import Redis from "ioredis";
import { type QueuedJob } from "@rpa/shared-contracts";

const queueName = process.env.JOB_QUEUE_NAME ?? "job_queue";

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    })
  : null;

export async function enqueueJobs(jobs: QueuedJob[]) {
  if (!redis) {
    console.warn("REDIS_URL is not configured. Queue writes are being skipped.");
    return;
  }

  await redis.connect().catch(() => undefined);

  for (const job of jobs) {
    await redis.lpush(queueName, JSON.stringify(job));
  }
}

