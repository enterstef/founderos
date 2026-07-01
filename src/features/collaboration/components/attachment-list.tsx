'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveAttachment, getDownloadUrl } from '../actions'
import type { TaskAttachment } from '../schemas'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Paperclip, Download, Loader2 } from 'lucide-react'

export function AttachmentList({ taskId, attachments }: { taskId: string, attachments: TaskAttachment[] }) {
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return toast({ variant: 'destructive', title: 'Fișier prea mare', description: 'Limita este de 10MB.' })
    }

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const storagePath = `${taskId}/${crypto.randomUUID()}.${fileExt}`

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(storagePath, file)

    if (uploadError) {
      toast({ variant: 'destructive', title: 'Eroare upload', description: uploadError.message })
      setUploading(false)
      return
    }

    // 2. Save metadata to DB
    const res = await saveAttachment({
      task_id: taskId,
      file_name: file.name,
      storage_path: storagePath
    })

    if (res.error) {
      toast({ variant: 'destructive', title: 'Eroare salvare', description: res.error })
    } else {
      toast({ title: 'Fișier încărcat cu succes' })
    }
    
    setUploading(false)
    e.target.value = '' // reset input
  }

  async function handleDownload(path: string, fileName: string) {
    const res = await getDownloadUrl(path)
    if (res.error) {
      toast({ variant: 'destructive', title: 'Eroare', description: res.error })
      return
    }
    
    if (res.url) {
      // Create a temporary link to download
      const link = document.createElement('a')
      link.href = res.url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="space-y-4">
      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center justify-between p-2 rounded-md border text-sm bg-muted/10">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate" title={file.file_name}>{file.file_name}</span>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => handleDownload(file.storage_path, file.file_name)}>
                <Download className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <input 
          type="file" 
          id={`file-${taskId}`} 
          className="hidden" 
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <Button 
          variant="outline" 
          size="sm" 
          disabled={uploading}
          onClick={() => document.getElementById(`file-${taskId}`)?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="mr-2 h-4 w-4" />
          )}
          {uploading ? 'Se încarcă...' : 'Atașează Fișier'}
        </Button>
      </div>
    </div>
  )
}
