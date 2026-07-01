import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/shared/empty-state'
import { BookOpen } from 'lucide-react'

export default async function PortalDashboardPage() {
  const user = await requireAuth()
  
  const supabase = await createClient()
  const { data: projects, error } = await supabase
    .from('client_projects')
    .select('id')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error(error)
    return <div>A apărut o eroare la încărcarea proiectelor.</div>
  }

  if (projects && projects.length > 0) {
    redirect(`/portal/projects/${projects[0].id}`)
  }

  return (
    <div className="max-w-4xl mx-auto mt-12">
      <EmptyState 
        title="Bun venit în portalul client" 
        description="Contul tău a fost creat cu succes, dar încă nu ți-a fost alocat niciun program de digitalizare. Te rugăm să aștepți ca administratorul să-ți aloce programul."
        icon={<BookOpen className="h-12 w-12 text-muted-foreground" />}
      />
    </div>
  )
}
