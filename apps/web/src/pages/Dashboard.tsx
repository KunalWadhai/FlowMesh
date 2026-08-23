import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GitBranch, Zap, CheckCircle, XCircle, Clock, TrendingUp, Plus, ArrowRight, Activity
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { Button, Card, StatusBadge, Spinner } from '../components/ui';

interface Stats {
  totalWorkflows: number;
  byStatus: Record<string, number>;
  successRate: number;
  recentExecutions: Array<{
    id: string;
    status: string;
    durationMs: number;
    createdAt: string;
    workflow: { name: string };
  }>;
}

interface Metrics {
  byStatus: Record<string, number>;
  avgDurationMs: number;
  topWorkflows: Array<{ workflowId: string; _count: number }>;
}

const CHART_DATA = [
  { day: 'Mon', success: 12, failed: 1 },
  { day: 'Tue', success: 18, failed: 3 },
  { day: 'Wed', success: 24, failed: 2 },
  { day: 'Thu', success: 15, failed: 0 },
  { day: 'Fri', success: 31, failed: 4 },
  { day: 'Sat', success: 8, failed: 1 },
  { day: 'Sun', success: 22, failed: 2 },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user, workspace } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ data: Stats }>('/workflows/stats'),
      api.get<{ data: Metrics }>('/executions/metrics'),
    ])
      .then(([statsRes, metricsRes]) => {
        setStats(statsRes.data.data);
        setMetrics(metricsRes.data.data);
      })
      .catch(() => {
        // Use mock data in case API isn't running
        setStats({
          totalWorkflows: 12,
          byStatus: { ACTIVE: 8, DRAFT: 3, PAUSED: 1 },
          successRate: 94,
          recentExecutions: [],
        });
        setMetrics({ byStatus: { SUCCEEDED: 142, FAILED: 9, RUNNING: 2 }, avgDurationMs: 3200, topWorkflows: [] });
      })
      .finally(() => setLoading(false));
  }, []);

  const totalExecs = Object.values(metrics?.byStatus ?? {}).reduce((a, b) => a + b, 0);

  const statCards = [
    {
      label: 'Total Workflows',
      value: stats?.totalWorkflows ?? 0,
      icon: <GitBranch className="w-5 h-5" />,
      color: 'text-primary-light',
      bg: 'bg-primary/10',
    },
    {
      label: 'Total Executions',
      value: totalExecs,
      icon: <Zap className="w-5 h-5" />,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Success Rate',
      value: `${metrics ? Math.round(((metrics.byStatus.SUCCEEDED ?? 0) / Math.max(totalExecs, 1)) * 100) : 0}%`,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Avg Duration',
      value: metrics ? `${(metrics.avgDurationMs / 1000).toFixed(1)}s` : '—',
      icon: <Clock className="w-5 h-5" />,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/90">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-white/35 mt-1">{workspace?.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <Button onClick={() => navigate('/workflows/new')} icon={<Plus className="w-4 h-4" />}>
          New Workflow
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.label} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }}>
            <Card className="flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-white/90">{card.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{card.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Executions chart */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.25 }} className="lg:col-span-2">
          <Card className="h-72">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-white/80">Execution History</h3>
                <p className="text-xs text-white/35 mt-0.5">Last 7 days</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> Success</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" /> Failed</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={CHART_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5a0" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4d6d" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'rgba(16,16,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                  itemStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  labelStyle={{ color: 'white', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="success" stroke="#00e5a0" strokeWidth={2} fill="url(#gSuccess)" />
                <Area type="monotone" dataKey="failed" stroke="#ff4d6d" strokeWidth={2} fill="url(#gFailed)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Status breakdown */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.3 }}>
          <Card className="h-72 flex flex-col">
            <h3 className="text-sm font-semibold text-white/80 mb-4">Execution Status</h3>
            <div className="flex-1 space-y-3">
              {Object.entries(metrics?.byStatus ?? {}).map(([status, count]) => {
                const pct = Math.round((count / Math.max(totalExecs, 1)) * 100);
                const colors: Record<string, string> = {
                  SUCCEEDED: 'bg-success',
                  FAILED: 'bg-danger',
                  RUNNING: 'bg-accent',
                  QUEUED: 'bg-white/20',
                  CANCELLED: 'bg-white/10',
                };

                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/50 capitalize">{status.toLowerCase()}</span>
                      <span className="text-white/70 font-medium">{count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className={`h-full rounded-full ${colors[status] ?? 'bg-primary'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-white/5 mt-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/35">Active workflows</span>
                <span className="text-sm font-semibold text-success">{stats?.byStatus?.ACTIVE ?? 0}</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.35 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4" /> Recent Activity
          </h2>
          <button onClick={() => navigate('/activity')} className="text-xs text-primary-light hover:text-accent flex items-center gap-1 transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <Card className="divide-y divide-white/4">
          {stats?.recentExecutions?.length === 0 ? (
            <div className="py-10 text-center text-white/25 text-sm">
              No executions yet — run your first workflow!
            </div>
          ) : (
            (stats?.recentExecutions ?? []).slice(0, 6).map((exec) => (
              <div
                key={exec.id}
                onClick={() => navigate(`/executions/${exec.id}`)}
                className="flex items-center justify-between py-3 px-1 hover:bg-white/3 rounded-lg cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className={`status-dot ${exec.status}`} />
                  <div>
                    <p className="text-sm text-white/75 font-medium group-hover:text-white transition-colors">{exec.workflow?.name}</p>
                    <p className="text-xs text-white/30">{formatDistanceToNow(new Date(exec.createdAt), { addSuffix: true })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={exec.status} />
                  {exec.durationMs && (
                    <span className="text-xs text-white/30">{(exec.durationMs / 1000).toFixed(1)}s</span>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      </motion.div>
    </div>
  );
}
