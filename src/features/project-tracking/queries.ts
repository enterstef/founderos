import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import type { ProjectTask } from './schemas'

export const getProjectTasks = cache(async (projectId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
  
  if (error) throw error
  return data as ProjectTask[]
})

// Helper to group tasks by module_instance_key (or module_title)
export function groupTasksByModule(tasks: ProjectTask[]) {
  const groups: Record<string, { title: string, tasks: ProjectTask[] }> = {}
  
  tasks.forEach(task => {
    if (!groups[task.module_instance_key]) {
      groups[task.module_instance_key] = {
        title: task.module_title,
        tasks: []
      }
    }
    groups[task.module_instance_key].tasks.push(task)
  })

  // Return as array, maintaining the original sort order based on the first task of each module
  return Object.values(groups).sort((a, b) => {
    return (a.tasks[0]?.sort_order || 0) - (b.tasks[0]?.sort_order || 0)
  })
}

export function calculateProgress(tasks: ProjectTask[]) {
  if (!tasks || tasks.length === 0) return 0
  
  const totalMinutes = tasks.reduce((sum, t) => sum + t.estimated_minutes, 0)
  const completedMinutes = tasks
    .filter(t => t.status === 'done')
    .reduce((sum, t) => sum + t.estimated_minutes, 0)
    
  return totalMinutes === 0 ? 0 : Math.round((completedMinutes / totalMinutes) * 100)
}
