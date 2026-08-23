import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, User, Bot, Loader2, Zap, GitBranch, AlertTriangle,
  TrendingUp, Copy, Check, RefreshCw
} from 'lucide-react';
import api from '../lib/api';
import { Button, Card, Badge } from '../components/ui';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  workflow?: object;
  suggestions?: string[];
  issues?: Array<{ severity: string; nodeId?: string; message: string }>;
}

const QUICK_PROMPTS = [
  'Create a workflow that fetches weather data and sends an alert if it\'s raining',
  'Build a pipeline that processes user signups: validate email, create account, send welcome email',
  'Design a daily report workflow that pulls data from an API and uses AI to summarize it',
  'Create a webhook handler that routes events to different processing branches',
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I\'m the FlowMesh AI assistant — I can help you design workflows, analyze existing ones, and suggest optimizations. What would you like to build today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'suggest' | 'analyze'>('chat');
  const [copied, setCopied] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((p) => [...p, userMsg]);

    try {
      if (mode === 'suggest') {
        const { data } = await api.post<{ data: { workflow?: object; explanation: string; suggestions: string[] } }>(
          '/ai/suggest', { prompt: content }
        );
        setMessages((p) => [...p, {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.data.explanation,
          workflow: data.data.workflow ?? undefined,
          suggestions: data.data.suggestions,
          timestamp: new Date(),
        }]);
      } else {
        const history = messages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content }));
        history.push({ role: 'user', content });

        const { data } = await api.post<{ data: { response: string } }>('/ai/chat', { messages: history });
        setMessages((p) => [...p, {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date(),
        }]);
      }
    } catch {
      setMessages((p) => [...p, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I hit an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const copyWorkflow = async (wf: object, id: string) => {
    await navigator.clipboard.writeText(JSON.stringify(wf, null, 2));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Workflow definition copied!');
  };

  const severityColor: Record<string, string> = {
    high: 'danger', medium: 'warning', low: 'default'
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 glass flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-primary">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white/90">AI Assistant</h1>
            <p className="text-xs text-white/35">Powered by Claude</p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl glass border border-white/8">
          {([
            { key: 'chat', label: 'Chat', icon: Bot },
            { key: 'suggest', label: 'Generate', icon: GitBranch },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === key ? 'bg-primary/20 text-primary-light' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
              )}

              <div className={`max-w-[75%] space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary/20 text-white/90 border border-primary/25 rounded-tr-sm'
                    : 'glass border border-white/8 text-white/80 rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="w-full space-y-1.5">
                    <p className="text-xs text-white/35 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" /> Tips
                    </p>
                    {msg.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl glass border border-white/5 text-xs text-white/60">
                        <Zap className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" />
                        {s}
                      </div>
                    ))}
                  </div>
                )}

                {/* Issues */}
                {msg.issues && msg.issues.length > 0 && (
                  <div className="w-full space-y-1.5">
                    <p className="text-xs text-white/35 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" /> Issues Found
                    </p>
                    {msg.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl glass border border-white/5 text-xs text-white/60">
                        <Badge variant={(severityColor[issue.severity] as 'danger') ?? 'default'} className="flex-shrink-0">
                          {issue.severity}
                        </Badge>
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Generated workflow */}
                {msg.workflow && (
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-white/35 flex items-center gap-1.5">
                        <GitBranch className="w-3 h-3" /> Generated Workflow
                      </p>
                      <button
                        onClick={() => copyWorkflow(msg.workflow!, msg.id)}
                        className="flex items-center gap-1 text-xs text-primary-light hover:text-accent transition-colors"
                      >
                        {copied === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied === msg.id ? 'Copied!' : 'Copy JSON'}
                      </button>
                    </div>
                    <div className="rounded-xl glass border border-white/8 p-3 max-h-48 overflow-y-auto">
                      <pre className="text-xs text-white/50 font-mono whitespace-pre-wrap">
                        {JSON.stringify(msg.workflow, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <p className="text-xs text-white/20 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-primary-light" />
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-accent animate-pulse" />
              </div>
              <div className="px-4 py-3 glass border border-white/8 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs text-white/40">Thinking…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length === 1 && (
        <div className="px-6 pb-4">
          <p className="text-xs text-white/30 mb-3 flex items-center gap-1.5"><Zap className="w-3 h-3" /> Quick start</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p)}
                className="text-left px-3 py-2.5 rounded-xl glass border border-white/5 hover:border-white/15 hover:bg-white/5 text-xs text-white/50 hover:text-white/80 transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 pb-6 flex-shrink-0">
        <div className="flex gap-3 items-end glass-elevated rounded-2xl border border-white/8 p-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            placeholder={mode === 'suggest' ? 'Describe the workflow you want to build…' : 'Ask anything about workflows…'}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 focus:outline-none resize-none max-h-32 leading-relaxed"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            loading={loading}
            size="sm"
            className="flex-shrink-0"
            icon={<Send className="w-4 h-4" />}
          >
            Send
          </Button>
        </div>
        <p className="text-center text-xs text-white/15 mt-2">Shift+Enter for new line · Enter to send</p>
      </div>
    </div>
  );
}
