from fastapi import FastAPI, Depends, HTTPException
import os
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import logging

app = FastAPI(title="NextGen Control Plane")

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")

# Async DB setup
engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with async_session() as session:
        yield session

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/job/create")
async def create(job: dict, db: AsyncSession = Depends(get_db)):
    # 1. Get default queue for tenant (simplified)
    # 2. Insert into execution.queue_items
    result = await db.execute(
        text("""
            INSERT INTO execution.queue_items (payload, status)
            VALUES (:payload, 'NEW')
            RETURNING queue_item_id
        """),
        {"payload": json.dumps(job)}
    )
    queue_item_id = result.scalar()
    
    # 3. Create a Job entry
    job_result = await db.execute(
        text("""
            INSERT INTO execution.jobs (queue_item_id, status)
            VALUES (:qi_id, 'QUEUED')
            RETURNING job_id
        """),
        {"qi_id": queue_item_id}
    )
    job_id = job_result.scalar()
    
    await db.commit()
    return {"job_id": str(job_id), "queue_item_id": str(queue_item_id)}

@app.get("/job/next")
async def next_job(db: AsyncSession = Depends(get_db)):
    # 1. Fetch next queue item via stored procedure
    # Note: For simplicity we assume a global queue or first found
    q_result = await db.execute(text("SELECT queue_id FROM execution.queues LIMIT 1"))
    queue_id = q_result.scalar()
    
    if not queue_id:
        # Fallback if no queue defined: find any NEW item
        result = await db.execute(
            text("""
                UPDATE execution.queue_items 
                SET status = 'IN_PROGRESS', locked_at = now()
                WHERE queue_item_id = (
                    SELECT queue_item_id FROM execution.queue_items 
                    WHERE status = 'NEW' 
                    ORDER BY priority DESC, created_at ASC 
                    LIMIT 1 FOR UPDATE SKIP LOCKED
                )
                RETURNING queue_item_id, payload
            """)
        )
    else:
        result = await db.execute(
            text("SELECT * FROM execution.get_next_queue_item(:q_id)"),
            {"q_id": queue_id}
        )
    
    row = result.fetchone()
    if not row:
        return {"job": None}

    # 2. Assign to a Job (update status)
    job_id_result = await db.execute(
        text("UPDATE execution.jobs SET status = 'RUNNING', started_at = now() WHERE queue_item_id = :qi_id RETURNING job_id"),
        {"qi_id": row.queue_item_id}
    )
    job_id = job_id_result.scalar()
    
    await db.commit()

    return {
        "job": {
            "id": str(job_id),
            "queue_item_id": str(row.queue_item_id),
            "payload": row.payload
        }
    }

@app.post("/job/complete/{job_id}")
async def complete(job_id: str, db: AsyncSession = Depends(get_db)):
    # 1. Update job status
    result = await db.execute(
        text("UPDATE execution.jobs SET status = 'COMPLETED', ended_at = now() WHERE job_id = :job_id RETURNING queue_item_id"),
        {"job_id": job_id}
    )
    qi_id = result.scalar()
    
    if qi_id:
        # 2. Update queue item status
        await db.execute(
            text("UPDATE execution.queue_items SET status = 'COMPLETED' WHERE queue_item_id = :qi_id"),
            {"qi_id": qi_id}
        )
    
    await db.commit()
    return {"status": "completed", "job_id": job_id}

@app.post("/job/fail/{job_id}")
async def fail(job_id: str, error_detail: dict, db: AsyncSession = Depends(get_db)):
    # 1. Update job status to FAILED
    result = await db.execute(
        text("UPDATE execution.jobs SET status = 'FAILED', ended_at = now() WHERE job_id = :job_id RETURNING queue_item_id"),
        {"job_id": job_id}
    )
    qi_id = result.scalar()
    
    if qi_id:
        # 2. Update queue item status to FAILED
        await db.execute(
            text("UPDATE execution.queue_items SET status = 'FAILED' WHERE queue_item_id = :qi_id"),
            {"qi_id": qi_id}
        )
    
    await db.commit()
    return {"status": "failed", "job_id": job_id, "detail": error_detail}
