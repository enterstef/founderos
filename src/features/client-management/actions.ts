'use server'

import { cloneTemplateToProject } from '@/workflows/clone-template-to-project'
import { requireSuperAdmin } from '@/lib/auth-helpers'

export async function allocateProgramToClient(formData: FormData) {
  await requireSuperAdmin()
  
  const programId = formData.get('program_id') as string
  const clientId = formData.get('client_id') as string
  const projectTitle = formData.get('title') as string

  if (!programId || !clientId || !projectTitle) {
    return { error: 'Toate câmpurile sunt obligatorii' }
  }

  return cloneTemplateToProject(programId, clientId, projectTitle)
}
