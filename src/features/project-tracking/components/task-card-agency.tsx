'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Clock, Pencil, Save, X } from 'lucide-react'
import { setTaskStatus, updateTaskContent } from '../actions'
import { useToast } from '@/hooks/use-toast'
import type { ProjectTask } from '../schemas'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import clsx from 'clsx'

export function TaskCardAgency({ task }: { task: ProjectTask }) {
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()
  
  const [editTitle, setEditTitle] = useState(task.title)
  const [editContent, setEditContent] = useState(task.content_instructions)
  const [editMinutes, setEditMinutes] = useState(task.estimated_minutes)

  async function toggleStatus() {
    setLoading(true)
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    const res = await setTaskStatus(task.id, newStatus)
    
    if (res.error) toast({ variant: 'destructive', title: 'Eroare', description: res.error })
    setLoading(false)
  }

  async function saveEdits() {
    setLoading(true)
    const res = await updateTaskContent({
      task_id: task.id,
      title: editTitle,
      content_instructions: editContent,
      estimated_minutes: editMinutes,
    })
    
    if (res.error) {
      toast({ variant: 'destructive', title: 'Eroare', description: res.error })
    } else {
      toast({ title: 'Salvat', description: 'Task-ul a fost actualizat și detașat de master template.' })
      setIsEditing(false)
    }
    setLoading(false)
  }

  if (isEditing) {
    return (
      <Card className="border-primary/50 shadow-sm">
        <CardHeader className="pb-3">
          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="font-semibold text-lg" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            value={editContent} 
            onChange={e => setEditContent(e.target.value)} 
            className="min-h-[150px] font-mono text-sm"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Minute:</span>
            <Input 
              type="number" 
              value={editMinutes} 
              onChange={e => setEditMinutes(parseInt(e.target.value) || 15)} 
              className="w-24"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Anulează</Button>
          <Button size="sm" onClick={saveEdits} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Salvează
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className={clsx("transition-all", task.status === 'done' && "opacity-75 bg-muted/30")}>
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div>
          <CardTitle className={clsx("text-lg", task.status === 'done' && "line-through text-muted-foreground")}>
            {task.title}
          </CardTitle>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={task.status === 'done' ? "secondary" : "default"} className="flex items-center gap-1">
              {task.status === 'done' ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {task.status === 'done' ? 'Finalizat' : 'În Așteptare'}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.estimated_minutes} min
            </Badge>
            <Badge variant="outline" className="capitalize">
              {task.track_type}
            </Badge>
            {task.sync_mode === 'custom' && (
              <Badge variant="destructive" className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20">
                Customizat (Detașat)
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
          {task.content_instructions}
        </div>
      </CardContent>
      
      <CardFooter className="pt-4 border-t flex justify-between items-center bg-muted/10">
        <span className="text-xs text-muted-foreground">ID: {task.id.split('-')[0]}...</span>
        <Button 
          variant={task.status === 'done' ? "outline" : "default"} 
          size="sm" 
          onClick={toggleStatus} 
          disabled={loading}
        >
          {task.status === 'done' ? 'Marchează ca Neînceput' : 'Marchează ca Finalizat'}
        </Button>
      </CardFooter>
    </Card>
  )
}
