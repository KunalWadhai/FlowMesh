import { useState, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import {
  Activity, ArrowRight, Bot, Check, ChevronRight, GitBranch, Globe, Layers, Play, 
  Radio, Zap, Code2, Timer, Sparkles, Database, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { AuthCard, type AuthMode } from '../components/auth/AuthCard';

const CAPABILITIES = [
  { icon: Layers, title: 'Visual workflow builder', body: 'Drag and drop to compose API calls, transforms, conditions, and AI steps in a visual canvas.' },
  { icon: Play, title: 'Reliable execution engine', body: 'Run versioned workflows with automatic retries, error handling, and state management at every step.' },
  { icon: Activity, title: 'Real-time observability', body: 'Track every execution in real-time. Inspect inputs, outputs, logs, and failures without digging through logs.' },
  { icon: Sparkles, title: 'AI-powered automation', body: 'Integrate NVIDIA AI models directly into your workflows for intelligent data processing and decision-making.' },
];

// Animated workflow visualization component
function AnimatedWorkflow() {
  const [activeStep, setActiveStep] = useState(0);
  const [executionState, setExecutionState] = useState<'idle' | 'running' | 'complete'>('idle');

  const steps = [
    { icon: Globe, label: 'API Request', detail: 'GET /api/users', color: 'text-[#38bdf8]', bg: 'bg-[#38bdf8]/15', border: 'border-[#38bdf8]/30' },
    { icon: Code2, label: 'Transform', detail: 'Normalize data', color: 'text-[#a78bfa]', bg: 'bg-[#a78bfa]/15', border: 'border-[#a78bfa]/30' },
    { icon: Bot, label: 'AI Analysis', detail: 'Classify sentiment', color: 'text-success', bg: 'bg-success/15', border: 'border-success/30' },
    { icon: Database, label: 'Store Result', detail: 'Save to database', color: 'text-[#fbbf24]', bg: 'bg-[#fbbf24]/15', border: 'border-[#fbbf24]/30' },
  ];

  useEffect(() => {
    if (executionState === 'running') {
      if (activeStep < steps.length - 1) {
        const timer = setTimeout(() => setActiveStep(activeStep + 1), 1200);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setExecutionState('complete'), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [activeStep, executionState, steps.length]);

  const startExecution = () => {
    setActiveStep(0);
    setExecutionState('running');
  };

  const resetExecution = () => {
    setActiveStep(0);
    setExecutionState('idle');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0f] to-[#151520] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white/90">User Data Pipeline</h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Active
            </span>
          </div>
          <p className="mt-0.5 text-xs text-white/40">Production workflow · v3.2</p>
        </div>
        <div className="flex items-center gap-2">
          {executionState === 'idle' && (
            <button
              onClick={startExecution}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25"
            >
              <Play className="h-4 w-4" /> Run
            </button>
          )}
          {executionState === 'running' && (
            <span className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
              <Clock className="h-4 w-4 animate-spin" /> Running
            </span>
          )}
          {executionState === 'complete' && (
            <button
              onClick={resetExecution}
              className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success transition-all hover:bg-success/20"
            >
              <CheckCircle className="h-4 w-4" /> Complete
            </button>
          )}
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="relative px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-4 flex-1">
              {/* Step Node */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{
                  scale: executionState !== 'idle' && idx <= activeStep ? 1 : 0.95,
                  opacity: executionState !== 'idle' && idx <= activeStep ? 1 : 0.6,
                }}
                transition={{ duration: 0.3 }}
                className="relative flex-1"
              >
                <div className={`relative rounded-xl border ${step.border} ${step.bg} p-4 backdrop-blur-sm transition-all duration-300
                  ${executionState === 'running' && idx === activeStep ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
                >
                  {/* Status Indicator */}
                  <div className="absolute -top-2 -right-2">
                    <AnimatePresence>
                      {executionState === 'running' && idx === activeStep && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-accent"
                        >
                          <Clock className="h-3 w-3 text-white animate-spin" />
                        </motion.div>
                      )}
                      {((executionState === 'running' && idx < activeStep) || executionState === 'complete') && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-success"
                        >
                          <Check className="h-3 w-3 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Icon */}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${step.bg} border ${step.border}`}>
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                  </div>

                  {/* Label */}
                  <div className="mt-3">
                    <p className="text-sm font-medium text-white/85">{step.label}</p>
                    <p className="mt-0.5 text-xs text-white/40">{step.detail}</p>
                  </div>

                  {/* Animated Progress Bar */}
                  {executionState === 'running' && idx === activeStep && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-accent"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1.2, ease: 'linear' }}
                    />
                  )}
                </div>
              </motion.div>

              {/* Connector Arrow */}
              {idx < steps.length - 1 && (
                <motion.div
                  animate={{
                    opacity: executionState !== 'idle' && idx < activeStep ? 1 : 0.3,
                    x: executionState === 'running' && idx === activeStep ? [0, 5, 0] : 0,
                  }}
                  transition={{
                    x: { repeat: Infinity, duration: 1 },
                    opacity: { duration: 0.3 },
                  }}
                >
                  <ChevronRight className={`h-6 w-6 ${
                    executionState !== 'idle' && idx < activeStep ? 'text-primary' : 'text-white/20'
                  }`} />
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {/* Execution Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: executionState === 'complete' ? 1 : 0,
            y: executionState === 'complete' ? 0 : 10,
          }}
          className="mt-8 grid grid-cols-3 gap-4"
        >
          {[
            { label: 'Duration', value: '2.4s', icon: Clock },
            { label: 'Steps', value: '4/4', icon: CheckCircle },
            { label: 'Status', value: 'Success', icon: Activity, color: 'text-success' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color || 'text-white/40'}`} />
                <span className="text-xs text-white/40">{stat.label}</span>
              </div>
              <p className={`mt-1 text-lg font-semibold ${stat.color || 'text-white/85'}`}>{stat.value}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Background Animation */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>
    </div>
  );
}

// Floating data particles animation
function DataParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary/30"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          transition={{
            duration: 20 + Math.random() * 10,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [mode, setMode] = useState<AuthMode>('login');
  
  const scrollToAuth = (next?: AuthMode) => {
    if (next) setMode(next);
    document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="landing-page relative min-h-screen overflow-x-clip bg-[#09090b] text-white">
      <DataParticles />
      
      {/* Navbar */}
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="app-navbar mx-auto flex h-14 max-w-7xl items-center justify-between rounded-2xl px-4 backdrop-blur-xl">
          <a href="#top" className="flex items-center gap-2.5" aria-label="FlowMesh home">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">FlowMesh</span>
          </a>
          <nav className="hidden items-center gap-1 text-sm text-white/60 md:flex" aria-label="Page sections">
            <a href="#product" className="rounded-lg px-3 py-2 transition-colors hover:bg-white/5 hover:text-white">Product</a>
            <a href="#workflow" className="rounded-lg px-3 py-2 transition-colors hover:bg-white/5 hover:text-white">How it works</a>
            <a href="#features" className="rounded-lg px-3 py-2 transition-colors hover:bg-white/5 hover:text-white">Features</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollToAuth('login')}
              className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-white/70 transition-all hover:bg-white/5 hover:text-white sm:block"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => scrollToAuth('register')}
              className="rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-105"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="relative mx-auto max-w-7xl px-5 py-20 lg:py-32">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary-light backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                AI-Powered Workflow Automation
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-8 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl"
            >
              Build workflows that
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">
                actually work
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60"
            >
              Visual workflow engine for technical teams. Connect services, orchestrate logic with AI,
              and inspect every execution—all in one platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <button
                type="button"
                onClick={() => scrollToAuth('register')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-base font-medium text-white shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-primary/40"
              >
                Start Building Free <ArrowRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-base font-medium text-white/80 backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/5 hover:text-white"
              >
                <Play className="h-5 w-5" /> Watch Demo
              </button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-white/40"
            >
              {[
                { icon: CheckCircle, text: 'No credit card required' },
                { icon: Zap, text: 'Setup in minutes' },
                { icon: Globe, text: 'Cloud or self-hosted' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-success" />
                  {item.text}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Animated Workflow Demo */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-20"
          >
            <AnimatedWorkflow />
          </motion.div>
        </section>

        {/* Product Section */}
        <section id="product" className="border-y border-white/8 bg-gradient-to-b from-transparent to-white/[0.02]">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:py-28">
            <div className="text-center">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary-light">Product</span>
              <h2 className="mt-4 text-4xl font-bold tracking-tight">Everything you need to automate</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/55">
                Build, deploy, and monitor workflows with full visibility into every step
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {CAPABILITIES.map((capability, idx) => (
                <motion.div
                  key={capability.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 blur-2xl transition-all group-hover:scale-150" />
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-primary-light">
                      <capability.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white/90">{capability.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/50">{capability.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="workflow" className="mx-auto max-w-7xl px-5 py-20 lg:py-28">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary-light">How it works</span>
              <h2 className="mt-4 text-4xl font-bold tracking-tight">Build once, run everywhere</h2>
              <p className="mt-4 text-lg leading-8 text-white/55">
                Design workflows visually, deploy with confidence, and monitor every execution in real-time
              </p>

              <div className="mt-10 space-y-6">
                {[
                  {
                    step: '01',
                    title: 'Design visually',
                    body: 'Drag and drop nodes to build your workflow. Connect API requests, data transforms, conditions, and AI steps.',
                    icon: Layers,
                  },
                  {
                    step: '02',
                    title: 'Configure & test',
                    body: 'Set up each node with your parameters. Test individual steps or the entire workflow before deploying.',
                    icon: Code2,
                  },
                  {
                    step: '03',
                    title: 'Deploy & monitor',
                    body: 'Activate your workflow and watch it run. Track every execution with detailed logs and metrics.',
                    icon: Activity,
                  },
                ].map((item, idx) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className="flex gap-4"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-primary-light">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-semibold text-primary-light">{item.step}</span>
                        <h3 className="text-lg font-semibold text-white/90">{item.title}</h3>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-white/50">{item.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <AnimatedWorkflow />
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="border-t border-white/8 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:py-28">
            <div className="text-center">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary-light">Features</span>
              <h2 className="mt-4 text-4xl font-bold tracking-tight">Built for developers</h2>
            </div>

            <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-white/10 md:grid-cols-2">
              {[
                { icon: Radio, title: 'Real-time execution', body: 'Watch workflows execute step-by-step with live updates and detailed logs.' },
                { icon: GitBranch, title: 'Version control', body: 'Every workflow change is versioned. Roll back or compare versions anytime.' },
                { icon: Bot, title: 'AI integration', body: 'Use NVIDIA AI models directly in your workflows for intelligent automation.' },
                { icon: Timer, title: 'Scheduling', body: 'Run workflows on a schedule or trigger them via webhooks and events.' },
                { icon: Database, title: 'State management', body: 'Persist state between steps and access it throughout your workflow.' },
                { icon: Activity, title: 'Full observability', body: 'Inspect inputs, outputs, and logs for every node in every execution.' },
              ].map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  className="border-white/10 bg-[#09090b] p-8 transition-colors hover:bg-white/[0.02] md:border-b md:border-r md:last:border-r-0 md:even:border-r-0"
                >
                  <feature.icon className="h-6 w-6 text-primary-light" />
                  <h3 className="mt-4 text-lg font-semibold text-white/90">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/50">{feature.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="auth" className="border-t border-white/8 bg-gradient-to-b from-transparent to-white/[0.02]">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[1fr_420px] lg:items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary-light">Get Started</span>
                <h2 className="mt-4 text-4xl font-bold tracking-tight">Ready to automate?</h2>
                <p className="mt-4 max-w-xl text-lg leading-8 text-white/60">
                  Create your workspace and build your first workflow in minutes. No credit card required.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    'Unlimited workflows on free tier',
                    'Full access to visual builder',
                    'AI-powered automation included',
                    'Real-time execution monitoring',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <AuthCard mode={mode} onModeChange={setMode} />
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/8 bg-[#09090b] py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-white/80">FlowMesh</span>
            </div>
            <p className="mt-2">Developer-first workflow automation</p>
          </div>
          <div className="flex gap-6">
            <a href="#product" className="transition-colors hover:text-white/70">Product</a>
            <a href="#features" className="transition-colors hover:text-white/70">Features</a>
            <button type="button" onClick={() => scrollToAuth('login')} className="text-left transition-colors hover:text-white/70">
              Sign in
            </button>
          </div>
          <span>© 2026 FlowMesh. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
