'use client'

import { useEffect, useState } from 'react'
import { getTaskCollaborationData } from '../actions'
import { CommentThread } from './comment-thread'
import { AttachmentList } from './attachment-list'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { TaskComment, TaskAttachment } from '../schemas'
import { MessageSquare, Paperclip, Loader2 } from 'lucide-react'

export function TaskCollaboration({ taskId }: { taskId: string }) {
  const [data, setData] = useState<{ comments: TaskComment[], attachments: TaskAttachment[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function loadData() {
    setLoading(true)
    const result = await getTaskCollaborationData(taskId)
    setData(result)
    setLoading(false)
  }

  // Load data when accordion is opened
  useEffect(() => {
    if (open && !data && !loading) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data, loading, taskId])

  // In a real app we might want to poll or use Supabase Realtime here, 
  // but for the MVP we load once or rely on the user to reopen the accordion.

  return (
    <Accordion type="single" collapsible onValueChange={(val) => setOpen(val === 'item-1')}>
      <AccordionItem value="item-1" className="border-none">
        <AccordionTrigger className="hover:no-underline py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" /> Discuții {data ? `(${data.comments.length})` : ''}
            </span>
            <span className="flex items-center gap-1">
              <Paperclip className="h-4 w-4" /> Atașamente {data ? `(${data.attachments.length})` : ''}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
          {!data && loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-4 text-sm">Comentarii</h4>
                <CommentThread taskId={taskId} comments={data.comments} onUpdate={loadData} />
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-sm">Fișiere atașate</h4>
                <AttachmentList taskId={taskId} attachments={data.attachments} onUpdate={loadData} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Eroare la încărcare.</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
