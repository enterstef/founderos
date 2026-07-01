import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import type { Profile, Project } from './schemas'

export const getClients = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Profile[]
})

export const getProjects = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_projects')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
})

export const getProjectById = cache(async (projectId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_projects')
    .select('*, profiles(*)')
    .eq('id', projectId)
    .single()
    
  if (error) throw error
  return data
})
