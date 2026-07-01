'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createModule } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { EmptyState } from '@/components/shared/empty-state'
import { Layers, Plus, ArrowRight } from 'lucide-react'

import { type Module } from '../schemas'

export function ModuleList({ programId, modules }: { programId: string, modules: Module[] }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleAddModule(formData: FormData) {
    setLoading(true)
    const title = formData.get('title') as string
    const sort_order = modules.length // default append to end

    const result = await createModule({ program_id: programId, title, sort_order })
    if (result.error) {
      toast({ variant: 'destructive', title: 'Eroare', description: result.error })
    } else {
      toast({ title: 'Modul creat', description: 'Modulul a fost adăugat cu succes.' })
      const form = document.getElementById('module-form') as HTMLFormElement
      form.reset()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Adaugă Modul Nou</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="module-form" action={handleAddModule} className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Nume modul</label>
              <Input id="title" name="title" required placeholder="Ex: Etapa 1 - Analiză" />
            </div>
            <Button type="submit" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Adaugă
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold tracking-tight">Module existente</h3>
        
        {(!modules || modules.length === 0) ? (
          <EmptyState 
            title="Niciun modul existent" 
            description="Adaugă primul modul folosind formularul de mai sus."
            icon={<Layers className="h-8 w-8 text-muted-foreground" />}
          />
        ) : (
          <div className="space-y-4">
            {modules.map((mod, index) => (
              <Card key={mod.id}>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-lg">
                      <span className="text-muted-foreground mr-2">{index + 1}.</span>
                      {mod.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {mod.master_steps ? mod.master_steps.length : 0} pași
                    </p>
                  </div>
                  <Link href={`/agency/programs/${programId}/modules/${mod.id}`}>
                    <Button variant="outline" size="sm">
                      Gestionează Pași
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
