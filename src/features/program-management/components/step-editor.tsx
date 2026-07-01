'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createStep } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { EmptyState } from '@/components/shared/empty-state'
import { ListTodo, Plus } from 'lucide-react'

import { type Step } from '../schemas'

export function StepEditor({ moduleId, steps }: { moduleId: string, steps: Step[] }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleAddStep(formData: FormData) {
    setLoading(true)
    const title = formData.get('title') as string
    const content_instructions = formData.get('content_instructions') as string
    const estimated_minutes = parseInt(formData.get('estimated_minutes') as string) || 15
    const track_type = formData.get('track_type') as 'business' | 'execution'
    const sort_order = steps.length

    const result = await createStep({ 
      module_id: moduleId, 
      title, 
      content_instructions, 
      estimated_minutes, 
      track_type, 
      sort_order 
    })

    if (result.error) {
      toast({ variant: 'destructive', title: 'Eroare', description: result.error })
    } else {
      toast({ title: 'Pas creat', description: 'Pasul a fost adăugat cu succes.' })
      const form = document.getElementById('step-form') as HTMLFormElement
      form.reset()
    }
    setLoading(false)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* List of existing steps */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold tracking-tight">Pașii acestui modul</h3>
        {(!steps || steps.length === 0) ? (
          <EmptyState 
            title="Niciun pas existent" 
            description="Adaugă primul pas folosind formularul alăturat."
            icon={<ListTodo className="h-8 w-8 text-muted-foreground" />}
          />
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => (
              <Card key={step.id}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-md">
                      <span className="text-muted-foreground mr-2">{index + 1}.</span>
                      {step.title}
                    </CardTitle>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {step.track_type} • {step.estimated_minutes}m
                    </span>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add new step form */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Adaugă Pas Nou</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="step-form" action={handleAddStep} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">Titlu pas</label>
                <Input id="title" name="title" required placeholder="Ex: Definește avatarul clientului" />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="content_instructions" className="text-sm font-medium">Instrucțiuni (Markdown suportat)</label>
                <Textarea 
                  id="content_instructions" 
                  name="content_instructions" 
                  required 
                  placeholder="Scrie instrucțiunile clare pentru acest pas..." 
                  className="min-h-[150px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="estimated_minutes" className="text-sm font-medium">Minute estimate</label>
                  <Input id="estimated_minutes" name="estimated_minutes" type="number" min="1" defaultValue="15" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="track_type" className="text-sm font-medium">Tip track</label>
                  <Select name="track_type" defaultValue="execution">
                    <SelectTrigger>
                      <SelectValue placeholder="Alege tip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business (Analiză)</SelectItem>
                      <SelectItem value="execution">Execution (Tehnic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {loading ? 'Se adaugă...' : 'Adaugă Pas'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
