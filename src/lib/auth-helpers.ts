import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return user
}

export async function getCurrentUser() {
  const supabase = await createClient()
  
  // Get auth user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile }
}

export async function requireSuperAdmin() {
  const userData = await getCurrentUser()
  
  if (!userData?.user) {
    redirect('/login')
  }
  
  if (userData.profile?.role !== 'super_admin') {
    // If client, send them to portal
    redirect('/portal')
  }
  
  return userData
}
