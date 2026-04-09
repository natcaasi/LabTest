'use client';

import { useEffect, useState } from 'react';

interface TodoFormProps {
  onSuccess: () => void;
}

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface Template {
  id: number;
  name: string;
  category?: string;
  title: string;
  priority: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  reminder_minutes?: number;
}

const categories = ['Work', 'Personal', 'Health', 'Shopping', 'Other'] as const;

export default function TodoForm({ onSuccess }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [due_date, setDueDate] = useState('');
  const [is_recurring, setIsRecurring] = useState(false);
  const [recurrence_pattern, setRecurrencePattern] = useState('daily');
  const [reminder_minutes, setReminderMinutes] = useState(0);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Work');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Tag[]) => setAvailableTags(Array.isArray(data) ? data : []))
      .catch(() => setAvailableTags([]));

    fetch('/api/templates')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Template[]) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]));
  }, []);

  const applyTemplate = (templateId: string) => {
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === Number(templateId));
    if (!tpl) return;
    setTitle(tpl.title);
    setPriority(tpl.priority || 'medium');
    setIsRecurring(!!tpl.is_recurring);
    setRecurrencePattern(tpl.recurrence_pattern || 'daily');
    setReminderMinutes(tpl.reminder_minutes || 0);
  };

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          due_date: due_date || undefined,
          is_recurring,
          recurrence_pattern: is_recurring ? recurrence_pattern : undefined,
          reminder_minutes: reminder_minutes > 0 ? reminder_minutes : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create todo');
      }

      const created = await response.json();

      if (selectedTagIds.length > 0 && created?.id) {
        await fetch(`/api/todos/${created.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_ids: selectedTagIds }),
        });
      }

      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setIsRecurring(false);
      setRecurrencePattern('daily');
      setReminderMinutes(0);
      setSelectedTagIds([]);

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todo');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;

    setSavingTemplate(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim(),
          category: templateCategory,
          title,
          priority,
          is_recurring,
          recurrence_pattern: is_recurring ? recurrence_pattern : undefined,
          reminder_minutes: reminder_minutes > 0 ? reminder_minutes : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      setShowTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateCategory('Work');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {templates.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Use a Template
          </label>
          <select
            defaultValue=""
            onChange={(e) => applyTemplate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={loading}
          >
            <option value="">— Select a template —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{t.category ? ` (${t.category})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
          disabled={loading}
          placeholder="What needs to be done?"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={loading}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Due Date
          </label>
          <input
            type="datetime-local"
            value={due_date}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reminder
          </label>
          <select
            value={reminder_minutes}
            onChange={(e) => setReminderMinutes(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={loading || !due_date}
          >
            <option value={0}>None</option>
            <option value={15}>15 min before</option>
            <option value={30}>30 min before</option>
            <option value={60}>1 hour before</option>
            <option value={120}>2 hours before</option>
            <option value={1440}>1 day before</option>
            <option value={2880}>2 days before</option>
            <option value={10080}>1 week before</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={is_recurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            disabled={loading}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recurring</span>
        </label>

        {is_recurring && (
          <select
            value={recurrence_pattern}
            onChange={(e) => setRecurrencePattern(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={loading}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tags
        </label>
        {availableTags.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tags yet. Create some in the Tags manager.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  disabled={loading}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    selected
                      ? 'text-white border-transparent'
                      : 'text-gray-700 dark:text-gray-200 bg-transparent'
                  }`}
                  style={
                    selected
                      ? { backgroundColor: tag.color }
                      : { borderColor: tag.color }
                  }
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !title}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Todo'}
        </button>

        {title && (
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            💾 Save as Template
          </button>
        )}
      </div>

      {showTemplateModal && (
        <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Save as Template</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Weekly Review"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {savingTemplate ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="flex-1 px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
