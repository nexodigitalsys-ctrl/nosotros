import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HoyPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id, display_name')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) redirect('/onboarding')

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-amber-50 flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="text-6xl">🌱</div>
        <h1 className="text-2xl font-bold text-stone-800">El ritual del día</h1>
        <p className="text-stone-500">Próximamente — estamos construyendo este espacio para vosotros.</p>
        <p className="text-stone-400 text-sm">Hola, {profile.display_name} 👋</p>
      </div>
    </main>
  )
}
