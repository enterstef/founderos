import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-helpers'

export default async function HomePage() {
  const userData = await getCurrentUser()

  if (!userData?.user) {
    redirect('/login')
  }

  // Redirect based on role
  if (userData.profile?.role === 'super_admin') {
    redirect('/agency/dashboard')
  } else {
    redirect('/portal')
  }
}
