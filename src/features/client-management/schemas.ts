import { z } from 'zod'

export const ProjectSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().min(3, 'Titlul trebuie să aibă minim 3 caractere').max(255),
  company_info: z.record(z.string(), z.any()).default({}),
})
export type ProjectInput = z.infer<typeof ProjectSchema>

export type Project = {
  id: string
  client_id: string
  title: string
  company_info: Record<string, unknown>
  created_at: string
}

export type Profile = {
  id: string
  email: string
  full_name: string
  role: string
}
