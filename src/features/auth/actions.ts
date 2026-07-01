'use server'

import { createClient } from '@/lib/supabase/server'
import { LoginSchema, type LoginInput } from './schemas'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function signIn(input: LoginInput) {
  // Validate input
  const parsed = LoginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Date de autentificare invalide.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    console.error("SignIn error:", error)
    return { error: String(error) }
  }

  // Cache the role in a cookie for the middleware
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile) {
      const cookieStore = await cookies()
      cookieStore.set('user_role', profile.role, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
    }
  }

  // Nu facem redirect din action (cel puțin nu cu NextResponse.redirect)
  // Redirecționarea va fi gestionată de client sau de middleware.
  // Alternativ, putem returna success și lăsa clientul să dea push la router.
  return { success: true }
}

export async function signUp(input: LoginInput) {
  const parsed = LoginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Date invalide.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    console.error("SignUp error:", error)
    return { error: String(error) }
  }

  return { success: true }
}



export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  const cookieStore = await cookies()
  cookieStore.delete('user_role')

  revalidatePath('/', 'layout')
  redirect('/login')
}
