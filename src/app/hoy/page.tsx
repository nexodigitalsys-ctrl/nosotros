import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HoyClient from './HoyClient'

export default async function HoyPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id, display_name, member_slot')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) redirect('/onboarding')

  const { data: couple } = await supabase
    .from('couples')
    .select('start_date')
    .eq('id', profile.couple_id)
    .single()

  const startDate = new Date(couple!.start_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const dayNumber = Math.max(1, Math.min(30, diffDays + 1))

  const [{ data: programDay }, { data: entries }, { data: partnerProfile }, { data: allEntries }] =
    await Promise.all([
      supabase.from('program_days').select('*').eq('day_number', dayNumber).single(),
      supabase.from('entries').select('*').eq('couple_id', profile.couple_id).eq('day_number', dayNumber),
      supabase.from('profiles').select('id, display_name').eq('couple_id', profile.couple_id).neq('id', user.id).single(),
      supabase.from('entries').select('user_id, day_number, reflection_es').eq('couple_id', profile.couple_id).not('reflection_es', 'is', null),
    ])

  // Streak: consecutive days ending today where both members completed
  const dayMap = new Map<number, Set<string>>()
  for (const e of allEntries ?? []) {
    if (!dayMap.has(e.day_number)) dayMap.set(e.day_number, new Set())
    dayMap.get(e.day_number)!.add(e.user_id)
  }
  let streak = 0
  for (let d = dayNumber; d >= 1; d--) {
    const users = dayMap.get(d)
    if (users && users.size >= 2) streak++
    else break
  }

  const myEntry = entries?.find(e => e.user_id === user.id) ?? null
  const partnerEntry = entries?.find(e => e.user_id !== user.id) ?? null

  return (
    <HoyClient
      userId={user.id}
      coupleId={profile.couple_id}
      myName={profile.display_name || 'Tú'}
      partnerName={partnerProfile?.display_name || 'Tu pareja'}
      partnerId={partnerProfile?.id ?? null}
      dayNumber={dayNumber}
      programDay={programDay}
      initialMyEntry={myEntry}
      initialPartnerEntry={partnerEntry}
      streak={streak}
    />
  )
}
