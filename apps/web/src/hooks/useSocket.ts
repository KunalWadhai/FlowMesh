import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

let socketInstance: Socket | null = null;

function getSocket(): Socket | null {
  const { tokens, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !tokens?.accessToken) return null;

  if (!socketInstance || !socketInstance.connected) {
    socketInstance = io(
      import.meta.env.VITE_WS_URL ?? 'http://localhost:3001',
      {
        auth: { token: tokens.accessToken },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );
  }

  return socketInstance;
}

export function useSocket() {
  const { isAuthenticated, tokens } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !tokens?.accessToken) return;
    socketRef.current = getSocket();
  }, [isAuthenticated, tokens?.accessToken]);

  return socketRef.current;
}

export interface ExecutionEvent {
  executionId: string;
  workflowId: string;
  status?: string;
  durationMs?: number;
  error?: string;
  timestamp: string;
}

export interface StepEvent {
  executionId: string;
  nodeId: string;
  nodeName: string;
  status: string;
  output?: unknown;
  error?: string;
  durationMs?: number;
  timestamp: string;
}

interface ExecutionHandlers {
  onStarted?: (data: ExecutionEvent) => void;
  onStepStarted?: (data: StepEvent) => void;
  onStepCompleted?: (data: StepEvent) => void;
  onStepFailed?: (data: StepEvent) => void;
  onCompleted?: (data: ExecutionEvent) => void;
  onFailed?: (data: ExecutionEvent) => void;
  onCancelled?: (data: ExecutionEvent) => void;
}

export function useExecutionEvents(executionId: string | null, handlers: ExecutionHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!executionId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('execution:subscribe', executionId);

    const listeners: Array<[string, (data: unknown) => void]> = [
      ['execution:started',        (d) => handlersRef.current.onStarted?.(d as ExecutionEvent)],
      ['execution:step:started',   (d) => handlersRef.current.onStepStarted?.(d as StepEvent)],
      ['execution:step:completed', (d) => handlersRef.current.onStepCompleted?.(d as StepEvent)],
      ['execution:step:failed',    (d) => handlersRef.current.onStepFailed?.(d as StepEvent)],
      ['execution:completed',      (d) => handlersRef.current.onCompleted?.(d as ExecutionEvent)],
      ['execution:failed',         (d) => handlersRef.current.onFailed?.(d as ExecutionEvent)],
      ['execution:cancelled',      (d) => handlersRef.current.onCancelled?.(d as ExecutionEvent)],
    ];

    listeners.forEach(([event, fn]) => socket.on(event, fn));

    return () => {
      socket.emit('execution:unsubscribe', executionId);
      listeners.forEach(([event, fn]) => socket.off(event, fn));
    };
  }, [executionId]);
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
