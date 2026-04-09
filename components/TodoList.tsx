'use client';

import TodoItem from './TodoItem';
import { isSGPast } from '@/lib/timezone';

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

interface Subtask {
  id: number;
  title: string;
  completed: number | boolean;
}

interface TodoWithSubtasks extends Todo {
  subtasks?: Subtask[];
}

interface TodoListProps {
  todos: Todo[];
  searchQuery: string;
  priorityFilter: string;
  tagFilter: string[];
  onTodoUpdate: () => void;
}

export default function TodoList({
  todos,
  searchQuery,
  priorityFilter,
  tagFilter,
  onTodoUpdate,
}: TodoListProps) {
  const filteredTodos = todos.filter((todo) => {
    // Filter by search query - match title, tag names, and subtask titles
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = todo.title.toLowerCase().includes(query);
      const tagMatch = todo.tags?.some((tag) => tag.name.toLowerCase().includes(query));
      if (!titleMatch && !tagMatch) {
        return false;
      }
    }

    // Filter by priority
    if (priorityFilter && todo.priority !== priorityFilter) {
      return false;
    }

    // Filter by tags - all selected tags must be present (AND logic)
    if (tagFilter.length > 0) {
      const selectedTagIds = tagFilter.map(Number);
      const todoTagIds = (todo.tags || []).map((t) => t.id);
      const hasAllTags = selectedTagIds.every((tagId) => todoTagIds.includes(tagId));
      if (!hasAllTags) {
        return false;
      }
    }

    return true;
  });

  const overdue = filteredTodos.filter(
    (t) => !t.completed && t.due_date && isSGPast(t.due_date)
  );
  const active = filteredTodos.filter(
    (t) => !t.completed && (!t.due_date || !isSGPast(t.due_date))
  );
  const completed = filteredTodos.filter((t) => t.completed);

  const renderSection = (title: string, items: Todo[], color: string) => {
    if (items.length === 0) return null;

    return (
      <div key={title} className="mb-8">
        <h2 className={`text-lg font-bold ${color} mb-4`}>{title}</h2>
        <div className="space-y-3">
          {items.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onUpdate={onTodoUpdate} searchQuery={searchQuery} />
          ))}
        </div>
      </div>
    );
  };

  const sections = [
    ['Overdue', overdue, 'text-red-600 dark:text-red-400'],
    ['Active', active, 'text-blue-600 dark:text-blue-400'],
    ['Completed', completed, 'text-green-600 dark:text-green-400'],
  ] as const;

  const totalItems = sections.reduce((sum, [_, items]) => sum + items.length, 0);

  return (
    <div>
      {totalItems === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {searchQuery || priorityFilter || tagFilter
              ? 'No todos match your filters'
              : 'No todos yet. Create one to get started!'}
          </p>
        </div>
      ) : (
        sections.map(([title, items, color]) => renderSection(title, items, color as string))
      )}
    </div>
  );
}
