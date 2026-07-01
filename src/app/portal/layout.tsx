import { ReactNode } from 'react'
import Link from 'next/link'
import { requireAuth, getCurrentUser } from '@/lib/auth-helpers'
import { signOut } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { LogOut, Target } from 'lucide-react'

export default async function PortalLayout({ children }: { children: ReactNode }) {
  await requireAuth()
  const userData = await getCurrentUser()
  const user = userData?.user
  const profile = userData?.profile

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      {/* Header Navigation */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Target className="h-6 w-6 text-primary" />
          <span>Portal Clienți</span>
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          <div className="text-sm text-right hidden sm:block">
            <p className="font-medium leading-none">{profile?.full_name || 'Client'}</p>
            <p className="text-muted-foreground mt-1 text-xs">{user?.email}</p>
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="icon" type="submit" title="Deconectare">
              <LogOut className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-8 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
