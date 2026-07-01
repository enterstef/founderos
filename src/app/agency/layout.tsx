import { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, Users, BookOpen, LogOut } from 'lucide-react'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { signOut } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'

export default async function AgencyLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireSuperAdmin()

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 w-64 border-r bg-background flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <h1 className="text-xl font-bold tracking-tight">FoundersOS</h1>
        </div>
        
        <nav className="flex-1 space-y-1 p-4">
          <Link href="/agency/dashboard">
            <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </span>
          </Link>
          <Link href="/agency/programs">
            <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              Programe (Templates)
            </span>
          </Link>
          <Link href="/agency/clients">
            <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground">
              <Users className="h-4 w-4" />
              Clienți & Proiecte
            </span>
          </Link>
        </nav>

        <div className="p-4 border-t">
          <div className="mb-4 px-3">
            <p className="text-sm font-medium">{profile?.full_name || 'Admin'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <form action={signOut}>
            <Button variant="outline" className="w-full justify-start" type="submit">
              <LogOut className="mr-2 h-4 w-4" />
              Deconectare
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64">
        <div className="h-full p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
