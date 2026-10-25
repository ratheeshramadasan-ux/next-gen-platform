import type { Request, Response, NextFunction } from "express";
import { prisma } from "./prisma.js";
import { randomUUID } from "crypto";

export async function governanceInterceptor(req: Request, res: Response, next: NextFunction) {
  // Only intercept state-mutating requests (POST, PUT, PATCH, DELETE)
  if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
    return next();
  }

  // Generate observability IDs
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  const causationId = (req.headers['x-causation-id'] as string) || randomUUID();
  
  // Attach to request for downstream usage
  req.headers['x-correlation-id'] = correlationId;
  req.headers['x-causation-id'] = causationId;

  // Simple placeholder for governance policy evaluation
  // In a real implementation, this would evaluate policies based on epoch, tenant, user, etc.
  const isGovernanceLocked = false; // Example condition

  if (isGovernanceLocked) {
    const executionId = req.body?.executionId || req.params?.executionId;
    
    if (executionId) {
      try {
        await prisma.executionEvent.create({
          data: {
            executionId,
            eventType: "GovernanceDenied",
            payload: {
              method: req.method,
              url: req.originalUrl,
              reason: "Blocked by active governance policy."
            },
            correlationId,
            causationId,
            rootExecutionId: req.body?.rootExecutionId || null,
          }
        });
      } catch (err) {
        console.error("Failed to append GovernanceDenied event", err);
      }
    }

    return res.status(403).json({
      status: "GOVERNANCE_DENIED",
      message: "Action blocked by governance policies.",
      correlationId,
    });
  }

  // Proceed if allowed
  next();
}
