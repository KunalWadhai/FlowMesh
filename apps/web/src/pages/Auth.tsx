import { useState } from 'react';
import {
  Activity, ArrowRight, Bot, Check, GitBranch, Globe, Layers, Play, Radio, Zap,
} from 'lucide-react';
import { AuthCard, type AuthMode } from '../components/auth/AuthCard';

const CAPABILITIES = [
  { icon: Layers, title: 'Design the flow', body: 'Compose API calls, transforms, conditions, and AI steps in a canvas your team can read.' },
  { icon: Play, title: 'Run with control', body: 'Execute the same versioned graph every time, with retries and state at each step.' },
  { icon: Activity, title: 'See what happened', body: 'Follow every run in real time. Inspect inputs, outputs, and failures without chasing logs.' },
];

const WORKFLOW_STEPS = [
  ['01', 'Connect', 'Start with an event or API request.'],
  ['02', 'Compose', 'Add logic, data transforms, and AI where they belong.'],
  ['03', 'Operate', 'Run, inspect, and improve one shared workflow.'],
];

function WorkflowPreview() {
  const steps = [
    { icon: Globe, label: 'Fetch account', detail: 'HTTP request', color: 'text-[#8b85ff]', bg: 'bg-primary/15', state: '200' },
    { icon: Layers, label: 'Normalize data', detail: 'Transform', color: 'text-accent', bg: 'bg-accent/10', state: 'Done' },
    { icon: Bot, label: 'Classify request', detail: 'AI agent', color: 'text-success', bg: 'bg-success/10', state: 'Done' },
    { icon: GitBranch, label: 'Route outcome', detail: 'Condition', color: 'text-warning', bg: 'bg-warning/10', state: 'True' },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111116] shadow-2xl shadow-black/25">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
        <div><p className="text-sm font-medium text-white/90">Customer request routing</p><p className="mt-0.5 text-xs text-white/40">Production workflow · v12</p></div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Healthy</span>
      </div>
      <div className="grid sm:grid-cols-[1.35fr_0.9fr]">
        <div className="p-4 sm:p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-white/35">Workflow steps</p>
          <div className="space-y-2">
            {steps.map(({ icon: Icon, label, detail, color, bg, state }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-white/7 bg-white/[0.025] px-3 py-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white/80">{label}</p><p className="mt-0.5 text-[11px] text-white/35">{detail}</p></div>
                <span className="text-[11px] text-success">{state}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-white/8 bg-white/[0.02] p-4 sm:border-l sm:border-t-0 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">Latest run</p>
          <div className="mt-4 rounded-xl border border-white/8 bg-[#0c0c10] p-4">
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-white/85">Run #842</span><Check className="h-4 w-4 text-success" /></div>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-white/40">Status</dt><dd className="text-success">Completed</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/40">Duration</dt><dd className="text-white/75">1.8 sec</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/40">Steps</dt><dd className="text-white/75">4 / 4 passed</dd></div>
            </dl>
          </div>
          <p className="mt-3 text-xs leading-5 text-white/35">Open any run to inspect the data passed through each step.</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const scrollToAuth = (next?: AuthMode) => { if (next) setMode(next); document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };

  return (
    <div className="landing-page min-h-screen overflow-x-clip bg-[#09090b] text-white">
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="app-navbar mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-3 sm:px-4">
          <a href="#top" className="flex items-center gap-2.5" aria-label="FlowMesh home"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"><Zap className="h-4 w-4 text-white" /></div><span className="text-base font-semibold tracking-tight">FlowMesh</span></a>
          <nav className="hidden items-center gap-1 text-sm text-white/55 md:flex" aria-label="Page sections"><a href="#product" className="rounded-lg px-3 py-2 transition-colors hover:bg-white/5 hover:text-white">Product</a><a href="#workflow" className="rounded-lg px-3 py-2 transition-colors hover:bg-white/5 hover:text-white">How it works</a><a href="#developers" className="rounded-lg px-3 py-2 transition-colors hover:bg-white/5 hover:text-white">Developers</a></nav>
          <div className="flex items-center gap-2"><button type="button" onClick={() => scrollToAuth('login')} className="hidden rounded-lg px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/5 hover:text-white sm:block">Sign in</button><button type="button" onClick={() => scrollToAuth('register')} className="rounded-xl bg-white px-3.5 py-2 text-sm font-medium text-black shadow-[0_0_24px_rgba(255,255,255,0.12)] transition-colors hover:bg-white/90">Create workspace</button></div>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center lg:py-24">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-light">Developer-first workflow automation</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-6xl">Build, connect, and automate workflows visually.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/55">FlowMesh gives technical teams a visual workflow engine for connecting services, orchestrating logic, and inspecting every execution.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3"><button type="button" onClick={() => scrollToAuth('register')} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-dark">Start building <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => scrollToAuth('login')} className="inline-flex h-11 items-center rounded-lg border border-white/12 px-4 text-sm font-medium text-white/75 transition-colors hover:border-white/25 hover:text-white">Sign in</button></div>
            <div className="mt-12 grid max-w-2xl gap-px overflow-hidden rounded-xl border border-white/8 bg-white/8 sm:grid-cols-3">
              {[['Visual builder', 'Make system logic explicit'], ['AI steps', 'Use NVIDIA AI in the flow'], ['Run visibility', 'Inspect each node outcome']].map(([title, detail]) => <div key={title} className="bg-[#09090b] px-4 py-4"><p className="text-sm font-medium text-white/85">{title}</p><p className="mt-1 text-xs leading-5 text-white/40">{detail}</p></div>)}
            </div>
          </div>
          <WorkflowPreview />
        </section>

        <section id="product" className="border-y border-white/8 bg-[#0d0d10]"><div className="mx-auto max-w-6xl px-5 py-16 lg:py-20"><div className="max-w-2xl"><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-light">Product</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">One shared view of work in motion.</h2><p className="mt-4 text-base leading-7 text-white/50">The builder, runtime, and execution history use the same model, so the diagram remains useful after deployment.</p></div><div className="mt-10"><WorkflowPreview /></div><div className="mt-10 grid gap-0 border-y border-white/8 md:grid-cols-3">{CAPABILITIES.map(({ icon: Icon, title, body }) => <article key={title} className="border-b border-white/8 py-6 md:border-b-0 md:px-6 md:first:pl-0 md:border-r md:last:border-r-0"><Icon className="h-5 w-5 text-primary-light" /><h3 className="mt-5 text-base font-medium text-white/90">{title}</h3><p className="mt-2 text-sm leading-6 text-white/45">{body}</p></article>)}</div></div></section>

        <section id="workflow" className="mx-auto max-w-6xl px-5 py-16 lg:py-24"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-light">Workflow model</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">The graph is the source of truth.</h2><p className="mt-4 text-base leading-7 text-white/50">Represent the actual path data takes through your systems. Each node has a purpose, configuration, and observable outcome.</p><div className="mt-8 space-y-5">{WORKFLOW_STEPS.map(([number, title, body]) => <div key={number} className="flex gap-4"><span className="pt-0.5 font-mono text-xs text-primary-light">{number}</span><div><h3 className="text-sm font-medium text-white/85">{title}</h3><p className="mt-1 text-sm leading-6 text-white/45">{body}</p></div></div>)}</div></div><WorkflowPreview /></div></section>

        <section id="operations" className="border-t border-white/8"><div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[1fr_1.4fr] md:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-light">Operations</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Know the state of every run.</h2></div><div className="grid gap-3 sm:grid-cols-2">{[['Node-level status', 'See where a run is waiting, succeeding, or failing.'], ['Structured context', 'Inspect the inputs and outputs that moved through the graph.'], ['AI as a controlled step', 'Keep prompts and model-backed decisions visible in the workflow.'], ['Shared operational language', 'Give engineering and operations the same view of the system.']].map(([title, body]) => <div key={title} className="rounded-lg border border-white/8 p-4"><Radio className="h-4 w-4 text-white/45" /><p className="mt-3 text-sm font-medium text-white/80">{title}</p><p className="mt-1 text-sm leading-6 text-white/42">{body}</p></div>)}</div></div></section>
        <section id="developers" className="border-t border-white/8 bg-[#0d0f16]"><div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2 lg:items-center lg:py-24"><div><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-light">Developers</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Built for developers who care about what happens under the hood.</h2><p className="mt-4 max-w-xl text-base leading-7 text-white/50">Keep the workflow, its configuration, and each execution in one inspectable system. Build visually, then trace exactly how data moved through every step.</p><ul className="mt-8 space-y-3 text-sm text-white/65">{['Structured workflow configuration', 'HTTP requests, conditions, transforms, and AI steps', 'Node-level execution status and logs', 'Clear inputs, outputs, and failure context'].map((item) => <li key={item} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{item}</li>)}</ul></div><div className="overflow-hidden rounded-xl border border-white/10 bg-[#090c14] font-mono text-xs shadow-[0_16px_40px_rgba(0,0,0,0.28)]"><div className="flex items-center gap-2 border-b border-white/8 px-4 py-3 text-white/40"><span className="h-2 w-2 rounded-full bg-danger/70" /><span className="h-2 w-2 rounded-full bg-warning/70" /><span className="h-2 w-2 rounded-full bg-success/70" /><span className="ml-2">execution.http</span></div><pre className="overflow-x-auto p-5 leading-7 text-white/65"><span className="text-primary-light">POST</span> /api/workflows/run{`\n\n`}{`{\n  "workflowId": "wf_customer_sync",\n  "input": { "customerId": "cus_1842" }\n}`} {`\n\n`}<span className="text-success">→ 200 OK</span>{`\n\n`}execution_id: <span className="text-white/90">ex_91af2</span>{`\n`}duration: <span className="text-white/90">1.82s</span>{`\n`}status: <span className="text-success">success</span></pre></div></div></section>

        <section id="examples" className="mx-auto max-w-6xl px-5 py-16 lg:py-24"><div className="max-w-2xl"><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-light">Workflow examples</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Start from a flow your team already recognizes.</h2></div><div className="mt-10 grid gap-4 lg:grid-cols-3">{[['API sync', 'API Request', 'Validate', 'Transform', 'Store'], ['Event routing', 'Webhook', 'Condition', 'Transform', 'Notify'], ['Scheduled processing', 'Schedule', 'External API', 'Process', 'Store']].map(([name, ...steps]) => <article key={name} className="rounded-xl border border-white/8 bg-surface-1 p-5"><h3 className="text-sm font-medium text-white/90">{name}</h3><div className="mt-5 flex flex-wrap items-center gap-2">{steps.map((step, i) => <><span key={step} className="rounded-md border border-white/10 bg-surface-2 px-2 py-1 font-mono text-[10px] text-white/60">{step}</span>{i < steps.length - 1 && <ArrowRight key={`${step}-arrow`} className="h-3 w-3 text-primary-light" />}</>)}</div><p className="mt-5 font-mono text-[11px] text-white/35">status: <span className="text-success">ready</span> · 4 steps</p></article>)}</div></section>

        <section id="auth" className="border-t border-white/8 bg-[#0d0f16]"><div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1fr_390px] lg:items-center lg:py-24"><div><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-light">Get started</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Build your first workflow.</h2><p className="mt-4 max-w-lg text-base leading-7 text-white/50">Connect your services, automate your logic, and see every execution clearly.</p></div><AuthCard mode={mode} onModeChange={setMode} /></div></section>
      </main>

      <footer className="border-t border-white/8 py-8"><div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-white/65">FlowMesh</p><p className="mt-1">Developer-first workflow automation.</p></div><div className="flex gap-5"><a href="#product" className="hover:text-white/70">Product</a><a href="#developers" className="hover:text-white/70">Developers</a><button type="button" onClick={() => scrollToAuth('login')} className="text-left hover:text-white/70">Sign in</button></div><span>© 2026 FlowMesh</span></div></footer>
    </div>
  );
}
