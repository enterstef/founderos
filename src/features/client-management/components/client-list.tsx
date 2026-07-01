'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { AllocateProgramDialog } from './allocate-program-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { Users } from 'lucide-react'
import { type Profile, type Project } from '../schemas'
import { type Program } from '@/features/program-management/schemas'
import Link from 'next/link'

export function ClientList({ 
  clients, 
  projects,
  programs 
}: { 
  clients: Profile[], 
  projects: Project[],
  programs: Program[]
}) {
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null)

  if (!clients || clients.length === 0) {
    return (
      <EmptyState 
        title="Niciun client găsit"
        description="Nu ai clienți înregistrați. Trimite link-ul de sign up clienților tăi."
        icon={<Users className="h-8 w-8 text-muted-foreground" />}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => {
          const clientProjects = projects.filter(p => p.client_id === client.id)
          
          return (
            <Card key={client.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">{client.full_name}</CardTitle>
                <CardDescription>{client.email}</CardDescription>
              </CardHeader>
              
              <div className="flex-1 px-6 pb-4">
                <h4 className="text-sm font-semibold mb-3">Proiecte alocate:</h4>
                {clientProjects.length > 0 ? (
                  <ul className="space-y-2">
                    {clientProjects.map(proj => (
                      <li key={proj.id} className="text-sm">
                        <Link href={`/agency/clients/${proj.id}`} className="text-primary hover:underline">
                          {proj.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Niciun proiect alocat.</p>
                )}
              </div>
              
              <CardFooter className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setSelectedClient(client)}
                >
                  Alocă un Program Nou
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <AllocateProgramDialog 
        client={selectedClient} 
        programs={programs}
        open={!!selectedClient} 
        onOpenChange={(open) => !open && setSelectedClient(null)} 
      />
    </div>
  )
}
