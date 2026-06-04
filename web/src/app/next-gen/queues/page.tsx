"use client";

import React from "react";
import { QueueManager } from "@/components/studio/queue/QueueManager";

export default function QueuesDashboardPage() {
  return (
    <div className="w-full h-full">
      <QueueManager mode="reporting" />
    </div>
  );
}
