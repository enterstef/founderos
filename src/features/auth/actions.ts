'use server'

import { createClient } from '@/lib/supabase/server'
import { LoginSchema, type LoginInput } from './schemas'
import { revalidatePath } from 'next/cache'

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
    return { error: error.message }
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
    return { error: error.message }
  }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return { success: true }
}
