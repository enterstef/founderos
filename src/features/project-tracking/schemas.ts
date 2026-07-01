import { z } from 'zod'

export const TaskUpdateSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().min(3).optional(),
  content_instructions: z.string().min(5).optional(),
  estimated_minutes: z.number().int().min(1).optional(),
})
export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>

export type ProjectTask = {
  id: string
  project_id: string
  module_instance_key: string
  source_program_key: string
  source_module_key: string
  source_step_key: string
  source_template_version: number
  track_type: string
  module_title: string
  title: string
  content_instructions: string
  estimated_minutes: number
  status: 'todo' | 'done'
  sync_mode: 'inherit' | 'custom'
  sort_order: number
  created_at: string
  updated_at: string
}
