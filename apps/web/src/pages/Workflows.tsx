import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, GitBranch, Play, Pause, Archive, Trash2, MoreVertical,
  ChevronRight, Filter, Clock, Zap, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../lib/api';
import { Button, Card, StatusBadge, Badge, EmptyState, Spinner, Input } from '../components/ui';
import type { Workflow } from '../types/workflow';
import toast from 'react-hot-toast';

type StatusFilter = 'ALL' | 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'ARCHIVED';

const STATUS_FILTERS: StatusFilter[] = ['ALL', 'ACTIVE', 'DRAFT', 'PAUSED', 'ARCHIVED'];

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [total, setTotal] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('pageSize', '50');

      const { data } = await api.get<{ data: { workflows: Workflow[]; total: number } }>(
        `/workflows?${params.toString()}`
      );
      setWorkflows(data.data.workflows);
      setTotal(data.data.total);
    } catch {
      // Mock data for demo
      setWorkflows([
        {
          id: 'wf-1', name: 'Data Sync Pipeline', description: 'Sync customer data from CRM to warehouse',
          tags: ['data', 'sync'], workspaceId: 'ws-1', status: 'ACTIVE', isActive: true, version: 3,
          definition: { nodes: [{ id: 'n1', type: 'http_request', label: 'Fetch CRM', position: { x: 0, y: 0 }, config: {} }], edges: [] },
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          _count: { executions: 142 },
        },
        {
          id: 'wf-2', name: 'AI Report Generator', description: 'Generate weekly reports using NVIDIA AI',
          tags: ['ai', 'reports'], workspaceId: 'ws-1', status: 'ACTIVE', isActive: true, version: 1,
          definition: { nodes: [{ id: 'n1', type: 'ai_agent', label: 'Generate Report', position: { x: 0, y: 0 }, config: {} }], edges: [] },
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 7200000).toISOString(),
          _count: { executions: 28 },
        },
        {
          id: 'wf-3', name: 'Webhook Processor', description: 'Process incoming webhooks and route events',
          tags: ['webhooks', 'routing'], workspaceId: 'ws-1', status: 'DRAFT', isActive: false, version: 2,
          definition: { nodes: [{ id: 'n1', type: 'condition', label: 'Route Event', position: { x: 0, y: 0 }, config: {} }], edges: [] },
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 1800000).toISOString(),
          _count: { executions: 0 },
        },
      ] as Workflow[]);
      setTotal(3);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchWorkflows, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchWorkflows, search]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setActioning(id);
    try {
      await api.delete(`/workflows/${id}`);
      setWorkflows((p) => p.filter((w) => w.id !== id));
      toast.success('Workflow deleted');
    } catch {
      toast.error('Failed to delete workflow');
    } finally {
      setActioning(null);
    }
  };

  const handleActivate = async (id: string) => {
    setActioning(id);
    try {
      const { data } = await api.post<{ data: Workflow }>(`/workflows/${id}/activate`);
      setWorkflows((p) => p.map((w) => (w.id === id ? data.data : w)));
      toast.success('Workflow activated');
    } catch {
      toast.error('Failed to activate');
    } finally {
      setActioning(null);
      setOpenMenu(null);
    }
  };

  const handleExecute = async (id: string) => {
    setActioning(id);
    try {
      const { data } = await api.post<{ data: { id: string } }>(`/workflows/${id}/execute`, {});
      toast.success('Execution started!');
      navigate(`/executions/${data.data.id}`);
    } catch {
      toast.error('Failed to start execution');
    } finally {
      setActioning(null);
    }
  };

  const nodeTypeSummary = (wf: Workflow) => {
    const types = [...new Set(wf.definition.nodes.map((n) => n.type))];
    return types.slice(0, 3);
  };

  const typeColors: Record<string, string> = {
    http_request: 'primary', ai_agent: 'success', condition: 'danger',
    transform: 'accent', delay: 'warning', log: 'default',
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/90">Workflows</h1>
          <p className="text-sm text-white/35 mt-1">{total} total workflows</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchWorkflows} icon={<RefreshCw className="w-4 h-4" />} size="sm">
            Refresh
          </Button>
          <Button onClick={() => navigate('/workflows/new')} icon={<Plus className="w-4 h-4" />}>
            New Workflow
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows…"
            className="w-full h-10 pl-9 pr-4 rounded-xl text-sm glass border border-white/8 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50"
          />
        </div>
        <div className="flex gap-1.5 p-1 rounded-xl glass border border-white/8">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f
                  ? 'bg-primary/20 text-primary-light'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : workflows.length === 0 ? (
        <EmptyState
          icon={<GitBranch className="w-8 h-8" />}
          title="No workflows yet"
          description="Create your first AI-powered workflow to get started"
          action={
            <Button onClick={() => navigate('/workflows/new')} icon={<Plus className="w-4 h-4" />}>
              Create Workflow
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {workflows.map((wf, i) => (
              <motion.div
                key={wf.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card
                  className="group flex flex-col gap-4 cursor-pointer hover:border-white/15 transition-all"
                  onClick={() => navigate(`/workflows/${wf.id}`)}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={wf.status} />
                        <span className="text-xs text-white/25">v{wf.version}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white/85 group-hover:text-white truncate">
                        {wf.name}
                      </h3>
                      {wf.description && (
                        <p className="text-xs text-white/35 mt-1 line-clamp-2">{wf.description}</p>
                      )}
                    </div>

                    {/* Menu */}
                    <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenu(openMenu === wf.id ? null : wf.id)}
                        className="w-7 h-7 rounded-lg glass flex items-center justify-center text-white/30 hover:text-white/70 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {openMenu === wf.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -4 }}
                            className="absolute right-0 top-8 w-44 glass-elevated rounded-xl border border-white/10 shadow-elevated z-20 overflow-hidden"
                          >
                            {[
                              { label: 'Open Editor', icon: ChevronRight, action: () => navigate(`/workflows/${wf.id}`) },
                              { label: 'Run Now', icon: Play, action: () => handleExecute(wf.id) },
                              { label: 'Activate', icon: Zap, action: () => handleActivate(wf.id) },
                              { label: 'Delete', icon: Trash2, action: () => handleDelete(wf.id, wf.name), danger: true },
                            ].map(({ label, icon: Icon, action, danger }) => (
                              <button
                                key={label}
                                onClick={() => { action(); setOpenMenu(null); }}
                                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                                  danger ? 'text-danger/70 hover:bg-danger/8 hover:text-danger' : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Node type chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {nodeTypeSummary(wf).map((t) => (
                      <Badge key={t} variant={(typeColors[t] as 'default') ?? 'default'} className="text-xs">
                        {t.replace('_', ' ')}
                      </Badge>
                    ))}
                    {wf.definition.nodes.length > 3 && (
                      <Badge variant="default">+{wf.definition.nodes.length - 3} more</Badge>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3 text-xs text-white/30">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {wf._count?.executions ?? 0} runs
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(wf.updatedAt), { addSuffix: true })}
                      </span>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleExecute(wf.id); }}
                      disabled={actioning === wf.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary-light text-xs font-medium opacity-0 group-hover:opacity-100 transition-all border border-primary/20"
                    >
                      <Play className="w-3 h-3" /> Run
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
