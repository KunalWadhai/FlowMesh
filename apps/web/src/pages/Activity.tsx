import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Clock, CheckCircle, XCircle, Loader2,
  ChevronDown, ChevronRight, GitBranch, RefreshCw, Zap
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import api from '../lib/api';
import { StatusBadge, Button, Spinner } from '../components/ui';
import type { Execution, StepLog } from '../types/workflow';

interface ExecutionWithLogs extends Execution {
  expanded?: boolean;
  stepLogs?: StepLog[];
}

export default function ActivityPage() {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<ExecutionWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState<Record<string, boolean>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: ExecutionWithLogs[] }>('/activity?limit=30');
      setExecutions((prev) => {
        const prevIds = new Set(prev.map((e) => e.id));
        const incoming = data.data;
        return incoming.map((exec) => ({
          ...exec,
          expanded: prevIds.has(exec.id) ? prev.find((p) => p.id === exec.id)?.expanded : false,
          stepLogs: prev.find((p) => p.id === exec.id)?.stepLogs,
        }));
      });
    } catch {
      // Mock data
      setExecutions([
        {
          id: 'ex-1', workflowId: 'wf-1', status: 'SUCCEEDED', trigger: 'MANUAL',
          durationMs: 3240, createdAt: new Date(Date.now() - 120000).toISOString(),
          startedAt: new Date(Date.now() - 125000).toISOString(),
          completedAt: new Date(Date.now() - 122000).toISOString(),
          workflow: { id: 'wf-1', name: 'Data Sync Pipeline' },
        },
        {
          id: 'ex-2', workflowId: 'wf-2', status: 'RUNNING', trigger: 'SCHEDULED',
          createdAt: new Date(Date.now() - 30000).toISOString(),
          startedAt: new Date(Date.now() - 28000).toISOString(),
          workflow: { id: 'wf-2', name: 'AI Report Generator' },
        },
        {
          id: 'ex-3', workflowId: 'wf-1', status: 'FAILED', trigger: 'MANUAL',
          error: 'HTTP 429: Rate limit exceeded', durationMs: 1240,
          createdAt: new Date(Date.now() - 600000).toISOString(),
          workflow: { id: 'wf-1', name: 'Data Sync Pipeline' },
        },
        {
          id: 'ex-4', workflowId: 'wf-3', status: 'SUCCEEDED', trigger: 'API',
          durationMs: 890, createdAt: new Date(Date.now() - 3600000).toISOString(),
          workflow: { id: 'wf-3', name: 'Webhook Processor' },
        },
      ] as ExecutionWithLogs[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchActivity, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchActivity]);

  const toggleExpand = async (exec: ExecutionWithLogs) => {
    const isExpanding = !exec.expanded;

    setExecutions((prev) =>
      prev.map((e) => (e.id === exec.id ? { ...e, expanded: isExpanding } : e))
    );

    if (isExpanding && !exec.stepLogs) {
      setLoadingLogs((p) => ({ ...p, [exec.id]: true }));
      try {
        const { data } = await api.get<{ data: ExecutionWithLogs }>(`/executions/${exec.id}`);
        setExecutions((prev) =>
          prev.map((e) => (e.id === exec.id ? { ...e, stepLogs: data.data.stepLogs } : e))
        );
      } catch {
        // ignore
      } finally {
        setLoadingLogs((p) => ({ ...p, [exec.id]: false }));
      }
    }
  };

  const triggerColor: Record<string, string> = {
    MANUAL: 'text-white/40', SCHEDULED: 'text-accent/70', API: 'text-primary-light/70', WEBHOOK: 'text-success/70',
  };

  const stepStatusDot: Record<string, string> = {
    SUCCEEDED: 'bg-success', FAILED: 'bg-danger', RUNNING: 'bg-accent animate-pulse', QUEUED: 'bg-white/20', SKIPPED: 'bg-white/10',
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/90 flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-primary" /> Activity
          </h1>
          <p className="text-sm text-white/35 mt-1">Real-time execution feed</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all glass border ${
              autoRefresh ? 'border-success/30 text-success' : 'border-white/8 text-white/40'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-success animate-pulse' : 'bg-white/20'}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <Button variant="secondary" size="sm" onClick={fetchActivity} icon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Execution list */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {executions.map((exec, i) => (
              <motion.div
                key={exec.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className="glass-card overflow-hidden"
              >
                {/* Main row */}
                <button
                  onClick={() => toggleExpand(exec)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/3 transition-colors text-left"
                >
                  <span className={`status-dot ${exec.status} flex-shrink-0`} />

                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-white/80 truncate">
                          {exec.workflow?.name ?? exec.workflowId}
                        </span>
                        <StatusBadge status={exec.status} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/30">
                        <span className={triggerColor[exec.trigger] ?? 'text-white/40'}>
                          {exec.trigger.toLowerCase()}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(exec.createdAt), { addSuffix: true })}
                        </span>
                        {exec.durationMs && (
                          <>
                            <span>·</span>
                            <span>{(exec.durationMs / 1000).toFixed(2)}s</span>
                          </>
                        )}
                        {exec.error && (
                          <>
                            <span>·</span>
                            <span className="text-danger/70 truncate max-w-xs">{exec.error}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <code className="text-xs text-white/20 font-mono hidden sm:block">{exec.id.slice(0, 12)}…</code>
                      {loadingLogs[exec.id]
                        ? <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                        : exec.expanded
                        ? <ChevronDown className="w-4 h-4 text-white/30" />
                        : <ChevronRight className="w-4 h-4 text-white/30" />
                      }
                    </div>
                  </div>
                </button>

                {/* Expanded step logs */}
                <AnimatePresence>
                  {exec.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-white/5 px-4 py-4">
                        {/* Step timeline */}
                        {exec.stepLogs && exec.stepLogs.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs text-white/35 font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <Zap className="w-3 h-3" /> Step Timeline
                            </p>
                            {exec.stepLogs.map((step, si) => (
                              <div key={step.id} className="flex gap-3">
                                {/* Timeline line */}
                                <div className="flex flex-col items-center">
                                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${stepStatusDot[step.status] ?? 'bg-white/20'}`} />
                                  {si < exec.stepLogs!.length - 1 && (
                                    <div className="w-px flex-1 bg-white/8 mt-1" />
                                  )}
                                </div>

                                <div className="flex-1 pb-3 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-white/75 font-medium truncate">{step.nodeName}</span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs text-white/30 font-mono">{step.nodeType}</span>
                                      {step.durationMs && (
                                        <span className="text-xs text-white/25">{step.durationMs}ms</span>
                                      )}
                                    </div>
                                  </div>

                                  {step.error && (
                                    <p className="text-xs text-danger/80 mt-1 font-mono">{step.error}</p>
                                  )}

                                  {step.logs && step.logs.length > 0 && (
                                    <div className="mt-2 rounded-lg bg-black/20 border border-white/5 p-2 space-y-0.5">
                                      {step.logs.map((log, li) => (
                                        <p key={li} className="text-xs text-white/35 font-mono">{log}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : loadingLogs[exec.id] ? (
                          <div className="flex items-center gap-2 py-4 text-white/30 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading step logs…
                          </div>
                        ) : (
                          <div className="py-4 text-center text-white/25 text-sm">No step logs found</div>
                        )}

                        {/* View full details */}
                        <button
                          onClick={() => navigate(`/executions/${exec.id}`)}
                          className="mt-3 text-xs text-primary-light hover:text-accent flex items-center gap-1 transition-colors"
                        >
                          View full execution <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          {executions.length === 0 && (
            <div className="py-20 text-center text-white/25 text-sm">
              No executions yet. Run a workflow to see activity here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
