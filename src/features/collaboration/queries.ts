import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import type { TaskComment, TaskAttachment } from './schemas'

export const getTaskComments = cache(async (taskId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_comments')
    .select('*, profiles(full_name, email, role)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data as TaskComment[]
})

export const getTaskAttachments = cache(async (taskId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_attachments')
    .select('*, profiles(full_name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data as TaskAttachment[]
})
