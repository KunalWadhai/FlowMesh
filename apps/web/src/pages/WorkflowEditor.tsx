import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, MiniMap, BackgroundVariant,
  addEdge, useNodesState, useEdgesState, type OnConnect,
  type Node, type Edge, Panel, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Play, ChevronLeft, Settings2, Sparkles, X, Globe,
  Code2, Timer, GitBranch, FileText, Zap, Plus, Check, AlertCircle
} from 'lucide-react';
import { nanoid } from 'nanoid';
import api from '../lib/api';
import { FlowNode } from '../components/workflow/FlowNode';
import { Button, Input, Textarea, Badge, StatusBadge, Spinner } from '../components/ui';
import { useExecutionEvents } from '../hooks/useSocket';
import type { Workflow, WorkflowNode, WorkflowEdge, NodeType } from '../types/workflow';
import toast from 'react-hot-toast';

// Avoid React Flow's built-in `default` node type: it adds a white card behind
// custom content and makes nodes difficult to read on the dark canvas.
const NODE_TYPES = { flowNode: FlowNode };

const PALETTE_NODES: Array<{ type: NodeType; label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string; desc: string }> = [
  { type: 'http_request', label: 'HTTP Request', icon: Globe, color: 'text-[#38bdf8]', bg: 'bg-[#38bdf8]/10', border: '#38bdf8', desc: 'Call any REST API' },
  { type: 'transform', label: 'Transform', icon: Code2, color: 'text-[#a78bfa]', bg: 'bg-[#a78bfa]/10', border: '#a78bfa', desc: 'Shape data with JS' },
  { type: 'ai_agent', label: 'AI Agent', icon: Sparkles, color: 'text-success', bg: 'bg-success/10', border: '#10d9a8', desc: 'NVIDIA AI · Process data' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'text-[#fb923c]', bg: 'bg-[#fb923c]/10', border: '#fb923c', desc: 'Branch on logic' },
  { type: 'delay', label: 'Delay', icon: Timer, color: 'text-warning', bg: 'bg-warning/10', border: '#fbbf24', desc: 'Wait / throttle' },
  { type: 'log', label: 'Log', icon: FileText, color: 'text-[#94a3b8]', bg: 'bg-[#94a3b8]/10', border: '#94a3b8', desc: 'Emit a log entry' },
];

interface StepStatus { [nodeId: string]: 'idle' | 'running' | 'succeeded' | 'failed' }

