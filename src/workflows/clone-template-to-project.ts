'use server'

import { createClient } from '@/lib/supabase/server'
import { getProgramById, getModulesByProgramId } from '@/features/program-management/queries'
import { revalidatePath } from 'next/cache'

export async function cloneTemplateToProject(
  programId: string, 
  clientId: string, 
  projectTitle: string
) {
  const supabase = await createClient()

  // 1. Fetch template data
  const program = await getProgramById(programId)
  const modules = await getModulesByProgramId(programId)

  if (!program) return { error: 'Program template not found' }

  // 2. Create client project
  const { data: project, error: projectError } = await supabase
    .from('client_projects')
    .insert({
      client_id: clientId,
      title: projectTitle,
      company_info: {}
    })
    .select()
    .single()

  if (projectError) return { error: 'Failed to create project' }

  // 3. Prepare task inserts (Clone & Detach)
  const tasksToInsert = []

  for (const mod of modules) {
    const module_instance_key = crypto.randomUUID()
    
    // Sort steps to maintain order
    const steps = (mod.master_steps || []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    
    for (const step of steps) {
      tasksToInsert.push({
        project_id: project.id,
        module_instance_key,
        source_program_key: program.program_key,
        source_module_key: mod.module_key,
        source_step_key: step.step_key,
        source_template_version: program.version,
        track_type: step.track_type,
        module_title: mod.title,
        title: step.title,
        content_instructions: step.content_instructions,
        estimated_minutes: step.estimated_minutes,
        sort_order: step.sort_order,
        status: 'todo',
        sync_mode: 'inherit'
      })
    }
  }

  // 4. Batch insert tasks
  if (tasksToInsert.length > 0) {
    const { error: tasksError } = await supabase
      .from('project_tasks')
      .insert(tasksToInsert)
      
    if (tasksError) {
      console.error(tasksError)
      // Note: In a robust production system, we'd want this in a real transaction. 
      // Supabase RPC can be used, but for now we do compensating deletes or just log it.
      return { error: 'Project created, but failed to clone tasks' }
    }
  }

  revalidatePath('/agency/clients')
  return { success: true, projectId: project.id }
}
