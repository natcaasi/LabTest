'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onPriorityChange: (priority: string) => void;
  onTagChange: (tags: string[]) => void;
  onCompletionFilterChange?: (filter: string) => void;
  onDateRangeChange?: (from: string, to: string) => void;
}

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface SavedFilterPreset {
  name: string;
  filters: {
    searchQuery: string;
    priorityFilter: string;
    selectedTags: number[];
    completionFilter: string;
    dateFrom: string;
    dateTo: string;
  };
}

export default function SearchBar({
  onSearch,
  onPriorityChange,
  onTagChange,
  onCompletionFilterChange,
  onDateRangeChange,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [completionFilter, setCompletionFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
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
    fetchTags();

    const saved = localStorage.getItem('todo_filter_presets');
    if (saved) {
      try {
        setSavedPresets(JSON.parse(saved));
      } catch {
        setSavedPresets([]);
      }
    }
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        onSearch(value);
      }, 300);
    },
    [onSearch]
  );

  const handlePriorityChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setPriorityFilter(value);
      onPriorityChange(value);
    },
    [onPriorityChange]
  );

  const handleTagToggle = useCallback(
    (tagId: number) => {
      setSelectedTags((prev) => {
        const updated = prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId];
        onTagChange(updated.map(String));
        return updated;
      });
    },
    [onTagChange]
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setPriorityFilter('');
    setSelectedTags([]);
    setCompletionFilter('All');
    setDateFrom('');
    setDateTo('');
    onSearch('');
    onPriorityChange('');
    onTagChange([]);
    onCompletionFilterChange?.('All');
    onDateRangeChange?.('', '');
  }, [onSearch, onPriorityChange, onTagChange, onCompletionFilterChange, onDateRangeChange]);

  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: SavedFilterPreset = {
      name: presetName.trim(),
      filters: {
        searchQuery,
        priorityFilter,
        selectedTags,
        completionFilter,
        dateFrom,
        dateTo,
      },
    };

    const updated = [...savedPresets, newPreset];
    setSavedPresets(updated);
    localStorage.setItem('todo_filter_presets', JSON.stringify(updated));
    setShowSavePreset(false);
    setPresetName('');
  };

  const handleApplyPreset = (preset: SavedFilterPreset) => {
    const { filters } = preset;
    setSearchQuery(filters.searchQuery);
    setPriorityFilter(filters.priorityFilter);
    setSelectedTags(filters.selectedTags);
    setCompletionFilter(filters.completionFilter);
    setDateFrom(filters.dateFrom);
    setDateTo(filters.dateTo);
    onSearch(filters.searchQuery);
    onPriorityChange(filters.priorityFilter);
    onTagChange(filters.selectedTags.map(String));
    onCompletionFilterChange?.(filters.completionFilter);
    onDateRangeChange?.(filters.dateFrom, filters.dateTo);
  };

  const handleDeletePreset = (name: string) => {
    const updated = savedPresets.filter((p) => p.name !== name);
    setSavedPresets(updated);
    localStorage.setItem('todo_filter_presets', JSON.stringify(updated));
  };

  const hasFilters =
    searchQuery ||
    priorityFilter ||
    selectedTags.length > 0 ||
    completionFilter !== 'All' ||
    dateFrom ||
    dateTo;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-8 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search (debounced)
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by title or tag..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority
          </label>
          <select
            value={priorityFilter}
            onChange={handlePriorityChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            Advanced {showAdvanced ? '▼' : '▶'}
          </button>
          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagToggle(tag.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-opacity ${
                  selectedTags.includes(tag.id) ? 'opacity-100' : 'opacity-60 hover:opacity-80'
                }`}
                style={{
                  backgroundColor: tag.color,
                  color: '#fff',
                }}
              >
                {tag.name}
                {selectedTags.includes(tag.id) && ' ✓'}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAdvanced && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <div className="flex gap-3">
              {['All', 'Incomplete', 'Completed'].map((status) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="completion"
                    value={status}
                    checked={completionFilter === status}
                    onChange={(e) => {
                      setCompletionFilter(e.target.value);
                      onCompletionFilterChange?.(e.target.value);
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{status}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From
              </label>
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  onDateRangeChange?.(e.target.value, dateTo);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To
              </label>
              <input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  onDateRangeChange?.(dateFrom, e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          {hasFilters && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowSavePreset(true)}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                💾 Save Filter
              </button>
            </div>
          )}

          {savedPresets.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Saved Presets
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedPresets.map((preset) => (
                  <div
                    key={preset.name}
                    className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm"
                  >
                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="flex-1 text-left text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => handleDeletePreset(preset.name)}
                      className="ml-2 px-2 py-1 text-red-600 dark:text-red-400 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showSavePreset && (
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded space-y-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  className="flex-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSavePreset(false);
                    setPresetName('');
                  }}
                  className="flex-1 px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
