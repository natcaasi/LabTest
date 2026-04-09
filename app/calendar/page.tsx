'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Todo, Priority } from '@/lib/db';

interface Holiday {
  id: number;
  name: string;
  date: string;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // URL state management for month
  function getInitialMonth(): { year: number; month: number } {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const monthParam = params.get('month');
      if (monthParam) {
        const [y, m] = monthParam.split('-').map(Number);
        if (y && m && m >= 1 && m <= 12) return { year: y, month: m - 1 };
      }
    }
    return { year: new Date().getFullYear(), month: new Date().getMonth() };
  }

  const initial = getInitialMonth();
  const [currentYear, setCurrentYear] = useState(initial.year);
  const [currentMonth, setCurrentMonth] = useState(initial.month);

  // Sync URL when month changes
  useEffect(() => {
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const url = new URL(window.location.href);
    url.searchParams.set('month', monthStr);
    window.history.replaceState({}, '', url.toString());
  }, [currentYear, currentMonth]);

  const fetchTodos = useCallback(async () => {
    const res = await fetch('/api/todos');
    if (res.ok) setTodos(await res.json());
  }, []);

  const fetchHolidays = useCallback(async () => {
    const res = await fetch(`/api/holidays?year=${currentYear}&month=${currentMonth + 1}`);
    if (res.ok) setHolidays(await res.json());
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function goToToday() {
    setCurrentYear(new Date().getFullYear());
    setCurrentMonth(new Date().getMonth());
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  // Group todos by date string (YYYY-MM-DD)
  function getTodosForDate(day: number): Todo[] {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return todos.filter(t => {
      if (!t.due_date) return false;
      return t.due_date.startsWith(dateStr);
    });
  }

  function getHolidaysForDate(day: number): Holiday[] {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.filter(h => h.date === dateStr);
  }

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">← Back to Todos</a>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <button onClick={prevMonth} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">← Prev</button>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button onClick={goToToday} className="text-sm bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600">Today</button>
          </div>
          <button onClick={nextMonth} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Next →</button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {WEEKDAYS.map(day => (
              <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="min-h-[120px] border-b border-r border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50" />;
              }

              const dayTodos = getTodosForDate(day);
              const dayHolidays = getHolidaysForDate(day);
              const isToday = isCurrentMonth && day === today.getDate();
              const isWeekend = idx % 7 === 0 || idx % 7 === 6;

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[120px] border-b border-r border-gray-100 dark:border-gray-700/50 p-2 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors ${
                    isToday ? 'bg-blue-50 dark:bg-blue-900/20' : isWeekend ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${isToday ? 'bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-gray-700 dark:text-gray-300'}`}>
                      {day}
                    </span>
                    {dayTodos.length > 0 && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                        {dayTodos.length}
                      </span>
                    )}
                  </div>

                  {/* Holidays */}
                  {dayHolidays.map(h => (
                    <div key={h.id} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded mb-1 truncate" title={h.name}>
                      🏴 {h.name}
                    </div>
                  ))}

                  {/* Todos */}
                  {dayTodos.slice(0, 3).map(todo => (
                    <div
                      key={todo.id}
                      className={`text-xs px-1.5 py-0.5 rounded mb-0.5 truncate text-white ${PRIORITY_COLORS[todo.priority]} ${todo.completed ? 'opacity-50 line-through' : ''}`}
                      title={todo.title}
                    >
                      {todo.title}
                    </div>
                  ))}
                  {dayTodos.length > 3 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">+{dayTodos.length - 3} more</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> High Priority</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span> Medium Priority</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Low Priority</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30"></span> Holiday</div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedDay(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedDay} {MONTHS[currentMonth]} {currentYear}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl">×</button>
            </div>

            {/* Holidays for the day */}
            {getHolidaysForDate(selectedDay).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Holidays</h4>
                {getHolidaysForDate(selectedDay).map(h => (
                  <div key={h.id} className="text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg mb-1">
                    🏴 {h.name}
                  </div>
                ))}
              </div>
            )}

            {/* Todos for the day */}
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Todos ({getTodosForDate(selectedDay).length})</h4>
            {getTodosForDate(selectedDay).length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No todos for this day</p>
            ) : (
              <div className="space-y-2">
                {getTodosForDate(selectedDay).map(todo => (
                  <div key={todo.id} className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 ${todo.completed ? 'opacity-50' : ''}`}>
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${PRIORITY_COLORS[todo.priority]}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-gray-900 dark:text-white truncate ${todo.completed ? 'line-through' : ''}`}>{todo.title}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{todo.priority}</span>
                        {todo.is_recurring ? <span className="text-xs text-purple-600 dark:text-purple-400">🔄 {todo.recurrence_pattern}</span> : null}
                        {todo.completed ? <span className="text-xs text-green-600 dark:text-green-400">✅ Done</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
