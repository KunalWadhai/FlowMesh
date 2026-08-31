import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, workspaceName: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (tokens: AuthTokens) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      workspace: null,
      tokens: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post<{
          data: { user: User; workspace: Workspace; tokens: AuthTokens };
        }>('/auth/login', { email, password });

        const { user, workspace, tokens } = data.data;
        set({ user, workspace, tokens, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
      },

      register: async (name, email, password, workspaceName) => {
        const { data } = await api.post<{
          data: { user: User; tokens: AuthTokens };
        }>('/auth/register', { name, email, password, workspaceName });

        // After registration, login automatically
        await get().login(email, password);
      },

      logout: async () => {
        const { tokens } = get();
        try {
          if (tokens?.refreshToken) {
            await api.post('/auth/logout', { refreshToken: tokens.refreshToken });
          }
        } catch { /* ignore */ }
        get().clear();
      },

      setTokens: (tokens) => {
        set({ tokens });
        api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
      },

      clear: () => {
        set({ user: null, workspace: null, tokens: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },
    }),
    {
      name: 'flowmesh-auth',
      partialize: (state) => ({
        user: state.user,
        workspace: state.workspace,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore the Authorization header when the store is hydrated from localStorage
        if (state?.tokens?.accessToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.tokens.accessToken}`;
        }
      },
    }
  )
);
