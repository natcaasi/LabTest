'use client';

interface ProgressBarProps {
  completed: number;
  total: number;
  percentage: number;
}

export default function ProgressBar({ completed, total, percentage }: ProgressBarProps) {
  return (
    <div className="mt-3 space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${
              percentage === 100
                ? 'bg-green-500 dark:bg-green-600'
                : 'bg-blue-500 dark:bg-blue-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {completed}/{total} completed ({percentage}%)
      </p>
    </div>
  );
}
