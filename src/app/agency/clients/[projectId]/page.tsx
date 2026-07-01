import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { getProjectById } from '@/features/client-management/queries'
import { Button } from '@/components/ui/button'

export default async function ProjectDetailsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  
  const project = await getProjectById(projectId).catch(() => null)

  if (!project) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/agency/clients">
          <Button variant="ghost" size="sm" className="mb-4 -ml-4 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la clienți
          </Button>
        </Link>
        <PageHeader 
          title={project.title} 
          description={`Client: ${project.profiles?.full_name} (${project.profiles?.email})`}
        />
      </div>

      <div className="border rounded-lg p-8 bg-muted/20 text-center">
        <h2 className="text-xl font-medium mb-2">Workspace-ul Proiectului</h2>
        <p className="text-muted-foreground mb-6">
          Aici vei vedea task-urile clonate pentru acest client, progresul lor și te vei putea implica prin comentarii și fișiere.
        </p>
        <p className="text-sm font-medium text-primary">
          [Acest ecran va fi implementat la Step 7 - Project Tracking și Step 8 - Collaboration]
        </p>
      </div>
    </div>
  )
}
