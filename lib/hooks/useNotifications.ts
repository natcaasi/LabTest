'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface NotificationTodo {
  id: number;
  title: string;
  due_date: string;
  reminder_minutes: number;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        setEnabled(true);
      }
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === 'granted') {
      setEnabled(true);
    }
  }, []);

  const checkNotifications = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch('/api/notifications/check');
      if (!res.ok) return;
      const todos: NotificationTodo[] = await res.json();
      for (const todo of todos) {
        new Notification('Todo Reminder', {
          body: `"${todo.title}" is due soon!`,
          icon: '/favicon.ico',
        });
      }
    } catch {
      // silently fail
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    checkNotifications();
    intervalRef.current = setInterval(checkNotifications, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, checkNotifications]);

  return { permission, enabled, requestPermission };
}
