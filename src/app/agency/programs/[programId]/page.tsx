import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ModuleList } from '@/features/program-management/components/module-list'
import { getProgramById, getModulesByProgramId } from '@/features/program-management/queries'
import { Button } from '@/components/ui/button'

export default async function ProgramDetailsPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params
  
  const [program, modules] = await Promise.all([
    getProgramById(programId).catch(() => null),
    getModulesByProgramId(programId).catch(() => [])
  ])

  if (!program) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/agency/programs">
          <Button variant="ghost" size="sm" className="mb-4 -ml-4 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la programe
          </Button>
        </Link>
        <PageHeader 
          title={program.title} 
          description={program.description || 'Fără descriere'}
        />
      </div>

      <ModuleList programId={program.id} modules={modules} />
    </div>
  )
}
