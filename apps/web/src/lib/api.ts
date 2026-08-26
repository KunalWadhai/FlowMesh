import axios from 'axios';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — inject auth token
api.interceptors.request.use((config) => {
  // Token is injected via auth store — no-op here
  return config;
});

// Response interceptor — handle 401 token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Dynamically import to avoid circular deps
        const { useAuthStore } = await import('../stores/auth.store');
        const { tokens, setTokens, clear } = useAuthStore.getState();

        if (!tokens?.refreshToken) {
          clear();
          window.location.href = '/auth';
          return Promise.reject(error);
        }

        const { data } = await axios.post<{ data: { tokens: AuthTokens } }>(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken: tokens.refreshToken }
        );

        const newTokens = data.data.tokens;
        setTokens(newTokens);
        originalRequest.headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
        return api(originalRequest);
      } catch {
        const { useAuthStore } = await import('../stores/auth.store');
        useAuthStore.getState().clear();
        window.location.href = '/auth';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
