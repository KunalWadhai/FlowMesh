import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, GitBranch, Zap, Settings, LogOut,
  ChevronLeft, ChevronRight, Sparkles, Activity, Menu, X
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../ui';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/workflows', icon: GitBranch, label: 'Workflows' },
  { to: '/activity', icon: Activity, label: 'Activity' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, workspace, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
    toast.success('Logged out');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 p-5 border-b border-white/5', collapsed && 'justify-center px-3')}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-glow-primary">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <span className="text-base font-semibold gradient-text whitespace-nowrap">FlowMesh</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Workspace */}
      {!collapsed && workspace && (
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl glass border border-white/5">
          <p className="text-xs text-white/35 font-medium uppercase tracking-wider mb-0.5">Workspace</p>
          <p className="text-sm text-white/80 font-medium truncate">{workspace.name}</p>
          <p className="text-xs text-primary/70 capitalize">{workspace.role?.toLowerCase()}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 mt-2 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-primary/15 text-primary-light border border-primary/20 shadow-glow-primary/50'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}

        <NavLink
          to="/ai"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mt-4',
              collapsed && 'justify-center px-2',
              isActive
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            )
          }
          title={collapsed ? 'AI Assistant' : undefined}
        >
          <Sparkles className="w-4 h-4 flex-shrink-0 text-accent" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                AI Assistant
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      </nav>

      {/* Footer */}
      <div className={cn('p-3 border-t border-white/5 space-y-1', collapsed && 'flex flex-col items-center')}>
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-danger/80 hover:bg-danger/5 transition-all duration-200',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Log out' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Log out</motion.span>}
          </AnimatePresence>
        </button>

        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-white/70 truncate">{user.name}</p>
              <p className="text-xs text-white/30 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-mesh">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="hidden md:flex flex-col flex-shrink-0 glass border-r border-white/5 relative z-20"
      >
        {sidebarContent}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full glass border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-all z-30"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-60 glass-elevated z-40 md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 glass">
          <button onClick={() => setMobileOpen(true)} className="text-white/60 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-semibold gradient-text">FlowMesh</span>
          </div>
          <div className="w-5" />
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
