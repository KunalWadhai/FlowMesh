import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-transparent';

    const variants = {
      primary: 'bg-primary hover:bg-primary-light text-white shadow-glow-primary hover:shadow-glow-primary focus:ring-primary/50 active:scale-[0.97]',
      secondary: 'glass border border-white/10 text-white/80 hover:text-white hover:border-white/20 focus:ring-white/20',
      ghost: 'text-white/60 hover:text-white hover:bg-white/5 focus:ring-white/10',
      danger: 'bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 focus:ring-danger/30',
      success: 'bg-success/20 hover:bg-success/30 text-success border border-success/30 focus:ring-success/30',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  const variants = {
    default: 'bg-white/8 text-white/60 border-white/10',
    primary: 'bg-primary/15 text-primary-light border-primary/25',
    success: 'bg-success/15 text-success border-success/25',
    warning: 'bg-warning/15 text-warning border-warning/25',
    danger: 'bg-danger/15 text-danger border-danger/25',
    accent: 'bg-accent/15 text-accent border-accent/25',
  };

  const dotColors = {
    default: 'bg-white/40',
    primary: 'bg-primary-light',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    accent: 'bg-accent',
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', variants[variant], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  glow?: 'primary' | 'accent' | 'success' | 'danger';
}

export function Card({ className, elevated, glow, children, ...props }: CardProps) {
  const glowMap = {
    primary: 'shadow-glow-primary',
    accent: 'shadow-glow-accent',
    success: 'shadow-glow-success',
    danger: 'shadow-glow-danger',
  };

  return (
    <div
      className={cn(
        elevated ? 'glass-elevated' : 'glass-card',
        'p-5',
        glow && glowMap[glow],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-medium text-white/70">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-10 rounded-xl px-3 py-2 text-sm glass border border-white/8 text-white placeholder:text-white/25',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
            'transition-all duration-150',
            icon && 'pl-9',
            error && 'border-danger/50 focus:ring-danger/30',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-white/35">{hint}</p>}
    </div>
  )
);
Input.displayName = 'Input';

// ─── Textarea ─────────────────────────────────────────────────────────────────

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ className, label, error, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-medium text-white/70">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-xl px-3 py-2 text-sm glass border border-white/8 text-white placeholder:text-white/25 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
          'transition-all duration-150',
          error && 'border-danger/50',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return <Loader2 className={cn('animate-spin text-primary', sizes[size], className)} />;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center text-white/20">
        {icon}
      </div>
      <div>
        <p className="text-white/60 font-medium">{title}</p>
        {description && <p className="text-sm text-white/30 mt-1 max-w-xs">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { variant: BadgeProps['variant']; label: string }> = {
  QUEUED: { variant: 'default', label: 'Queued' },
  RUNNING: { variant: 'accent', label: 'Running' },
  SUCCEEDED: { variant: 'success', label: 'Succeeded' },
  FAILED: { variant: 'danger', label: 'Failed' },
  CANCELLED: { variant: 'default', label: 'Cancelled' },
  DRAFT: { variant: 'default', label: 'Draft' },
  ACTIVE: { variant: 'success', label: 'Active' },
  PAUSED: { variant: 'warning', label: 'Paused' },
  ARCHIVED: { variant: 'default', label: 'Archived' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { variant: 'default', label: status };
  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}
