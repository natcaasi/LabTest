'use client';

import { useState, useEffect } from 'react';
import { formatSGDate, getRelativeDueLabel } from '@/lib/timezone';
import { calculateProgress } from '@/lib/progress';
import ProgressBar from './ProgressBar';

interface Subtask {
  id: number;
  title: string;
  completed: number | boolean;
}

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
  subtasks?: Subtask[];
}

interface TodoItemProps {
  todo: Todo;
  onUpdate: () => void;
  searchQuery?: string;
}

const priorityColors = {
  high: 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100',
  medium: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100',
  low: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
};

export default function TodoItem({ todo, onUpdate, searchQuery = '' }: TodoItemProps) {
  const [loading, setLoading] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description || '');
  const [editPriority, setEditPriority] = useState(todo.priority);
  const [editDueDate, setEditDueDate] = useState(todo.due_date || '');
  const [editIsRecurring, setEditIsRecurring] = useState(todo.is_recurring);
  const [editRecurrencePattern, setEditRecurrencePattern] = useState(todo.recurrence_pattern || 'daily');
  const [editReminderMinutes, setEditReminderMinutes] = useState(todo.reminder_minutes || 0);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [editSelectedTags, setEditSelectedTags] = useState<number[]>(todo.tags?.map((t) => t.id) || []);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (showSubtasks && subtasks.length === 0) {
      fetchSubtasks();
    }
  }, [showSubtasks, subtasks.length]);

  useEffect(() => {
    // Fetch subtasks on mount to check if any exist
    const checkSubtasks = async () => {
      try {
        const response = await fetch(`/api/todos/${todo.id}/subtasks`);
        if (response.ok) {
          const data = await response.json();
          setSubtasks(data);
        }
      } catch (error) {
        console.error('Failed to fetch subtasks:', error);
      }
    };
    checkSubtasks();
  }, [todo.id]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };
    if (isEditing) {
      fetchTags();
    }
  }, [isEditing]);

  const fetchSubtasks = async () => {
    setLoadingSubtasks(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}/subtasks`);
      if (response.ok) {
        const data = await response.json();
        setSubtasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch subtasks:', error);
    } finally {
      setLoadingSubtasks(false);
    }
  };

  const handleSubtaskToggle = async (subtaskId: number, currentCompleted: number | boolean) => {
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted }),
      });

      if (response.ok) {
        setSubtasks((prev) =>
          prev.map((s) =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to update subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      }
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    setAddingSubtask(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });

      if (response.ok) {
        const created = await response.json();
        setSubtasks((prev) => [...prev, created]);
        setNewSubtaskTitle('');
      }
    } catch (error) {
      console.error('Failed to add subtask:', error);
    } finally {
      setAddingSubtask(false);
    }
  };

  const progress = calculateProgress(subtasks);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          priority: editPriority,
          due_date: editDueDate || undefined,
          is_recurring: editIsRecurring,
          recurrence_pattern: editIsRecurring ? editRecurrencePattern : undefined,
          reminder_minutes: editReminderMinutes > 0 ? editReminderMinutes : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update todo');

      const currentTagIds = todo.tags?.map((t) => t.id) || [];
      const tagsToRemove = currentTagIds.filter((id) => !editSelectedTags.includes(id));
      const tagsToAdd = editSelectedTags.filter((id) => !currentTagIds.includes(id));

      if (tagsToRemove.length > 0) {
        await fetch(`/api/todos/${todo.id}/tags`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_ids: tagsToRemove }),
        });
      }

      if (tagsToAdd.length > 0) {
        await fetch(`/api/todos/${todo.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_ids: tagsToAdd }),
        });
      }

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to save edit:', error);
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleEditTag = (tagId: number) => {
    setEditSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  if (isEditing) {
    return (
      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <input
            type="text"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reminder
            </label>
            <select
              value={editReminderMinutes}
              onChange={(e) => setEditReminderMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              disabled={!editDueDate}
            >
              <option value={0}>None</option>
              <option value={15}>15 min before</option>
              <option value={30}>30 min before</option>
              <option value={60}>1 hour before</option>
              <option value={120}>2 hours before</option>
              <option value={1440}>1 day before</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editIsRecurring}
              onChange={(e) => setEditIsRecurring(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recurring</span>
          </label>

          {editIsRecurring && (
            <select
              value={editRecurrencePattern}
              onChange={(e) => setEditRecurrencePattern(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          )}
        </div>

        {availableTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const selected = editSelectedTags.includes(tag.id);
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => toggleEditTag(tag.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      selected ? 'text-white border-transparent' : 'text-gray-700 dark:text-gray-200 bg-transparent'
                    }`}
                    style={selected ? { backgroundColor: tag.color } : { borderColor: tag.color }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            disabled={savingEdit || !editTitle.trim()}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {savingEdit ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${
        todo.completed ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-800'
      }`}
    >
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggle}
          disabled={loading}
          className="mt-1 w-5 h-5 cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          <h3
            className={`text-lg font-semibold ${
              todo.completed
                ? 'line-through text-gray-500 dark:text-gray-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {todo.title}
          </h3>

          {todo.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{todo.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[todo.priority]}`}>
              {todo.priority}
            </span>

            {todo.due_date && (() => {
              const { label, colorClass } = getRelativeDueLabel(todo.due_date);
              return (
                <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
                  {label}
                </span>
              );
            })()}

            {todo.is_recurring && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100">
                🔄 {todo.recurrence_pattern}
              </span>
            )}

            {todo.reminder_minutes && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100">
                🔔 {todo.reminder_minutes}m
              </span>
            )}

            {todo.tags && todo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {todo.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {subtasks.length > 0 && <ProgressBar {...progress} />}

          <div className="mt-4">
              <button
                onClick={() => setShowSubtasks(!showSubtasks)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showSubtasks ? '▼' : '▶'} Subtasks ({subtasks.length})
              </button>

              {showSubtasks && (
                <div className="mt-2 pl-4 space-y-3">
                  {loadingSubtasks ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
                  ) : (
                    subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!subtask.completed}
                          onChange={() => handleSubtaskToggle(subtask.id, subtask.completed)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span
                          className={`text-sm ${
                            subtask.completed
                              ? 'line-through text-gray-500 dark:text-gray-400'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {subtask.title}
                        </span>
                        <button
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="ml-auto text-xs text-red-600 dark:text-red-400 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}

                  <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                      placeholder="Add a subtask..."
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled={addingSubtask}
                    />
                    <button
                      onClick={handleAddSubtask}
                      disabled={addingSubtask || !newSubtaskTitle.trim()}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            disabled={loading}
            className="px-3 py-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-3 py-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
