'use client'

import { TaskCardPortal } from './task-card-portal'
import type { ProjectTask } from '../schemas'
import { EmptyState } from '@/components/shared/empty-state'
import { LayoutList } from 'lucide-react'

export function TaskListPortal({ groupedTasks }: { groupedTasks: { title: string, tasks: ProjectTask[] }[] }) {
  if (!groupedTasks || groupedTasks.length === 0) {
    return (
      <EmptyState 
        title="Niciun task alocat încă"
        description="Nu ai primit încă task-uri în acest proiect."
        icon={<LayoutList className="h-8 w-8 text-muted-foreground" />}
      />
    )
  }

  return (
    <div className="space-y-12">
      {groupedTasks.map((group, index) => {
        const completedCount = group.tasks.filter(t => t.status === 'done').length
        const totalCount = group.tasks.length
        
        return (
          <div key={index} className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-primary">
                  Modul {index + 1}: {group.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Parcurge toți pașii din acest modul.
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">{completedCount}</span>
                <span className="text-muted-foreground"> / {totalCount}</span>
                <p className="text-xs text-muted-foreground">Finalizate</p>
              </div>
            </div>
            
            <div className="grid gap-6">
              {group.tasks.map(task => (
                <TaskCardPortal key={task.id} task={task} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
