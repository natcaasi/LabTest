import { z } from 'zod';

export const PrioritySchema = z.enum(['high', 'medium', 'low']);
export type Priority = z.infer<typeof PrioritySchema>;

export const RecurrencePatternSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export type RecurrencePattern = z.infer<typeof RecurrencePatternSchema>;

export const ReminderTimingSchema = z.enum([
  '15m',
  '30m',
  '1h',
  '2h',
  '1d',
  '2d',
  '1w',
]);
export type ReminderTiming = z.infer<typeof ReminderTimingSchema>;

export const TodoCreateSchema = z.object({
  title: z.string().min(1, 'Title required').max(500).trim(),
  description: z.string().max(5000).optional(),
  priority: PrioritySchema.default('medium'),
  due_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid datetime' })
    .optional(),
  is_recurring: z.boolean().default(false),
  recurrence_pattern: RecurrencePatternSchema.optional(),
  reminder_minutes: z.number().int().positive().optional(),
});

export const TodoUpdateSchema = TodoCreateSchema.partial().extend({
  completed: z.boolean().optional(),
});

export const TagSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const SubtaskCreateSchema = z.object({
  title: z.string().min(1).max(500).trim(),
});

export const SubtaskUpdateSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  completed: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const TemplateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  due_date_offset_days: z.number().int().nonnegative().default(0),
});

export const ExportedDataSchema = z.object({
  version: z.literal('1.0'),
  todos: z.array(z.any()),
  subtasks: z.array(z.any()),
  tags: z.array(z.any()),
  todo_tags: z.array(z.any()),
  templates: z.array(z.any()).optional(),
});

export type TodoCreate = z.infer<typeof TodoCreateSchema>;
export type TodoUpdate = z.infer<typeof TodoUpdateSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Subtask = z.infer<typeof SubtaskCreateSchema>;
export type Template = z.infer<typeof TemplateSchema>;
