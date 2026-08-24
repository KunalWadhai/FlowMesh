import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Building2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { Button, Input } from '../ui';
import toast from 'react-hot-toast';

export type AuthMode = 'login' | 'register';

interface AuthCardProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

export function AuthCard({ mode, onModeChange }: AuthCardProps) {
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', workspaceName: '',
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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111116] p-6 shadow-xl shadow-black/20 sm:p-7">
        <div className="flex rounded-lg border border-white/8 bg-black/20 p-1">
          {(['login', 'register'] as AuthMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === m
                  ? 'bg-white text-black'
                  : 'text-white/45 hover:text-white/75'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <h2 className="mt-6 text-lg font-semibold text-white/90">
          {mode === 'login' ? 'Sign in to FlowMesh' : 'Create your workspace'}
        </h2>
        <p className="mt-2 mb-5 text-sm leading-6 text-white/45">
          {mode === 'login'
            ? 'Continue to your workspace and pick up where you left off.'
            : 'Create a workspace and start designing your first flow in minutes.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                key="register-fields"
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
            placeholder="you@company.com"
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
              className="absolute right-3 top-[38px] text-white/30 hover:text-white/60 transition-colors"
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="mt-2 w-full bg-primary hover:bg-primary-dark"
            size="lg"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            {mode === 'login' ? 'Sign In' : 'Create workspace'}
          </Button>
        </form>
    </div>
  );
}
