import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function JoinPage({ params }: { params: { code: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?code=${params.code}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (profile?.couple_id) {
    redirect('/pacto')
  }

  const { error } = await supabase.rpc('join_couple', { code: params.code })

  if (error) {
    redirect('/onboarding?error=invalid_code')
  }

  redirect('/pacto')
}
