import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import {
  Globe, Code2, Timer, GitBranch, Sparkles, FileText, Merge, Split, Play, Trash2
} from 'lucide-react';
import { cn } from '../ui';
import type { WorkflowNode } from '../../types/workflow';

const NODE_TYPE_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  label: string;
}> = {
  http_request:  { icon: Globe,     color: 'text-[#38bdf8]', bgColor: 'bg-[#38bdf8]', label: 'HTTP' },
  transform:     { icon: Code2,     color: 'text-[#a78bfa]', bgColor: 'bg-[#a78bfa]', label: 'Transform' },
  delay:         { icon: Timer,     color: 'text-[#fbbf24]', bgColor: 'bg-[#fbbf24]', label: 'Delay' },
  condition:     { icon: GitBranch, color: 'text-[#fb923c]', bgColor: 'bg-[#fb923c]', label: 'Condition' },
  ai_agent:      { icon: Sparkles,  color: 'text-success', bgColor: 'bg-success', label: 'AI Agent' },
  log:           { icon: FileText,  color: 'text-[#94a3b8]', bgColor: 'bg-[#94a3b8]', label: 'Log' },
  merge:         { icon: Merge,     color: 'text-[#fb923c]', bgColor: 'bg-[#fb923c]', label: 'Merge' },
  split:         { icon: Split,     color: 'text-primary-light', bgColor: 'bg-primary-light', label: 'Split' },
};

interface FlowNodeData extends WorkflowNode {
  onDelete?: (id: string) => void;
  executionStatus?: 'idle' | 'running' | 'succeeded' | 'failed' | 'skipped';
}

export const FlowNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as FlowNodeData;
  const config = NODE_TYPE_CONFIG[nodeData.type] ?? NODE_TYPE_CONFIG.log;
  const Icon = config.icon;
  const [hovered, setHovered] = useState(false);

  const statusRing: Record<string, string> = {
    running: 'ring-2 ring-accent ring-offset-0 animate-pulse',
    succeeded: 'ring-2 ring-success ring-offset-0',
    failed: 'ring-2 ring-danger ring-offset-0',
  };

  const statusDot: Record<string, string> = {
    running: 'bg-accent animate-pulse-glow',
    succeeded: 'bg-success',
    failed: 'bg-danger',
    idle: 'bg-white/20',
  };

  const execStatus = nodeData.executionStatus ?? 'idle';

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative w-[220px] overflow-visible rounded-[10px] border bg-surface-1 transition-all duration-200 cursor-pointer',
        execStatus in statusRing && statusRing[execStatus]
      )}
      style={{
        borderColor: selected ? '#6366f1' : hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)',
        boxShadow: selected
          ? '0 0 0 3px rgba(99,102,241,0.18)'
          : hovered
          ? '0 4px 24px rgba(0,0,0,0.3)'
          : '0 2px 12px rgba(0,0,0,0.2)',
      }}
    >
      <div className={cn('absolute inset-x-0 top-0 h-[3px] rounded-t-[10px]', config.bgColor)} />
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !-left-1.5 !border-2"
        style={{ borderColor: 'rgba(255,255,255,0.14)', background: '#1A1E2C' }}
      />

      {/* Node content */}
      <div className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', config.bgColor, 'bg-opacity-20')}>
            <Icon className={cn('w-4 h-4', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-white/80 truncate">{nodeData.label}</p>
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  statusDot[execStatus] ?? statusDot.idle
                )}
              />
            </div>
            <p className={cn('font-mono text-[11px] mt-0.5', config.color, 'opacity-80')}>{config.label}</p>
          </div>
        </div>

        {/* Config preview */}
        {nodeData.type === 'http_request' && nodeData.config.url && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-white/4 border border-white/5">
            <p className="text-xs text-white/40 truncate font-mono">{nodeData.config.method} {nodeData.config.url}</p>
          </div>
        )}

        {nodeData.type === 'delay' && nodeData.config.delayMs && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-white/4 border border-white/5">
            <p className="text-xs text-white/40">{nodeData.config.delayMs}ms delay</p>
          </div>
        )}

        {nodeData.type === 'ai_agent' && nodeData.config.prompt && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-white/4 border border-white/5">
            <p className="text-xs text-white/40 truncate">{String(nodeData.config.prompt).slice(0, 50)}…</p>
          </div>
        )}

        {nodeData.type === 'condition' && nodeData.config.condition && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-white/4 border border-white/5 font-mono">
            <p className="text-xs text-white/40 truncate">{String(nodeData.config.condition).slice(0, 50)}</p>
          </div>
        )}
      </div>

      {/* Delete button (on hover) */}
      {hovered && nodeData.onDelete && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => nodeData.onDelete?.(id)}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-danger/80 hover:bg-danger flex items-center justify-center shadow-lg border border-danger/50"
        >
          <Trash2 className="w-3 h-3 text-white" />
        </motion.button>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !-right-1.5 !border-2"
        style={{ borderColor: 'rgba(255,255,255,0.3)', background: '#6366f1' }}
      />

      {/* True/False handles for condition nodes */}
      {nodeData.type === 'condition' && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !border-2"
            style={{ borderColor: '#10d9a8', background: '#10d9a8', bottom: -6 }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !border-2"
            style={{ borderColor: '#f05252', background: '#f05252', bottom: -6, left: '70%' }}
          />
        </>
      )}
    </motion.div>
  );
});

FlowNode.displayName = 'FlowNode';
