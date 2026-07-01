'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { CommentSchema, AttachmentSchema, type CommentInput, type AttachmentInput } from './schemas'

export async function addComment(input: CommentInput) {
  const user = await requireAuth()
  
  const parsed = CommentSchema.safeParse(input)
  if (!parsed.success) return { error: 'Date invalide' }
  
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('task_comments')
    .insert({
      task_id: parsed.data.task_id,
      user_id: user.id,
      message: parsed.data.message
    })
    
  if (error) return { error: 'Eroare la adăugarea comentariului' }

  // Revalidate paths. To do this perfectly we need the project ID, 
  // but we can revalidate everything for simplicity or fetch it.
  const { data: task } = await supabase.from('project_tasks').select('project_id').eq('id', parsed.data.task_id).single()
  if (task) {
    revalidatePath(`/agency/clients/${task.project_id}`)
    revalidatePath(`/portal/projects/${task.project_id}`)
  }
  
  return { success: true }
}

export async function saveAttachment(input: AttachmentInput) {
  const user = await requireAuth()
  
  const parsed = AttachmentSchema.safeParse(input)
  if (!parsed.success) return { error: 'Date invalide' }
  
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('task_attachments')
    .insert({
      task_id: parsed.data.task_id,
      storage_path: parsed.data.storage_path,
      file_name: parsed.data.file_name,
      uploaded_by: user.id
    })
    
  if (error) {
    // Compensating cleanup: if DB insert fails, delete from storage bucket
    await supabase.storage.from('task-attachments').remove([parsed.data.storage_path])
    return { error: 'Eroare la salvarea atașamentului' }
  }

  const { data: task } = await supabase.from('project_tasks').select('project_id').eq('id', parsed.data.task_id).single()
  if (task) {
    revalidatePath(`/agency/clients/${task.project_id}`)
    revalidatePath(`/portal/projects/${task.project_id}`)
  }
  
  return { success: true }
}

export async function getDownloadUrl(storagePath: string, fileName?: string) {
  await requireAuth()
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .storage
    .from('task-attachments')
    .createSignedUrl(storagePath, 60 * 60, {
      download: fileName || true
    }) // 1 hour
    
  if (error) return { error: 'Nu se poate accesa fișierul' }
  return { url: data.signedUrl }
}

export async function getTaskCollaborationData(taskId: string) {
  const supabase = await createClient()
  
  const [commentsRes, attachmentsRes] = await Promise.all([
    supabase.from('task_comments').select('*, profiles(full_name, email, role)').eq('task_id', taskId).order('created_at', { ascending: true }),
    supabase.from('task_attachments').select('*, profiles(full_name)').eq('task_id', taskId).order('created_at', { ascending: true })
  ])

  return {
    comments: commentsRes.data || [],
    attachments: attachmentsRes.data || []
  }
}