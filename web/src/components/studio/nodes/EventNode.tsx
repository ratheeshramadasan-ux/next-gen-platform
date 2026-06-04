"use client";

import React from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { UniversalActivity, DEFAULT_STUDIO_THEME } from '@/types/studio';
import { cn } from '@/lib/utils';
import { CirclePlay, CircleStop, CircleDot } from 'lucide-react';

export function EventNode(props: NodeProps<any>) {
  const data = props.data as any;
  const isStart = data.subType === 'start';
  const isEnd = data.subType === 'end';
  const isIntermediate = data.subType === 'intermediate';

  return (
    <BaseNode {...props} data={data} className="!bg-transparent !border-none !shadow-none min-w-0" hideHandles hideIcon>
      <div className="relative group/event w-12 h-12">
        <div className={cn(
          "absolute inset-0 rounded-full flex items-center justify-center transition-all duration-300",
          isStart && "bg-emerald-500/70 text-white dark:bg-emerald-600/70",
          isEnd && "bg-rose-500/70 text-white dark:bg-rose-600/70",
          isIntermediate && "bg-amber-500/70 text-white dark:bg-amber-600/70",
          props.selected && "ring-4 ring-primary/20 scale-110 shadow-xl"
        )}>
          {isStart && <CirclePlay size={24} />}
          {isEnd && <CircleStop size={24} />}
          {isIntermediate && <CircleDot size={20} />}
        </div>

        {/* Large invisible handles for "any point" connection */}
        <Handle 
          type="target" 
          position={Position.Top} 
          className="!w-full !h-full !top-0 !left-0 !bg-transparent !border-none !rounded-full opacity-0 pointer-events-none group-hover/event:pointer-events-auto" 
          style={{ transform: 'none' }}
        />
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="!w-full !h-full !top-0 !left-0 !bg-transparent !border-none !rounded-full opacity-0 pointer-events-none group-hover/event:pointer-events-auto" 
          style={{ transform: 'none' }}
        />
      </div>
    </BaseNode>
  );
}
