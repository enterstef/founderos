'use client'

import { useState } from 'react'
import { addComment } from '../actions'
import type { TaskComment } from '../schemas'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { ro } from 'date-fns/locale'

export function CommentThread({ taskId, comments, onUpdate }: { taskId: string, comments: TaskComment[], onUpdate: () => void }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { toast } = useToast()

  async function handlePost() {
    if (!message.trim()) return
    setLoading(true)
    const res = await addComment({ task_id: taskId, message })
    if (res.error) {
      toast({ variant: 'destructive', title: 'Eroare', description: res.error })
    } else {
      setMessage('')
      onUpdate()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[250px] w-full rounded-md border p-4 bg-muted/20">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-10">
            Niciun comentariu. Fii primul care adaugă unul!
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{comment.profiles?.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ro })}
                  </span>
                  {comment.profiles?.role === 'super_admin' && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase">Admin</span>
                  )}
                </div>
                <div className="text-foreground/90 whitespace-pre-wrap">{comment.message}</div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="flex flex-col gap-2">
        <Textarea 
          placeholder="Adaugă un comentariu..." 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[80px]"
        />
        <Button onClick={handlePost} disabled={loading || !message.trim()} className="self-end">
          {loading ? 'Se trimite...' : 'Trimite'}
        </Button>
      </div>
    </div>
  )
}
