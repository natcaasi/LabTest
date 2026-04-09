'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatSGDate, toSGTime } from '@/lib/timezone';

interface Todo {
  id: number;
  title: string;
  priority: 'high' | 'medium' | 'low';
  due_date: string;
  completed: number;
}

interface Holiday {
  date: string;
  name: string;
}

interface DayData {
  todos: Todo[];
  holiday?: Holiday;
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const monthParam = searchParams.get('month');
  if (monthParam && !isNaN(new Date(monthParam).getTime())) {
    useEffect(() => {
      setCurrentDate(new Date(monthParam));
    }, [monthParam]);
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [todosRes, holidaysRes] = await Promise.all([
          fetch('/api/todos'),
          fetch('/api/holidays'),
        ]);

        if (todosRes.ok) {
          const data = await todosRes.json();
          setTodos(data);
        }

        if (holidaysRes.ok) {
          const data = await holidaysRes.json();
          setHolidays(data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(startingDayOfWeek).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const getDayTodos = (day: number): Todo[] => {
    const dateStr = formatSGDate(new Date(year, month, day));
    return todos.filter((t) => t.due_date?.startsWith(dateStr));
  };

  const getDayHoliday = (day: number): Holiday | undefined => {
    const dateStr = formatSGDate(new Date(year, month, day));
    return holidays.find((h) => h.date === dateStr);
  };

  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
    const monthStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    router.push(`/calendar?month=${monthStr}-01`);
  };

  const handleNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    setCurrentDate(newDate);
    const monthStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    router.push(`/calendar?month=${monthStr}-01`);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    router.push(`/calendar?month=${monthStr}-01`);
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Todos
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{monthName}</h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrevMonth}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Previous
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-bold text-gray-700 dark:text-gray-300 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weeks.map((week, weekIdx) =>
              week.map((day, dayIdx) => (
                <div
                  key={`${weekIdx}-${dayIdx}`}
                  className={`min-h-32 p-2 rounded border ${
                    day === null
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  } cursor-pointer hover:shadow-md transition`}
                  onClick={() => {
                    if (day) {
                      setSelectedDay({
                        todos: getDayTodos(day),
                        holiday: getDayHoliday(day),
                      });
                    }
                  }}
                >
                  {day && (
                    <>
                      <div className="font-bold text-gray-900 dark:text-white mb-1">{day}</div>
                      {getDayHoliday(day) && (
                        <div className="text-xs bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 px-2 py-1 rounded mb-1">
                          {getDayHoliday(day)?.name}
                        </div>
                      )}
                      <div className="text-xs space-y-1">
                        {getDayTodos(day).map((todo) => (
                          <div
                            key={todo.id}
                            className={`px-2 py-1 rounded text-white truncate ${
                              todo.priority === 'high'
                                ? 'bg-red-500'
                                : todo.priority === 'medium'
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-500'
                            }`}
                          >
                            {todo.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {selectedDay && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedDay.holiday && `${selectedDay.holiday.name} - `}
                  Day Details
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              {selectedDay.todos.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No todos for this day</p>
              ) : (
                <div className="space-y-2">
                  {selectedDay.todos.map((todo) => (
                    <div key={todo.id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded">
                      <p className="font-semibold text-gray-900 dark:text-white">{todo.title}</p>
                      <p className={`text-xs badge-priority-${todo.priority}`}>
                        {todo.priority}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setSelectedDay(null)}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
