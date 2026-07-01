'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { ProjectTask } from '../schemas'

export function ProgressOverview({ tasks }: { tasks: ProjectTask[] }) {
  if (!tasks || tasks.length === 0) return null

  const totalMinutes = tasks.reduce((acc, t) => acc + t.estimated_minutes, 0)
  const completedMinutes = tasks
    .filter(t => t.status === 'done')
    .reduce((acc, t) => acc + t.estimated_minutes, 0)
    
  const progressPercent = totalMinutes === 0 ? 0 : Math.round((completedMinutes / totalMinutes) * 100)
  
  const completedTasks = tasks.filter(t => t.status === 'done').length
  
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Progres Proiect</span>
          <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progressPercent} className="h-3 mb-4" />
        <div className="grid grid-cols-2 gap-4 text-sm mt-4 border-t pt-4 border-primary/10">
          <div>
            <p className="text-muted-foreground font-medium">Task-uri Finalizate</p>
            <p className="text-xl font-semibold">{completedTasks} <span className="text-muted-foreground text-sm font-normal">/ {tasks.length}</span></p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Timp Estimat Investit</p>
            <p className="text-xl font-semibold">{completedMinutes} <span className="text-muted-foreground text-sm font-normal">min / {totalMinutes} min</span></p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
