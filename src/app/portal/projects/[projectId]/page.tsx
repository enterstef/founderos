import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { getProjectById } from '@/features/client-management/queries'
import { getProjectTasks, groupTasksByModule } from '@/features/project-tracking/queries'
import { ProgressOverview } from '@/features/project-tracking/components/progress-overview'
import { TaskListPortal } from '@/features/project-tracking/components/task-list-portal'

export default async function PortalProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
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
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader 
        title={project.title} 
        description="Spațiul tău de lucru. Parcurge toți pașii în ordine pentru a progresa."
      />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <TaskListPortal groupedTasks={groupedTasks} />
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <div className="sticky top-24">
            <ProgressOverview tasks={tasks} />
          </div>
        </div>
      </div>
    </div>
  )
}
