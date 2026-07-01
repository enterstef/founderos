import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_ROUTES = ['/login', '/callback']

export async function middleware(request: NextRequest) {
  // Update session first
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  // Ignore static assets and API routes (except if we need auth for API)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return response
  }

  // Create a minimal client just to check auth status in middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Handled by updateSession
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const userRole = request.cookies.get('user_role')?.value

    // If they try to go to login while logged in, redirect based on role
    if (pathname === '/login' || pathname === '/') {
      if (userRole === 'super_admin') {
        return NextResponse.redirect(new URL('/agency/dashboard', request.url))
      } else {
        // Find their project or just go to /portal
        return NextResponse.redirect(new URL('/portal', request.url))
      }
    }
    
    // Basic route protection by prefix
    if (pathname.startsWith('/agency')) {
      if (userRole !== 'super_admin') {
        return NextResponse.redirect(new URL('/portal', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
