"use client";

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { UniversalActivity } from '@/types/studio';
import { User, Shield, Zap, Code, ShieldCheck, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function TaskNode(props: NodeProps<any>) {
  const data = props.data as any;

  return (
    <BaseNode {...props} data={data} />
  );
}

