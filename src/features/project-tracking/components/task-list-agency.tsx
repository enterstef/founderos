'use client'

import { TaskCardAgency } from './task-card-agency'
import type { ProjectTask } from '../schemas'
import { EmptyState } from '@/components/shared/empty-state'
import { LayoutList } from 'lucide-react'

export function TaskListAgency({ groupedTasks }: { groupedTasks: { title: string, tasks: ProjectTask[] }[] }) {
  if (!groupedTasks || groupedTasks.length === 0) {
    return (
      <EmptyState 
        title="Fără task-uri"
        description="Acest proiect nu are niciun task."
        icon={<LayoutList className="h-8 w-8 text-muted-foreground" />}
      />
    )
  }

  return (
    <div className="space-y-12">
      {groupedTasks.map((group, index) => (
        <div key={index} className="space-y-6">
          <div className="border-b pb-2">
            <h3 className="text-xl font-bold tracking-tight text-primary">
              Modul {index + 1}: {group.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {group.tasks.length} task-uri în acest modul
            </p>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-2">
            {group.tasks.map(task => (
              <TaskCardAgency key={task.id} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
