import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, BookOpen } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'

import { type Program } from '../schemas'

export function ProgramList({ programs }: { programs: Program[] }) {
  if (!programs || programs.length === 0) {
    return (
      <EmptyState 
        title="Niciun program existent" 
        description="Nu ai creat încă niciun program. Adaugă primul program folosind formularul de mai sus."
        icon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
      />
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {programs.map((program) => (
        <Card key={program.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl">{program.title}</CardTitle>
            {program.description && (
              <CardDescription className="line-clamp-2 mt-2">
                {program.description}
              </CardDescription>
            )}
          </CardHeader>
          <div className="flex-1" />
          <CardFooter className="pt-4 border-t">
            <Link href={`/agency/programs/${program.id}`} className="w-full">
              <Button variant="ghost" className="w-full justify-between">
                Vezi module
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
