'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import type { Todo, Tag, Template, Priority, RecurrencePattern, Subtask } from '@/lib/db';

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
const REMINDER_OPTIONS: { value: number; label: string; badge: string }[] = [
  { value: 15, label: '15 minutes before', badge: '15m' },
  { value: 30, label: '30 minutes before', badge: '30m' },
  { value: 60, label: '1 hour before', badge: '1h' },
  { value: 120, label: '2 hours before', badge: '2h' },
  { value: 1440, label: '1 day before', badge: '1d' },
  { value: 2880, label: '2 days before', badge: '2d' },
  { value: 10080, label: '1 week before', badge: '1w' },
];

function getReminderBadge(minutes: number | null): string {
  if (!minutes) return '';
  const opt = REMINDER_OPTIONS.find(o => o.value === minutes);
  return opt ? opt.badge : `${minutes}m`;
}

function getTimeDisplay(dueDate: string): { text: string; color: string } {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  const minutes = Math.round(diff / 60000);
  const hours = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);

  if (diff < 0) {
    const absDays = Math.abs(days);
    const absHours = Math.abs(hours);
    const absMins = Math.abs(minutes);
    if (absDays >= 1) return { text: `${absDays} day${absDays > 1 ? 's' : ''} overdue`, color: 'text-red-600' };
    if (absHours >= 1) return { text: `${absHours} hour${absHours > 1 ? 's' : ''} overdue`, color: 'text-red-600' };
    return { text: `${absMins} minute${absMins > 1 ? 's' : ''} overdue`, color: 'text-red-600' };
  }
  if (minutes < 60) return { text: `Due in ${minutes} min`, color: 'text-red-600' };
  if (hours < 24) return { text: `Due in ${hours}h`, color: 'text-orange-500' };
  if (days < 7) return { text: `Due in ${days}d`, color: 'text-yellow-600' };
  return { text: new Date(dueDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), color: 'text-blue-500' };
}

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [username, setUsername] = useState('');

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newRecurring, setNewRecurring] = useState(false);
  const [newPattern, setNewPattern] = useState<RecurrencePattern>('daily');
  const [newReminder, setNewReminder] = useState<number | ''>('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Edit modal
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editRecurring, setEditRecurring] = useState(false);
  const [editPattern, setEditPattern] = useState<RecurrencePattern>('daily');
  const [editReminder, setEditReminder] = useState<number | ''>('');
  const [editTagIds, setEditTagIds] = useState<number[]>([]);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [tagFilter, setTagFilter] = useState<number | ''>('');
  const [completionFilter, setCompletionFilter] = useState<'all' | 'incomplete' | 'completed'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Subtasks
  const [expandedTodos, setExpandedTodos] = useState<Set<number>>(new Set());
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<number, string>>({});

  // Tags modal
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  // Templates modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplateDesc, setEditTemplateDesc] = useState('');
  const [editTemplateCategory, setEditTemplateCategory] = useState('');
  const [editTemplatePriority, setEditTemplatePriority] = useState<Priority>('medium');

  // Saved filter presets
  const [savedPresets, setSavedPresets] = useState<Array<{name: string; searchQuery: string; priorityFilter: string; tagFilter: number | ''; completionFilter: string; dateFrom: string; dateTo: string}>>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Toast notification
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  const { permission, requestPermission } = useNotifications();

  // Data fetching
  const fetchTodos = useCallback(async () => {
    const res = await fetch('/api/todos');
    if (res.ok) setTodos(await res.json());
  }, []);

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/tags');
    if (res.ok) setTags(await res.json());
  }, []);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch('/api/templates');
    if (res.ok) setTemplates(await res.json());
  }, []);

  const fetchUser = useCallback(async () => {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      setUsername(data.username);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
    fetchTags();
    fetchTemplates();
    fetchUser();
    try {
      const stored = localStorage.getItem('filterPresets');
      if (stored) setSavedPresets(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [fetchTodos, fetchTags, fetchTemplates, fetchUser]);

  // Compute minimum datetime string (1 minute from now) for date inputs
  function getMinDateTime(): string {
    const now = new Date(Date.now() + 60000);
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d}T${h}:${mi}`;
  }

  // --- Create Todo ---
  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (newDueDate) {
      const due = new Date(newDueDate);
      const minTime = Date.now() + 60000;
      if (due.getTime() < minTime) {
        showToast('Due date must be at least 1 minute in the future');
        return;
      }
    }

    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        due_date: newDueDate || null,
        priority: newPriority,
        is_recurring: newRecurring,
        recurrence_pattern: newRecurring ? newPattern : null,
        reminder_minutes: newReminder || null,
        tag_ids: selectedTagIds,
      }),
    });

    setNewTitle('');
    setNewDueDate('');
    setNewPriority('medium');
    setNewRecurring(false);
    setNewPattern('daily');
    setNewReminder('');
    setSelectedTagIds([]);
    fetchTodos();
  }

  // --- Toggle completion ---
  async function toggleComplete(todo: Todo) {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: todo.completed ? 0 : 1 }),
    });
    fetchTodos();
  }

  // --- Delete Todo ---
  async function deleteTodo(id: number) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    fetchTodos();
  }

  // --- Edit Todo ---
  function openEdit(todo: Todo) {
    setEditingTodo(todo);
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
    setEditDueDate(todo.due_date || '');
    setEditRecurring(!!todo.is_recurring);
    setEditPattern((todo.recurrence_pattern as RecurrencePattern) || 'daily');
    setEditReminder(todo.reminder_minutes || '');
    setEditTagIds(todo.tags?.map(t => t.id) || []);
  }

  async function handleEditSave() {
    if (!editingTodo) return;

    if (editDueDate) {
      const due = new Date(editDueDate);
      const minTime = Date.now() + 60000;
      if (due.getTime() < minTime) {
        showToast('Due date must be at least 1 minute in the future');
        return;
      }
    }

    await fetch(`/api/todos/${editingTodo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle.trim(),
        due_date: editDueDate || null,
        priority: editPriority,
        is_recurring: editRecurring,
        recurrence_pattern: editRecurring ? editPattern : null,
        reminder_minutes: editReminder || null,
        tag_ids: editTagIds,
      }),
    });
    setEditingTodo(null);
    fetchTodos();
  }

  // --- Subtasks ---
  async function addSubtask(todoId: number) {
    const title = newSubtaskTitles[todoId]?.trim();
    if (!title) return;
    await fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setNewSubtaskTitles({ ...newSubtaskTitles, [todoId]: '' });
    fetchTodos();
  }

  async function toggleSubtask(subtask: Subtask) {
    await fetch(`/api/subtasks/${subtask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: subtask.completed ? 0 : 1 }),
    });
    fetchTodos();
  }

  async function deleteSubtask(id: number) {
    await fetch(`/api/subtasks/${id}`, { method: 'DELETE' });
    fetchTodos();
  }

  // --- Tags CRUD ---
  async function createTag() {
    if (!newTagName.trim()) return;
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    setNewTagName('');
    setNewTagColor('#3B82F6');
    fetchTags();
  }

  async function updateTag() {
    if (!editingTag) return;
    await fetch(`/api/tags/${editingTag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editTagName.trim(), color: editTagColor }),
    });
    setEditingTag(null);
    fetchTags();
    fetchTodos();
  }

  async function deleteTag(id: number) {
    await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    fetchTags();
    fetchTodos();
  }

  // --- Templates ---
  async function saveTemplate() {
    if (!templateName.trim() || !newTitle.trim()) return;
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateName.trim(),
        description: templateDesc || null,
        category: templateCategory || null,
        title_template: newTitle.trim(),
        priority: newPriority,
        is_recurring: newRecurring,
        recurrence_pattern: newRecurring ? newPattern : null,
        reminder_minutes: newReminder || null,
      }),
    });
    setShowSaveTemplateModal(false);
    setTemplateName('');
    setTemplateDesc('');
    setTemplateCategory('');
    fetchTemplates();
  }

  async function useTemplate(templateId: number) {
    const res = await fetch(`/api/templates/${templateId}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setShowTemplateModal(false);
    if (res.ok) {
      showToast('Todo created from template!');
    }
    fetchTodos();
  }

  function openEditTemplate(t: Template) {
    setEditingTemplate(t);
    setEditTemplateName(t.name);
    setEditTemplateDesc(t.description || '');
    setEditTemplateCategory(t.category || '');
    setEditTemplatePriority(t.priority);
  }

  async function handleEditTemplateSave() {
    if (!editingTemplate || !editTemplateName.trim()) return;
    await fetch(`/api/templates/${editingTemplate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editTemplateName.trim(),
        description: editTemplateDesc || null,
        category: editTemplateCategory || null,
        priority: editTemplatePriority,
      }),
    });
    setEditingTemplate(null);
    fetchTemplates();
  }

  async function deleteTemplate(id: number) {
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    fetchTemplates();
  }

  // --- Export / Import ---
  async function exportJSON() {
    const res = await fetch('/api/todos/export?format=json');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportCSV() {
    const res = await fetch('/api/todos/export?format=csv');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importTodos(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        alert(result.message);
        fetchTodos();
      } else {
        alert('Failed to import todos. Please check the file format.');
      }
    } catch {
      alert('Invalid JSON format');
    }
  }

  // --- Filter presets ---
  function savePreset() {
    if (!presetName.trim()) return;
    const preset = { name: presetName.trim(), searchQuery, priorityFilter, tagFilter, completionFilter, dateFrom, dateTo };
    const updated = [...savedPresets, preset];
    setSavedPresets(updated);
    localStorage.setItem('filterPresets', JSON.stringify(updated));
    setShowSavePreset(false);
    setPresetName('');
  }

  function applyPreset(preset: typeof savedPresets[0]) {
    setSearchQuery(preset.searchQuery);
    setPriorityFilter(preset.priorityFilter as Priority | '');
    setTagFilter(preset.tagFilter);
    setCompletionFilter(preset.completionFilter as typeof completionFilter);
    setDateFrom(preset.dateFrom);
    setDateTo(preset.dateTo);
  }

  function deletePreset(name: string) {
    const updated = savedPresets.filter(p => p.name !== name);
    setSavedPresets(updated);
    localStorage.setItem('filterPresets', JSON.stringify(updated));
  }

  function clearAllFilters() {
    setSearchQuery('');
    setPriorityFilter('');
    setTagFilter('');
    setCompletionFilter('all');
    setDateFrom('');
    setDateTo('');
  }

  const hasActiveFilters = searchQuery || priorityFilter || tagFilter || completionFilter !== 'all' || dateFrom || dateTo;

  // --- Logout ---
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  // --- Filtering & Sorting ---
  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = todo.title.toLowerCase().includes(q);
        const subtaskMatch = todo.subtasks?.some(s => s.title.toLowerCase().includes(q));
        const tagMatch = todo.tags?.some(t => t.name.toLowerCase().includes(q));
        if (!titleMatch && !subtaskMatch && !tagMatch) return false;
      }
      if (priorityFilter && todo.priority !== priorityFilter) return false;
      if (tagFilter && !todo.tags?.some(t => t.id === tagFilter)) return false;
      if (completionFilter === 'incomplete' && todo.completed) return false;
      if (completionFilter === 'completed' && !todo.completed) return false;
      if (dateFrom && todo.due_date && new Date(todo.due_date) < new Date(dateFrom)) return false;
      if (dateTo && todo.due_date && new Date(todo.due_date) > new Date(dateTo + 'T23:59:59')) return false;
      if ((dateFrom || dateTo) && !todo.due_date) return false;
      return true;
    });
  }, [todos, searchQuery, priorityFilter, tagFilter, completionFilter, dateFrom, dateTo]);

  const sortTodos = (todoList: Todo[]) =>
    [...todoList].sort((a, b) => {
      const pw = (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
      if (pw !== 0) return pw;
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const now = new Date();
  const overdueTodos = sortTodos(filteredTodos.filter(t => !t.completed && t.due_date && new Date(t.due_date) < now));
  const pendingTodos = sortTodos(filteredTodos.filter(t => !t.completed && (!t.due_date || new Date(t.due_date) >= now)));
  const completedTodos = filteredTodos.filter(t => t.completed).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  function getSubtaskProgress(todo: Todo): { completed: number; total: number; percent: number } {
    const subtasks = todo.subtasks || [];
    if (subtasks.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = subtasks.filter(s => s.completed).length;
    return { completed, total: subtasks.length, percent: Math.round((completed / subtasks.length) * 100) };
  }

  // --- Tag toggle helpers ---
  function toggleTagSelection(tagId: number, current: number[], setter: (ids: number[]) => void) {
    if (current.includes(tagId)) {
      setter(current.filter(id => id !== tagId));
    } else {
      setter([...current, tagId]);
    }
  }

  // --- Render Todo Item ---
  function renderTodo(todo: Todo) {
    const isExpanded = expandedTodos.has(todo.id);
    const progress = getSubtaskProgress(todo);
    const priorityColors: Record<Priority, string> = {
      high: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    };

    return (
      <div key={todo.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={!!todo.completed}
            onChange={() => toggleComplete(todo)}
            className="mt-1 h-5 w-5 rounded border-gray-300 cursor-pointer accent-blue-500"
            aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-medium ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                {todo.title}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[todo.priority]}`}>
                {todo.priority}
              </span>
              {todo.is_recurring && todo.recurrence_pattern && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                  🔄 {todo.recurrence_pattern}
                </span>
              )}
              {todo.reminder_minutes && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                  🔔 {getReminderBadge(todo.reminder_minutes)}
                </span>
              )}
              {todo.tags?.map(tag => (
                <span
                  key={tag.id}
                  className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>

            {todo.due_date && !todo.completed && (
              <p className={`text-sm mt-1 ${getTimeDisplay(todo.due_date).color}`}>
                {getTimeDisplay(todo.due_date).text}
              </p>
            )}

            {progress.total > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{progress.completed}/{progress.total} subtasks</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${progress.percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const next = new Set(expandedTodos);
                if (isExpanded) next.delete(todo.id);
                else next.add(todo.id);
                setExpandedTodos(next);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {isExpanded ? '▼ Subtasks' : '▶ Subtasks'}
            </button>
            <button
              onClick={() => openEdit(todo)}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Edit
            </button>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
            >
              Delete
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 ml-8 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
            {todo.subtasks?.map(sub => (
              <div key={sub.id} className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={!!sub.completed}
                  onChange={() => toggleSubtask(sub)}
                  className="h-4 w-4 rounded accent-blue-500"
                  aria-label={`Mark subtask "${sub.title}" as ${sub.completed ? 'incomplete' : 'complete'}`}
                />
                <span className={`flex-1 text-sm ${sub.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {sub.title}
                </span>
                <button onClick={() => deleteSubtask(sub.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newSubtaskTitles[todo.id] || ''}
                onChange={e => setNewSubtaskTitles({ ...newSubtaskTitles, [todo.id]: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') addSubtask(todo.id); }}
                placeholder="Add subtask..."
                className="flex-1 text-sm p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button onClick={() => addSubtask(todo.id)} className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Add</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Render Section ---
  function renderSection(title: string, todoList: Todo[], bgClass: string, icon?: string) {
    if (todoList.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className={`text-lg font-bold mb-3 px-3 py-2 rounded-lg ${bgClass}`}>
          {icon && <span className="mr-2">{icon}</span>}
          {title} ({todoList.length})
        </h2>
        <div className="space-y-3">
          {todoList.map(renderTodo)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Todo App</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {permission !== 'granted' ? (
              <button onClick={requestPermission} className="text-sm bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600">
                🔔 Enable Notifications
              </button>
            ) : (
              <span className="text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-3 py-1.5 rounded-lg">
                🔔 Notifications On
              </span>
            )}

            <button onClick={exportJSON} className="text-sm bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600">Export JSON</button>
            <button onClick={exportCSV} className="text-sm bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800">Export CSV</button>
            <label className="text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 cursor-pointer">
              Import
              <input type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importTodos(f); e.target.value = ''; }} />
            </label>

            <button onClick={() => setShowTemplateModal(true)} className="text-sm bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600">📋 Templates</button>
            <a href="/calendar" className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700">Calendar</a>
            <span className="text-sm text-gray-600 dark:text-gray-400">{username}</span>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 dark:text-red-400">Logout</button>
          </div>
        </div>

        {/* Add Todo Form */}
        <form onSubmit={handleAddTodo} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium">Add</button>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <input type="datetime-local" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} min={getMinDateTime()} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />

            <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={newRecurring} onChange={e => setNewRecurring(e.target.checked)} className="accent-purple-500" />
              Repeat
            </label>
            {newRecurring && (
              <select value={newPattern} onChange={e => setNewPattern(e.target.value as RecurrencePattern)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            )}

            <select
              value={newReminder}
              onChange={e => setNewReminder(e.target.value ? parseInt(e.target.value) : '')}
              disabled={!newDueDate}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50"
            >
              <option value="">No reminder</option>
              {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {newTitle.trim() && (
              <button type="button" onClick={() => setShowSaveTemplateModal(true)} className="text-sm text-green-600 hover:text-green-800 dark:text-green-400">💾 Save as Template</button>
            )}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTagSelection(tag.id, selectedTagIds, setSelectedTagIds)}
                  className={`text-xs px-3 py-1 rounded-full border-2 transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? 'text-white border-transparent'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                  style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                >
                  {selectedTagIds.includes(tag.id) && '✓ '}{tag.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-4">
            <button type="button" onClick={() => setShowTagModal(true)} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">+ Manage Tags</button>

            {templates.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">📋 Use Template:</span>
                <select
                  value=""
                  onChange={e => { if (e.target.value) useTemplate(parseInt(e.target.value)); }}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.priority})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </form>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="relative mb-3">
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search todos and subtasks..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">✕</button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | '')} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {tags.length > 0 && (
              <select value={tagFilter} onChange={e => setTagFilter(e.target.value ? parseInt(e.target.value) : '')} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">All Tags</option>
                {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}

            <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              {showAdvanced ? '▼ Advanced' : '▶ Advanced'}
            </button>

            {hasActiveFilters && (
              <>
                <button onClick={clearAllFilters} className="text-sm text-red-600 hover:text-red-800">Clear All</button>
                <button onClick={() => setShowSavePreset(true)} className="text-sm text-green-600 hover:text-green-800">💾 Save Filter</button>
              </>
            )}
          </div>

          {showAdvanced && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
              <div className="flex flex-wrap gap-3">
                <select value={completionFilter} onChange={e => setCompletionFilter(e.target.value as typeof completionFilter)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="all">All Todos</option>
                  <option value="incomplete">Incomplete Only</option>
                  <option value="completed">Completed Only</option>
                </select>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="From" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="To" />
              </div>

              {savedPresets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 self-center">Presets:</span>
                  {savedPresets.map(p => (
                    <div key={p.name} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 rounded-full px-3 py-1">
                      <button onClick={() => applyPreset(p)} className="text-xs text-blue-700 dark:text-blue-300">{p.name}</button>
                      <button onClick={() => deletePreset(p.name)} className="text-xs text-blue-400 hover:text-blue-600">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Todo Sections */}
        {renderSection('Overdue', overdueTodos, 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200', '⚠️')}
        {renderSection('Pending', pendingTodos, 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200')}
        {renderSection('Completed', completedTodos, 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200', '✓')}

        {filteredTodos.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {hasActiveFilters ? 'No todos match your filters' : 'No todos yet. Add one above!'}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTodo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEditingTodo(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Edit Todo</h3>

            <div className="space-y-3">
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Title" />

              <div className="flex gap-3">
                <input type="datetime-local" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} min={getMinDateTime()} className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                <select value={editPriority} onChange={e => setEditPriority(e.target.value as Priority)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex gap-3 items-center">
                <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={editRecurring} onChange={e => setEditRecurring(e.target.checked)} />
                  Repeat
                </label>
                {editRecurring && (
                  <select value={editPattern} onChange={e => setEditPattern(e.target.value as RecurrencePattern)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                )}
              </div>

              <select value={editReminder} onChange={e => setEditReminder(e.target.value ? parseInt(e.target.value) : '')} disabled={!editDueDate} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50">
                <option value="">No reminder</option>
                {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagSelection(tag.id, editTagIds, setEditTagIds)}
                      className={`text-xs px-3 py-1 rounded-full border-2 transition-colors ${
                        editTagIds.includes(tag.id) ? 'text-white border-transparent' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                      style={editTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                    >
                      {editTagIds.includes(tag.id) && '✓ '}{tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingTodo(null)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800">Cancel</button>
              <button onClick={handleEditSave} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Management Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowTagModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Manage Tags</h3>

            <div className="flex gap-2 mb-4">
              <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Tag name" className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className="w-10 h-10 p-1 border border-gray-300 dark:border-gray-600 rounded cursor-pointer" />
              <button onClick={createTag} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">Create Tag</button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {editingTag?.id === tag.id ? (
                    <>
                      <input value={editTagName} onChange={e => setEditTagName(e.target.value)} className="flex-1 p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      <input type="color" value={editTagColor} onChange={e => setEditTagColor(e.target.value)} className="w-8 h-8 p-0.5 border border-gray-300 dark:border-gray-600 rounded cursor-pointer" />
                      <button onClick={updateTag} className="text-sm text-green-600 hover:text-green-800">Save</button>
                      <button onClick={() => setEditingTag(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs px-2 py-1 rounded-full text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                      <div className="flex-1" />
                      <button onClick={() => { setEditingTag(tag); setEditTagName(tag.name); setEditTagColor(tag.color); }} className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
                      <button onClick={() => deleteTag(tag.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                    </>
                  )}
                </div>
              ))}
              {tags.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No tags yet</p>}
            </div>

            <div className="mt-4 text-right">
              <button onClick={() => setShowTagModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">📋 Templates</h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {templates.map(t => (
                <div key={t.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{t.name}</p>
                      {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                      <div className="flex gap-1 mt-1">
                        {t.category && <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">{t.category}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded ${t.priority === 'high' ? 'bg-red-100 text-red-700' : t.priority === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.priority}</span>
                        {t.is_recurring && <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">🔄 {t.recurrence_pattern}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => useTemplate(t.id)} className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">Use</button>
                      <button onClick={() => openEditTemplate(t)} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">Edit</button>
                      <button onClick={() => deleteTemplate(t.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {editingTemplate?.id === t.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
                      <input value={editTemplateName} onChange={e => setEditTemplateName(e.target.value)} placeholder="Template name" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      <input value={editTemplateDesc} onChange={e => setEditTemplateDesc(e.target.value)} placeholder="Description (optional)" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      <div className="flex gap-2">
                        <input value={editTemplateCategory} onChange={e => setEditTemplateCategory(e.target.value)} placeholder="Category (optional)" className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        <select value={editTemplatePriority} onChange={e => setEditTemplatePriority(e.target.value as Priority)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingTemplate(null)} className="text-sm px-3 py-1 text-gray-600 dark:text-gray-400">Cancel</button>
                        <button onClick={handleEditTemplateSave} className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Save</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {templates.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No templates yet. Create one using the save button in the form.</p>}
            </div>

            <div className="mt-4 text-right">
              <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowSaveTemplateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">💾 Save as Template</h3>
            <div className="space-y-3">
              <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <input value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} placeholder="Description (optional)" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <input value={templateCategory} onChange={e => setTemplateCategory(e.target.value)} placeholder="Category (optional)" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowSaveTemplateModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={saveTemplate} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Save Template</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* Save Preset Modal */}
      {showSavePreset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowSavePreset(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">💾 Save Filter Preset</h3>
            <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Preset name" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSavePreset(false)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button onClick={savePreset} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
