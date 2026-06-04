"use client";

import React from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { UniversalActivity, DEFAULT_STUDIO_THEME } from '@/types/studio';
import { cn } from '@/lib/utils';
import { X, Plus, Circle, Clock } from 'lucide-react';

export function GatewayNode(props: NodeProps<any>) {
  const data = props.data as any;
  const subType = data.subType;

  return (
    <BaseNode {...props} data={data} className="!bg-transparent !border-none !shadow-none min-w-0" hideHandles hideIcon>
      <div className="relative group/gateway w-12 h-12">
        <div className={cn(
          "absolute inset-0 rounded-full flex items-center justify-center transition-all duration-300 border-2 bg-amber-500/10 backdrop-blur-sm shadow-lg",
          props.selected ? "border-amber-500 ring-4 ring-amber-500/10 scale-110 shadow-xl" : "border-amber-500/30"
        )}>
          {subType === 'xorGateway' && <X size={24} strokeWidth={3} className="text-amber-500" />}
          {subType === 'andGateway' && <Plus size={24} strokeWidth={3} className="text-amber-500" />}
          {subType === 'orGateway' && <Circle size={18} strokeWidth={4} className="text-amber-500" />}
          {subType === 'eventGateway' && <Clock size={18} strokeWidth={3} className="text-amber-500" />}
        </div>


        {/* Large invisible handles for "connect at any point" feel */}
        <Handle 
          type="target" 
          position={Position.Top} 
          className="!w-full !h-full !top-0 !left-0 !bg-transparent !border-none !rounded-full opacity-0 pointer-events-none group-hover/gateway:pointer-events-auto" 
          style={{ transform: 'none' }}
        />
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="!w-full !h-full !top-0 !left-0 !bg-transparent !border-none !rounded-full opacity-0 pointer-events-none group-hover/gateway:pointer-events-auto" 
          style={{ transform: 'none' }}
        />
      </div>
    </BaseNode>
  );
}