export default function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [name, setName] = useState('Untitled Workflow');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [stepStatus, setStepStatus] = useState<StepStatus>({});
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showPalette, setShowPalette] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const getDefaultConfig = (type: NodeType): Record<string, unknown> => {
    switch (type) {
      case 'http_request': return { method: 'GET', timeout: 30000, retries: 3 };
      case 'delay': return { delayMs: 1000 };
      case 'condition': return { condition: 'return input.status === 200' };
      case 'ai_agent': return { prompt: 'Summarize the input and return the key findings.', maxTokens: 1024 };
      case 'log': return { level: 'info', message: 'Workflow reached this step' };
      case 'transform': return { expression: 'return input;' };
      default: return {};
    }
  };

  // Load existing workflow
  useEffect(() => {
    if (isNew) return;
    api.get<{ data: Workflow }>(`/workflows/${id}`)
      .then(({ data }) => {
        const wf = data.data;
        setWorkflow(wf);
        setName(wf.name);
        setDescription(wf.description ?? '');
        setNodes(wf.definition.nodes.map((n) => ({
          id: n.id, type: 'flowNode', position: n.position,
          data: { ...n },
        })));
        setEdges(wf.definition.edges.map((e) => ({
          id: e.id, source: e.source, target: e.target,
          sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
          markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(99,102,241,0.7)' },
          style: { stroke: 'rgba(99,102,241,0.35)', strokeWidth: 2, strokeDasharray: '6 4' },
          animated: false,
        })));
      })
      .catch(() => toast.error('Failed to load workflow'))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // Real-time execution events
  useExecutionEvents(executionId, {
    onStepStarted: ({ nodeId }) => setStepStatus((p) => ({ ...p, [nodeId]: 'running' })),
    onStepCompleted: ({ nodeId }) => setStepStatus((p) => ({ ...p, [nodeId]: 'succeeded' })),
    onStepFailed: ({ nodeId }) => setStepStatus((p) => ({ ...p, [nodeId]: 'failed' })),
    onCompleted: () => { setRunning(false); toast.success('Workflow completed!'); },
    onFailed: ({ error }) => { setRunning(false); toast.error(`Workflow failed: ${error}`); },
  });

  // Apply execution status to nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, executionStatus: stepStatus[n.id] ?? 'idle' },
      }))
    );
  }, [stepStatus]);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) =>
        addEdge({
          ...connection,
          markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(99,102,241,0.7)' },
          style: { stroke: 'rgba(99,102,241,0.35)', strokeWidth: 2, strokeDasharray: '6 4' },
          animated: false,
        }, eds)
      );
    },
    [setEdges]
  );

  const addNode = useCallback((type: NodeType) => {
    const id = `node-${nanoid(6)}`;
    const config = PALETTE_NODES.find((p) => p.type === type);
    const index = nodes.length;
    const newNode: Node = {
      id,
      type: 'flowNode',
      position: { x: 96 + (index % 3) * 280, y: 96 + Math.floor(index / 3) * 180 },
      data: {
        id, type, label: config?.label ?? type, config: getDefaultConfig(type),
        onDelete: (nid: string) => {
          setNodes((nds) => nds.filter((n) => n.id !== nid));
          setEdges((eds) => eds.filter((e) => e.source !== nid && e.target !== nid));
        },
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setShowConfig(true);
  }, [nodes.length, setNodes, setEdges]);

  const buildDefinition = () => ({
    nodes: nodes.map((n) => ({
      id: n.id, type: (n.data as unknown as WorkflowNode).type,
      label: (n.data as unknown as WorkflowNode).label,
      position: n.position,
      config: (n.data as unknown as WorkflowNode).config ?? {},
    })),
    edges: edges.map((e) => ({
      id: e.id, source: e.source, target: e.target,
      sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
    })),
  });

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Workflow name is required');
    setSaving(true);
    try {
      const definition = buildDefinition();
      if (isNew) {
        const { data } = await api.post<{ data: Workflow }>('/workflows', { name, description, definition });
        navigate(`/workflows/${data.data.id}`, { replace: true });
        toast.success('Workflow created!');
      } else {
        await api.put(`/workflows/${id}`, { name, description, definition });
        toast.success('Saved!');
      }
    } catch {
      toast.error('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (isNew) { toast.error('Save the workflow first'); return; }
    setRunning(true);
    setStepStatus({});
    try {
      const { data } = await api.post<{ data: { id: string } }>(`/workflows/${id}/execute`, {});
      setExecutionId(data.data.id);
      toast.success('Execution started');
    } catch {
      toast.error('Failed to start execution');
      setRunning(false);
    }
  };

  const updateSelectedNodeConfig = (key: string, value: unknown) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, config: { ...(n.data as unknown as WorkflowNode).config, [key]: value } } }
          : n
      )
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>
  );

  const selData = selectedNode?.data as unknown as WorkflowNode | null;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex h-14 items-center gap-3 px-4 bg-surface-0 border-b border-white/10 flex-shrink-0 z-10">
        <button aria-label="Back to workflows" onClick={() => navigate('/workflows')} className="rounded-lg p-1.5 text-white/40 hover:bg-surface-2 hover:text-white/80 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-white/90 font-semibold text-base focus:outline-none border-b border-transparent focus:border-primary/50 transition-colors pb-0.5 min-w-0 max-w-xs"
            placeholder="Workflow name…"
          />
          {workflow && <StatusBadge status={workflow.status} />}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-white/10 bg-surface-2 px-2.5 py-0.5 font-mono text-xs text-white/40 sm:block">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setShowPalette(!showPalette)} icon={<Plus className="w-4 h-4" />}>
            Add Node
          </Button>
          <Button variant="secondary" size="sm" loading={saving} onClick={handleSave} icon={<Save className="w-4 h-4" />}>
            Save
          </Button>
          <Button size="sm" loading={running} onClick={handleRun}
            icon={running ? <Zap className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
          >
            {running ? 'Running…' : 'Run'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Node Palette */}
        <AnimatePresence>
          {showPalette && (
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-[260px] flex-shrink-0 bg-surface-0 border-r border-white/10 flex flex-col z-10"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Node Palette</span>
                <button onClick={() => setShowPalette(false)} className="text-white/30 hover:text-white/70">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-3 pt-3">
                <p className="text-xs leading-5 text-white/35">Add a step, configure it on the right, then drag from its output dot to the next step.</p>
              </div>
              <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                {PALETTE_NODES.map(({ type, label, icon: Icon, color, bg, border, desc }) => (
                  <button
                    key={type}
                    role="button"
                    aria-label={`Add ${label} node`}
                    onClick={() => addNode(type)}
                    className="group relative w-full overflow-hidden border border-transparent border-l-[3px] bg-transparent px-3 py-3 text-left transition-all hover:bg-surface-2"
                    style={{ borderLeftColor: border }}
                  >
                    <div className={`w-[38px] h-[38px] rounded-[10px] ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/75 group-hover:text-white">{label}{type === 'ai_agent' && <span className="ml-2 rounded bg-success/10 px-1.5 py-0.5 font-mono text-[10px] text-success">AI</span>}</p>
                      <p className="text-xs text-white/30 mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Execution status legend */}
              {running && (
                <div className="p-3 border-t border-white/5">
                  <p className="text-xs text-white/40 font-medium mb-2">Execution</p>
                  <div className="space-y-1.5">
                    {[
                      { status: 'running', label: 'Running', color: 'bg-accent' },
                      { status: 'succeeded', label: 'Done', color: 'bg-success' },
                      { status: 'failed', label: 'Failed', color: 'bg-danger' },
                    ].map(({ status, label, color }) => (
                      <div key={status} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color} ${status === 'running' ? 'animate-pulse' : ''}`} />
                        <span className="text-xs text-white/40">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Canvas */}
        <div className="workflow-canvas flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={NODE_TYPES}
            onNodeClick={(_, node) => { setSelectedNode(node); setShowConfig(true); }}
            onPaneClick={() => { setSelectedNode(null); setShowConfig(false); }}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              style: { stroke: 'rgba(99,102,241,0.35)', strokeWidth: 2, strokeDasharray: '6 4' },
              markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(99,102,241,0.7)' },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(99,102,241,0.12)" />
            <Controls className="!bg-surface-1 !border-white/10 !rounded-xl !shadow-card" />
            <MiniMap
              nodeColor="rgba(99,102,241,0.5)"
              maskColor="rgba(7,9,15,0.7)"
              className="!bg-surface-1 !border-white/10 !rounded-xl"
            />

            {nodes.length === 0 && (
              <Panel position="top-center" className="mt-12">
                <div className="w-[min(380px,calc(100vw-3rem))] rounded-2xl border border-dashed border-white/15 bg-surface-1 p-10 text-center shadow-card">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary-light">
                    <Plus className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-semibold text-white/90">Build your first workflow</h2>
                  <p className="mt-1 text-sm leading-6 text-white/45">Start with a trigger or data request, then connect each step from left to right.</p>
                  <div className="mt-5 flex justify-center gap-2">
                    <Button size="sm" onClick={() => addNode('http_request')} icon={<Globe className="h-4 w-4" />}>Add HTTP request</Button>
                    <Button variant="secondary" size="sm" onClick={() => addNode('ai_agent')} icon={<Sparkles className="h-4 w-4" />}>Add AI step</Button>
                  </div>
                  <p className="mt-5 font-mono text-[11px] text-white/30">Tip: click any node type in the palette to add it here.</p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Config Panel */}
        <AnimatePresence>
          {showConfig && selectedNode && selData && (
            <motion.aside
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-80 flex-shrink-0 glass border-l border-white/5 flex flex-col z-10 overflow-y-auto"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0 glass z-10">
                <div>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Node Config</p>
                  <p className="text-sm text-white/80 font-medium mt-0.5">{selData.label}</p>
                </div>
                <button onClick={() => setShowConfig(false)} className="text-white/30 hover:text-white/70">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <Input
                  label="Node label"
                  value={selData.label}
                  onChange={(e) => {
                    setNodes((nds) => nds.map((n) =>
                      n.id === selectedNode.id ? { ...n, data: { ...n.data, label: e.target.value } } : n
                    ));
                  }}
                />

                {/* HTTP Request Config */}
                {selData.type === 'http_request' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <select
                        value={selData.config.method ?? 'GET'}
                        onChange={(e) => updateSelectedNodeConfig('method', e.target.value)}
                        className="h-10 px-3 rounded-xl glass border border-white/8 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                          <option key={m} value={m} className="bg-surface-1">{m}</option>
                        ))}
                      </select>
                      <Input
                        placeholder="https://api.example.com/endpoint"
                        value={(selData.config.url as string) ?? ''}
                        onChange={(e) => updateSelectedNodeConfig('url', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <Textarea
                      label="Request body (JSON)"
                      placeholder='{"key": "{{input.value}}"}'
                      value={typeof selData.config.body === 'object' ? JSON.stringify(selData.config.body, null, 2) : (selData.config.body as string) ?? ''}
                      onChange={(e) => {
                        try { updateSelectedNodeConfig('body', JSON.parse(e.target.value)); }
                        catch { updateSelectedNodeConfig('body', e.target.value); }
                      }}
                      rows={4}
                    />
                    <Input
                      label="Timeout (ms)"
                      type="number"
                      value={(selData.config.timeout as number) ?? 30000}
                      onChange={(e) => updateSelectedNodeConfig('timeout', parseInt(e.target.value))}
                    />
                    <Input
                      label="Max retries"
                      type="number"
                      value={(selData.config.retries as number) ?? 3}
                      onChange={(e) => updateSelectedNodeConfig('retries', parseInt(e.target.value))}
                    />
                  </div>
                )}

                {/* Transform Config */}
                {selData.type === 'transform' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">JS Expression</label>
                    <p className="text-xs text-white/30">Receives <code className="text-accent">input</code>, must return a value</p>
                    <Textarea
                      placeholder={`// Example:\nreturn { ...input, timestamp: Date.now() }`}
                      value={(selData.config.expression as string) ?? ''}
                      onChange={(e) => updateSelectedNodeConfig('expression', e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>
                )}

                {/* Delay Config */}
                {selData.type === 'delay' && (
                  <Input
                    label="Delay duration (ms)"
                    type="number"
                    value={(selData.config.delayMs as number) ?? 1000}
                    onChange={(e) => updateSelectedNodeConfig('delayMs', parseInt(e.target.value))}
                    hint="Max: 60000ms (1 minute)"
                  />
                )}

                {/* Condition Config */}
                {selData.type === 'condition' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Condition Expression</label>
                    <p className="text-xs text-white/30">Must return boolean — <code className="text-accent">input</code> is available</p>
                    <Textarea
                      placeholder="return input.status === 200"
                      value={(selData.config.condition as string) ?? ''}
                      onChange={(e) => updateSelectedNodeConfig('condition', e.target.value)}
                      rows={4}
                      className="font-mono text-xs"
                    />
                  </div>
                )}

                {/* AI Agent Config */}
                {selData.type === 'ai_agent' && (
                  <div className="space-y-3">
                    <Textarea
                      label="System prompt (optional)"
                      placeholder="You are a data analyst..."
                      value={(selData.config.systemPrompt as string) ?? ''}
                      onChange={(e) => updateSelectedNodeConfig('systemPrompt', e.target.value)}
                      rows={3}
                    />
                    <Textarea
                      label="User prompt"
                      placeholder="Analyze the input data and return a JSON summary with key insights."
                      value={(selData.config.prompt as string) ?? ''}
                      onChange={(e) => updateSelectedNodeConfig('prompt', e.target.value)}
                      rows={5}
                    />
                    <Input
                      label="Max tokens"
                      type="number"
                      value={(selData.config.maxTokens as number) ?? 1024}
                      onChange={(e) => updateSelectedNodeConfig('maxTokens', parseInt(e.target.value))}
                    />
                  </div>
                )}

                {/* Log Config */}
                {selData.type === 'log' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-white/70 block mb-1.5">Log level</label>
                      <div className="flex gap-2">
                        {(['info', 'warn', 'error'] as const).map((l) => (
                          <button
                            key={l}
                            onClick={() => updateSelectedNodeConfig('level', l)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                              selData.config.level === l
                                ? l === 'error' ? 'bg-danger/20 text-danger border-danger/30' : l === 'warn' ? 'bg-warning/20 text-warning border-warning/30' : 'bg-accent/20 text-accent border-accent/30'
                                : 'glass border-white/8 text-white/40 hover:text-white/70'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      label="Message (optional)"
                      placeholder="Execution reached this step"
                      value={(selData.config.message as string) ?? ''}
                      onChange={(e) => updateSelectedNodeConfig('message', e.target.value)}
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-white/5">
                  <p className="text-xs text-white/25 font-medium uppercase tracking-wider mb-2">Node ID</p>
                  <code className="text-xs text-white/35 font-mono">{selectedNode.id}</code>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
