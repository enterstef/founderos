'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { allocateProgramToClient } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { type Profile } from '../schemas'
import { type Program } from '@/features/program-management/schemas'

interface Props {
  client: Profile | null
  programs: Program[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AllocateProgramDialog({ client, programs, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  if (!client) return null

  async function onSubmit(formData: FormData) {
    setLoading(true)
    formData.append('client_id', client!.id)
    
    const result = await allocateProgramToClient(formData)
    
    if (result.error) {
      toast({ variant: 'destructive', title: 'Eroare', description: result.error })
    } else {
      toast({ title: 'Program alocat!', description: 'Proiectul și task-urile au fost clonate cu succes.' })
      onOpenChange(false)
      // Redirect to the new project
      if (result.projectId) {
        router.push(`/agency/clients/${result.projectId}`)
      }
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alocă Program Nou</DialogTitle>
          <DialogDescription>
            Clonăm un template master (program) într-un proiect complet izolat pentru clientul <strong>{client.full_name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">Titlul Noului Proiect</label>
            <Input id="title" name="title" required placeholder="Ex: Implementare ERP Q3" />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="program_id" className="text-sm font-medium">Alege Programul (Template-ul)</label>
            <Select name="program_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Selectează un program..." />
              </SelectTrigger>
              <SelectContent>
                {programs.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={loading}>
              Anulează
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Se clonează...' : 'Alocă și Clonează'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
