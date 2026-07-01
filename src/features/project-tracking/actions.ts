'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireSuperAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { TaskUpdateSchema, type TaskUpdateInput } from './schemas'

export async function setTaskStatus(taskId: string, status: 'todo' | 'done') {
  // Both clients and admins can complete tasks
  const user = await requireAuth()
  
  const supabase = await createClient()
  
  // 1. Get task to find project_id for revalidation
  const { data: task, error: fetchError } = await supabase
    .from('project_tasks')
    .select('project_id')
    .eq('id', taskId)
    .single()
    
  if (fetchError || !task) return { error: 'Task not found' }

  // 2. Update status
  const { error: updateError } = await supabase
    .from('project_tasks')
    .update({ status })
    .eq('id', taskId)
    
  if (updateError) return { error: 'Failed to update task status' }

  // Revalidate both portal and agency paths
  revalidatePath(`/portal/projects/${task.project_id}`)
  revalidatePath(`/agency/clients/${task.project_id}`)
  
  return { success: true }
}

export async function updateTaskContent(input: TaskUpdateInput) {
  // Only admins can update cloned task content
  await requireSuperAdmin()
  
  const parsed = TaskUpdateSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid data' }
  
  const supabase = await createClient()
  
  // 1. Get task for project_id
  const { data: task } = await supabase
    .from('project_tasks')
    .select('project_id')
    .eq('id', parsed.data.task_id)
    .single()
    
  if (!task) return { error: 'Task not found' }
  
  // 2. Update content AND detach (sync_mode = 'custom')
  const { error } = await supabase
    .from('project_tasks')
    .update({
      title: parsed.data.title,
      content_instructions: parsed.data.content_instructions,
      estimated_minutes: parsed.data.estimated_minutes,
      sync_mode: 'custom' // Mark as detached from master template
    })
    .eq('id', parsed.data.task_id)
    
  if (error) return { error: 'Failed to update task' }

  revalidatePath(`/agency/clients/${task.project_id}`)
  revalidatePath(`/portal/projects/${task.project_id}`)
  
  return { success: true }
}
