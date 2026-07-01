import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StepEditor } from '@/features/program-management/components/step-editor'
import { getProgramById, getModuleById } from '@/features/program-management/queries'
import { Button } from '@/components/ui/button'

export default async function ModuleDetailsPage({ params }: { params: Promise<{ programId: string, moduleId: string }> }) {
  const { programId, moduleId } = await params
  
  const [program, moduleData] = await Promise.all([
    getProgramById(programId).catch(() => null),
    getModuleById(moduleId).catch(() => null)
  ])

  if (!program || !moduleData) {
    notFound()
  }

  // Sort steps by sort_order
  const steps = (moduleData.master_steps || []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/agency/programs/${programId}`}>
          <Button variant="ghost" size="sm" className="mb-4 -ml-4 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la module
          </Button>
        </Link>
        <PageHeader 
          title={moduleData.title} 
          description={`Program: ${program.title}`}
        />
      </div>

      <StepEditor moduleId={moduleData.id} steps={steps} />
    </div>
  )
}
