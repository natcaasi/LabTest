'use client';

import { useEffect, useState } from 'react';

interface Template {
  id: number;
  name: string;
  description?: string;
  category?: string;
  title: string;
  priority: string;
  due_date_offset_days: number;
}

interface TemplateManagerProps {
  onClose: () => void;
  onTodoAdded: () => void;
}

export default function TemplateManager({ onClose, onTodoAdded }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [successId, setSuccessId] = useState<number | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (response.ok) fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUse = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/templates/${id}/use`, { method: 'POST' });
      if (response.ok) {
        setSuccessId(id);
        onTodoAdded();
        setTimeout(() => setSuccessId(null), 2000);
      }
    } catch (error) {
      console.error('Failed to use template:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryGroups = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const cat = t.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">📋 Templates</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
          >
            ✕
          </button>
        </div>

        {templates.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
            No templates yet. Fill in the todo form and click &quot;💾 Save as Template&quot; to create one.
          </p>
        ) : (
          <div className="space-y-4 overflow-y-auto flex-1">
            {Object.entries(categoryGroups).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  {cat}
                </h3>
                <div className="space-y-2">
                  {items.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {template.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {template.title} · {template.priority} priority
                        </p>
                        {template.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleUse(template.id)}
                          disabled={loading}
                          className={`px-3 py-1 text-sm rounded font-medium transition ${
                            successId === template.id
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:opacity-50`}
                        >
                          {successId === template.id ? '✓ Created!' : 'Use'}
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          disabled={loading}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
