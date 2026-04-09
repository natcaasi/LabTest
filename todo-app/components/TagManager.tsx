'use client';

import { useEffect, useState } from 'react';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TagManagerProps {
  onClose: () => void;
}

export default function TagManager({ onClose }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      });

      if (response.ok) {
        setName('');
        setColor('#3B82F6');
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Tags</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4 mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tag name"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            disabled={loading}
          />

          <div className="flex gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !name}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Create Tag
            </button>
          </div>
        </form>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="font-medium text-gray-900 dark:text-white">{tag.name}</span>
              </div>
              <button
                onClick={() => handleDelete(tag.id)}
                disabled={loading}
                className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
