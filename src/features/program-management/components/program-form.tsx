'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProgram } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ProgramForm() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function onSubmit(formData: FormData) {
    setLoading(true)
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    const result = await createProgram({ title, description })
    
    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: result.error,
      })
    } else {
      toast({
        title: 'Program creat',
        description: 'Programul a fost creat cu succes.',
      })
      const form = document.getElementById('program-form') as HTMLFormElement
      form.reset()
      if (result.data) {
        router.push(`/agency/programs/${result.data.id}`)
      }
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Nou</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="program-form" action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">Titlu Program</label>
            <Input id="title" name="title" required placeholder="Ex: Digitalizare Finanțe" />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">Descriere (opțional)</label>
            <Textarea id="description" name="description" placeholder="Scurtă descriere a acestui program..." />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Se salvează...' : 'Creează Program'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
