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
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('couple_id').eq('id', user.id).single()

        if (profile?.couple_id) {
          const { data: couple } = await supabase
            .from('couples').select('pact_signed_a, pact_signed_b').eq('id', profile.couple_id).single()

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
