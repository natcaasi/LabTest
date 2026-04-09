'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TodoList from '@/components/TodoList';
import TodoForm from '@/components/TodoForm';
import SearchBar from '@/components/SearchBar';
import TagManager from '@/components/TagManager';
import TemplateManager from '@/components/TemplateManager';
import { useNotifications } from '@/lib/hooks/useNotifications';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface Todo {
  id: number;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  completed: boolean;
  is_recurring: boolean;
  recurrence_pattern?: string;
  reminder_minutes?: number;
  tags?: Tag[];
}

export default function Home() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { permission, isSupported, requestPermission } = useNotifications();

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      }
    };

    checkAuth();

    const savedDarkMode = localStorage.getItem('dark_mode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, [router]);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) throw new Error('Failed to fetch todos');
      const data = await response.json();
      setTodos(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('dark_mode', newMode.toString());
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleExportJSON = async () => {
    try {
      const response = await fetch('/api/todos/export');
      if (!response.ok) throw new Error('Export failed');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/todos/export-csv');
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todos-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV export error:', error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Import failed');
      fetchTodos();
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Todo App</h1>
          <div className="flex gap-2 flex-wrap">
            {isSupported && permission !== 'granted' && (
              <button
                onClick={handleEnableNotifications}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Enable Notifications
              </button>
            )}
            {isSupported && permission === 'granted' && (
              <button
                disabled
                className="px-4 py-2 bg-green-600 text-white rounded-lg opacity-75 cursor-default text-sm"
              >
                ✓ Notifications Enabled
              </button>
            )}
            <a
              href="/calendar"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              Calendar
            </a>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm"
            >
              Export JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm"
            >
              Export CSV
            </button>
            <label className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm cursor-pointer">
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowTemplateManager(!showTemplateManager)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Templates
            </button>
            <button
              onClick={() => setShowTagManager(!showTagManager)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              Tags
            </button>
            <button
              onClick={toggleDarkMode}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {showTagManager && <TagManager onClose={() => setShowTagManager(false)} />}
        {showTemplateManager && (
          <TemplateManager
            onClose={() => setShowTemplateManager(false)}
            onTodoAdded={() => { fetchTodos(); setShowTemplateManager(false); }}
          />
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <TodoForm onSuccess={fetchTodos} />
        </div>

        <SearchBar
          onSearch={setSearchQuery}
          onPriorityChange={setPriorityFilter}
          onTagChange={setTagFilter}
        />

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Loading todos...</p>
          </div>
        ) : (
          <TodoList
            todos={todos}
            searchQuery={searchQuery}
            priorityFilter={priorityFilter}
            tagFilter={tagFilter}
            onTodoUpdate={fetchTodos}
          />
        )}
      </main>
    </div>
  );
}
