import { PageHeader } from '@/components/shared/page-header'
import { ClientList } from '@/features/client-management/components/client-list'
import { getClients, getProjects } from '@/features/client-management/queries'
import { getPrograms } from '@/features/program-management/queries'

export default async function ClientsPage() {
  const [clients, projects, programs] = await Promise.all([
    getClients(),
    getProjects(),
    getPrograms()
  ])

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Clienți & Proiecte" 
        description="Gestionează clienții înregistrați și alocă-le programe (clonează template-uri)."
      />
      
      <ClientList 
        clients={clients} 
        projects={projects}
        programs={programs}
      />
    </div>
  )
}
