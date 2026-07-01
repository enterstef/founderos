import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export const getPrograms = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('master_programs')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
})

export const getProgramById = cache(async (id: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('master_programs')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) throw error
  return data
})

export const getModulesByProgramId = cache(async (programId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('master_modules')
    .select('*, master_steps(*)')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true })
    
  if (error) throw error
  return data
})

export const getModuleById = cache(async (moduleId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('master_modules')
    .select('*, master_steps(*)')
    .eq('id', moduleId)
    .single()
    
  if (error) throw error
  return data
})

export const getStepById = cache(async (stepId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('master_steps')
    .select('*')
    .eq('id', stepId)
    .single()
    
  if (error) throw error
  return data
})
