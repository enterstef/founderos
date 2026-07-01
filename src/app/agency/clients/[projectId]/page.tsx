import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { getProjectById } from '@/features/client-management/queries'
import { getProjectTasks, groupTasksByModule } from '@/features/project-tracking/queries'
import { Button } from '@/components/ui/button'
import { ProgressOverview } from '@/features/project-tracking/components/progress-overview'
import { TaskListAgency } from '@/features/project-tracking/components/task-list-agency'

export default async function ProjectDetailsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  
  const [project, tasks] = await Promise.all([
    getProjectById(projectId).catch(() => null),
    getProjectTasks(projectId).catch(() => [])
  ])

  if (!project) {
    notFound()
  }

  const groupedTasks = groupTasksByModule(tasks)

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

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <TaskListAgency groupedTasks={groupedTasks} />
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <ProgressOverview tasks={tasks} />
          
          <div className="border rounded-lg p-6 bg-muted/30">
            <h3 className="font-semibold mb-2">Informații Companie</h3>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(project.company_info, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
