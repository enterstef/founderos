import { z } from 'zod'

export const ProgramSchema = z.object({
  title: z.string().min(3, 'Titlul trebuie să aibă minim 3 caractere').max(255),
  description: z.string().optional(),
})
export type ProgramInput = z.infer<typeof ProgramSchema>

export const ModuleSchema = z.object({
  program_id: z.string().uuid(),
  title: z.string().min(3, 'Titlul trebuie să aibă minim 3 caractere').max(255),
  sort_order: z.number().int().min(0).default(0),
})
export type ModuleInput = z.infer<typeof ModuleSchema>

export const StepSchema = z.object({
  module_id: z.string().uuid(),
  title: z.string().min(3, 'Titlul trebuie să aibă minim 3 caractere').max(255),
  content_instructions: z.string().min(5, 'Instrucțiunile sunt obligatorii'),
  estimated_minutes: z.number().int().min(1).default(15),
  track_type: z.enum(['business', 'execution']).default('execution'),
  sort_order: z.number().int().min(0).default(0),
})
export type StepInput = z.infer<typeof StepSchema>

export type Program = { id: string; title: string; description: string | null; version: number };
export type Step = { id: string; title: string; content_instructions: string; estimated_minutes: number; track_type: string; sort_order: number };
export type Module = { id: string; title: string; sort_order: number; master_steps?: Step[] };