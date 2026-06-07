import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'
  const errDesc = searchParams.get('error_description') ?? searchParams.get('error')

  if (errDesc) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errDesc)}`)
  }

  if (code) {
    // DEBUG: log cookie names to check for PKCE code-verifier
    const allCookies = request.headers.get('cookie') ?? ''
    const cookieNames = allCookies.split(';').map(c => c.trim().split('=')[0])
    console.log('[callback] cookie names:', cookieNames)
    console.log('[callback] has verifier:', cookieNames.some(n => n.includes('code-verifier')))

    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[callback] exchange error:', error.status, error.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('couple_id')
          .eq('id', user.id)
          .single()

        if (profile?.couple_id) {
          const { data: couple } = await supabase
            .from('couples')
            .select('pact_signed_a, pact_signed_b')
            .eq('id', profile.couple_id)
            .single()

          if (couple?.pact_signed_a && couple?.pact_signed_b) {
            return NextResponse.redirect(`${origin}/hoy`)
          }
          return NextResponse.redirect(`${origin}/pacto`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
