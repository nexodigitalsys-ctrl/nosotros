'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('code')
  const urlError = searchParams.get('error')
  const supabase = createClient()
  const router = useRouter()

  async function handleSend() {
    if (!email || !name) { setError('Completa los dos campos.'); return }
    setLoading(true)
    setError('')

    // No emailRedirectTo → Supabase envía OTP de 6 dígitos, sin PKCE, funciona cross-browser
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { data: { display_name: name }, shouldCreateUser: true },
    })

    setLoading(false)
    if (authError) { setError(authError.message); return }
    setStep('otp')
  }

  async function handleVerify() {
    if (otp.length < 6) { setError('Introduce los 6 dígitos.'); return }
    setLoading(true)
    setError('')

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    if (verifyError) { setError(verifyError.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles').select('couple_id').eq('id', user.id).single()

    if (profile?.couple_id) {
      const { data: couple } = await supabase
        .from('couples').select('pact_signed_a, pact_signed_b').eq('id', profile.couple_id).single()
      if (couple?.pact_signed_a && couple?.pact_signed_b) {
        router.push('/hoy')
      } else {
        router.push('/pacto')
      }
    } else if (inviteCode) {
      await supabase.rpc('join_couple', { code: inviteCode })
      router.push('/pacto')
    } else {
      router.push('/onboarding')
    }
  }

  if (step === 'otp') {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="text-4xl">📬</div>
          <h2 className="text-lg font-semibold text-stone-800">Revisa tu correo</h2>
          <p className="text-stone-500 text-sm">
            Enviamos un código de 6 dígitos a{' '}
            <strong className="text-stone-700">{email}</strong>
          </p>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          autoFocus
          className="w-full px-4 py-4 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800 placeholder-stone-400 font-mono text-center text-3xl tracking-widest"
        />
        {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
        <button
          onClick={handleVerify}
          disabled={otp.length < 6 || loading}
          className="w-full py-3 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-300 text-white font-semibold rounded-xl transition-colors"
        >
          {loading ? 'Verificando…' : 'Entrar →'}
        </button>
        <button
          onClick={() => { setStep('form'); setError(''); setOtp('') }}
          className="w-full py-2 text-stone-400 hover:text-stone-600 text-sm transition-colors"
        >
          Cambiar correo
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">Tu nombre</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="¿Cómo te llamas?"
          className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800 placeholder-stone-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">Tu correo</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="tu@correo.com"
          className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800 placeholder-stone-400"
        />
      </div>
      {(error || urlError) && (
        <p className="text-rose-500 text-sm">{error || urlError}</p>
      )}
      <button
        onClick={handleSend}
        disabled={loading}
        className="w-full py-3 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-300 text-white font-semibold rounded-xl transition-colors"
      >
        {loading ? 'Enviando…' : 'Enviar código'}
      </button>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-amber-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">Nosotros</h1>
          <p className="text-stone-500 mt-2">30 días para reconectarnos</p>
        </div>
        <div className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-sm border border-rose-100">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
