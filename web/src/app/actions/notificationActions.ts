"use server";

import { prisma } from "@/lib/prisma";

export type NotificationType = "KERNEL" | "BILLING" | "SECURITY" | "ALERT";
export type StatusLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface SystemNotification {
  id: string;
  type: NotificationType;
  level: StatusLevel;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  path?: string;
}

export interface SidebarSignal {
  path: string;
  level: StatusLevel;
  count?: number;
  anomalies?: string[];
}

/**
 * Fetches recent system notifications for the active tenant.
 */
export async function getSystemNotifications(tenantId: string): Promise<SystemNotification[]> {
  try {
    // In a real system, these would be in a Notifications table.
    // For now, we synthesize from Metrics and Audit Logs.
    
    const metrics = await (prisma as any).metric.findMany({
      where: { tenantId, status: { in: ["CRITICAL", "WARNING"] } },
      orderBy: { timestamp: 'desc' },
      take: 5
    });

    const notifications: SystemNotification[] = metrics.map((m: any) => ({
      id: m.id,
      type: "KERNEL",
      level: m.status === "CRITICAL" ? "ERROR" : "WARNING",
      title: `${m.name} Threshold Breach`,
      message: `System ${m.name} reported ${m.value}% - exceeding safety bounds.`,
      timestamp: m.timestamp.toISOString(),
      isRead: false,
      path: "/monitoring/alerts"
    }));

    // Add some generic platform notifications
    notifications.push({
      id: "ntf-1",
      type: "BILLING",
      level: "INFO",
      title: "Consolidated Billing Report",
      message: "The monthly ELAK compute utilization report is ready for review.",
      timestamp: new Date().toISOString(),
      isRead: false,
      path: "/billing"
    });

    return notifications;
  } catch (e) {
    console.error("Failed to fetch notifications:", e);
    return [];
  }
}

/**
 * Calculates current sidebar signals based on active platform faults.
 */
export async function getSidebarSignals(tenantId: string): Promise<SidebarSignal[]> {
  try {
    const criticalMetrics = await (prisma as any).metric.findMany({
      where: { tenantId, status: "CRITICAL" },
      select: { name: true },
      take: 3
    });

    const signals: SidebarSignal[] = [];

    if (criticalMetrics.length > 0) {
      signals.push({ 
        path: "/monitoring", 
        level: "ERROR", 
        count: criticalMetrics.length,
        anomalies: criticalMetrics.map(m => m.name)
      });
    }

    const failedRunsCount = await (prisma as any).workflowExecution.count({
      where: { tenantId, status: "FAILED" }
    });

    if (failedRunsCount > 0) {
      signals.push({ 
        path: "/runs", 
        level: "WARNING", 
        count: failedRuns.length,
        anomalies: failedRuns.map(r => r.workflow.name)
      });
    }

    return signals;
  } catch (e) {
    console.error("Signal generation failure:", e);
    return [];
  }
}
