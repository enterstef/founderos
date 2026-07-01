'use server'

import { createClient } from '@/lib/supabase/server'
import { ProgramSchema, ModuleSchema, StepSchema, type ProgramInput, type ModuleInput, type StepInput } from './schemas'
import { revalidatePath } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth-helpers'

export async function createProgram(input: ProgramInput) {
  await requireSuperAdmin()
  const parsed = ProgramSchema.safeParse(input)
  if (!parsed.success) return { error: 'Date invalide' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('master_programs')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description,
    })
    .select()
    .single()

  if (error) {
    console.error(error)
    return { error: 'Eroare la crearea programului' }
  }

  revalidatePath('/agency/programs')
  return { success: true, data }
}

export async function createModule(input: ModuleInput) {
  await requireSuperAdmin()
  const parsed = ModuleSchema.safeParse(input)
  if (!parsed.success) return { error: 'Date invalide' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('master_modules')
    .insert({
      program_id: parsed.data.program_id,
      title: parsed.data.title,
      sort_order: parsed.data.sort_order,
    })
    .select()
    .single()

  if (error) {
    console.error(error)
    return { error: 'Eroare la crearea modulului' }
  }

  revalidatePath(`/agency/programs/${parsed.data.program_id}`)
  return { success: true, data }
}

export async function createStep(input: StepInput) {
  await requireSuperAdmin()
  const parsed = StepSchema.safeParse(input)
  if (!parsed.success) return { error: 'Date invalide' }

  const supabase = await createClient()
  // We need to fetch the program_id to revalidate the correct path
  const { data: moduleData } = await supabase
    .from('master_modules')
    .select('program_id')
    .eq('id', parsed.data.module_id)
    .single()

  const { data, error } = await supabase
    .from('master_steps')
    .insert({
      module_id: parsed.data.module_id,
      title: parsed.data.title,
      content_instructions: parsed.data.content_instructions,
      estimated_minutes: parsed.data.estimated_minutes,
      track_type: parsed.data.track_type,
      sort_order: parsed.data.sort_order,
    })
    .select()
    .single()

  if (error) {
    console.error(error)
    return { error: 'Eroare la crearea pasului' }
  }

  if (moduleData) {
    revalidatePath(`/agency/programs/${moduleData.program_id}/modules/${parsed.data.module_id}`)
    revalidatePath(`/agency/programs/${moduleData.program_id}`)
  }
  
  return { success: true, data }
}
