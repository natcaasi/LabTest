interface Subtask {
  completed: number | boolean;
}

export function calculateProgress(subtasks: Subtask[]): {
  completed: number;
  total: number;
  percentage: number;
} {
  if (subtasks.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const completed = subtasks.filter((s) => s.completed).length;
  const total = subtasks.length;
  const percentage = Math.round((completed / total) * 100);

  return { completed, total, percentage };
}
