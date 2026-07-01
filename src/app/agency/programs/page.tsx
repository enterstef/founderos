import { PageHeader } from '@/components/shared/page-header'
import { ProgramForm } from '@/features/program-management/components/program-form'
import { ProgramList } from '@/features/program-management/components/program-list'
import { getPrograms } from '@/features/program-management/queries'

export default async function ProgramsPage() {
  const programs = await getPrograms()

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Programe (Templates)" 
        description="Gestionează programele master care vor fi clonate pentru clienți."
      />
      
      <ProgramForm />
      
      <div className="pt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Programe existente</h2>
        <ProgramList programs={programs} />
      </div>
    </div>
  )
}
