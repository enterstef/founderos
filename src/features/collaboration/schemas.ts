import { z } from 'zod'

export const CommentSchema = z.object({
  task_id: z.string().uuid(),
  message: z.string().min(1, 'Mesajul nu poate fi gol').max(2000),
})
export type CommentInput = z.infer<typeof CommentSchema>

export const AttachmentSchema = z.object({
  task_id: z.string().uuid(),
  file_name: z.string(),
  storage_path: z.string(),
})
export type AttachmentInput = z.infer<typeof AttachmentSchema>

export type TaskComment = {
  id: string
  task_id: string
  user_id: string
  message: string
  created_at: string
  profiles?: {
    full_name: string
    email: string
    role: string
  }
}

export type TaskAttachment = {
  id: string
  task_id: string
  storage_path: string
  file_name: string
  uploaded_by: string
  created_at: string
  profiles?: {
    full_name: string
  }
}
