'use client';

import { useEffect, useState } from 'react';
import { formatSGTime } from '../timezone';

interface NotificationTodo {
  id: number;
  title: string;
  due_date: string;
  reminder_minutes: number;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported && Notification.permission) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return false;

    const permission = await Notification.requestPermission();
    setPermission(permission);
    return permission === 'granted';
  };

  const checkAndNotify = async () => {
    if (permission !== 'granted' || !isSupported) return;

    try {
      const response = await fetch('/api/notifications/check');
      if (!response.ok) return;

      const todos: NotificationTodo[] = await response.json();

      for (const todo of todos) {
        new Notification(`Reminder: ${todo.title}`, {
          body: `Due: ${formatSGTime(todo.due_date, 'MMM d, HH:mm')}`,
          icon: '/favicon.ico',
          tag: `reminder-${todo.id}`,
          requireInteraction: false,
        });
      }
    } catch (error) {
      console.error('Notification check failed:', error);
    }
  };

  useEffect(() => {
    if (permission !== 'granted') return;

    const interval = setInterval(checkAndNotify, 30000);
    return () => clearInterval(interval);
  }, [permission, isSupported]);

  return {
    permission,
    isSupported,
    requestPermission,
    checkAndNotify,
  };
}
