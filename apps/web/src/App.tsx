import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth.store';
import api from './lib/api';
import { AppLayout } from './components/layout/AppLayout';
import HomePage from './pages/Home';
import AuthPage from './pages/Auth';
import DashboardPage from './pages/Dashboard';
import WorkflowsPage from './pages/Workflows';
import WorkflowEditorPage from './pages/WorkflowEditor';
import ActivityPage from './pages/Activity';
import AIAssistantPage from './pages/AIAssistant';

// Inject auth token into axios on app load
function useAuthInit() {
  const { tokens, isAuthenticated } = useAuthStore();
  useEffect(() => {
    if (isAuthenticated && tokens?.accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
  }, [isAuthenticated, tokens]);
}

function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();
  useAuthInit();
  return isAuthenticated ? (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ) : (
    <Navigate to="/auth" replace />
  );
}

function PublicRoute() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
        </Route>

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workflows" element={<WorkflowsPage />} />
          <Route path="/workflows/:id" element={<WorkflowEditorPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/ai" element={<AIAssistantPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'rgba(16, 16, 42, 0.95)',
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '13px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          },
          success: {
            iconTheme: { primary: '#00e5a0', secondary: 'rgba(16,16,42,0.95)' },
          },
          error: {
            iconTheme: { primary: '#ff4d6d', secondary: 'rgba(16,16,42,0.95)' },
          },
        }}
      />
    </BrowserRouter>
  );
}
