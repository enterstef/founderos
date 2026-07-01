'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { setTaskStatus } from '../actions'
import { useToast } from '@/hooks/use-toast'
import type { ProjectTask } from '../schemas'
import clsx from 'clsx'
import { TaskCollaboration } from '@/features/collaboration/components/task-collaboration'

export function TaskCardPortal({ task }: { task: ProjectTask }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function completeTask() {
    setLoading(true)
    const res = await setTaskStatus(task.id, 'done')
    if (res.error) toast({ variant: 'destructive', title: 'Eroare', description: res.error })
    setLoading(false)
  }

  return (
    <Card className={clsx("transition-all relative overflow-hidden", task.status === 'done' && "opacity-75 bg-muted/30")}>
      {task.status === 'done' && (
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
          <div className="absolute transform rotate-45 bg-primary text-primary-foreground text-[10px] font-bold py-1 right-[-35px] top-[32px] w-[170px] text-center">
            FINALIZAT
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className={clsx("text-lg", task.status === 'done' && "line-through text-muted-foreground")}>
          {task.title}
        </CardTitle>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {task.estimated_minutes} minute
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {task.track_type === 'business' ? 'Analiză Business' : 'Execuție Tehnică'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground whitespace-pre-wrap">
          {task.content_instructions}
        </div>
      </CardContent>
      
      <CardFooter className="pt-4 border-t flex-col items-stretch gap-4 bg-muted/10">
        <div className="flex justify-end w-full">
          {task.status === 'todo' ? (
            <Button onClick={completeTask} disabled={loading} className="w-full sm:w-auto">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Am Finalizat Acest Pas
            </Button>
          ) : (
            <div className="flex items-center text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
              Pas parcurs cu succes
            </div>
          )}
        </div>

        <div className="w-full bg-background rounded-md border mt-2">
          <TaskCollaboration taskId={task.id} />
        </div>
      </CardFooter>
    </Card>
  )
}
