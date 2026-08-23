import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Mail, Lock, User, Building2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { Button, Input } from '../components/ui';
import toast from 'react-hot-toast';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', password: '', workspaceName: ''
  });

  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        await register(form.name, form.email, form.password, form.workspaceName);
        toast.success('Workspace created!');
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/8 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-primary mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">FlowMesh</h1>
          <p className="text-sm text-white/40 mt-1">AI-Powered Workflow Orchestration</p>
        </div>

        {/* Card */}
        <div className="glass-elevated rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex p-1 rounded-xl bg-white/4 mb-8">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? 'bg-primary/20 text-primary-light shadow-sm'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Get Started'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <Input
                    label="Full name"
                    placeholder="Ada Lovelace"
                    value={form.name}
                    onChange={update('name')}
                    required={mode === 'register'}
                    icon={<User className="w-4 h-4" />}
                    autoComplete="name"
                  />
                  <Input
                    label="Workspace name"
                    placeholder="My Team"
                    value={form.workspaceName}
                    onChange={update('workspaceName')}
                    required={mode === 'register'}
                    icon={<Building2 className="w-4 h-4" />}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Input
              label="Email"
              type="email"
              placeholder="ada@flowmesh.dev"
              value={form.email}
              onChange={update('email')}
              required
              icon={<Mail className="w-4 h-4" />}
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={update('password')}
                required
                minLength={8}
                icon={<Lock className="w-4 h-4" />}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 bottom-2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-6" size="lg" icon={<ArrowRight className="w-4 h-4" />}>
              {mode === 'login' ? 'Sign In' : 'Create Workspace'}
            </Button>
          </form>

          <p className="text-center text-xs text-white/25 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-primary-light hover:text-accent transition-colors"
            >
              {mode === 'login' ? 'Get started free' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Demo hint */}
        <p className="text-center text-xs text-white/20 mt-4">
          Demo: try <span className="text-white/35">demo@flowmesh.dev</span> / <span className="text-white/35">demo1234</span>
        </p>
      </motion.div>
    </div>
  );
}
