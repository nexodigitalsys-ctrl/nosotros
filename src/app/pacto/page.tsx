import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PactoClient from './PactoClient'

export default async function PactoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id, member_slot, display_name')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) redirect('/onboarding')

  const { data: couple } = await supabase
    .from('couples')
    .select('id, pact_text, pact_signed_a, pact_signed_b')
    .eq('id', profile.couple_id)
    .single()

  if (!couple) redirect('/onboarding')

  return <PactoClient profile={profile} couple={couple} />
}
