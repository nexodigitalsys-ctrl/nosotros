'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const supabase = createClient()

  async function handleSend() {
    if (!email || !name) { setError('Completa los dos campos.'); return }
    setLoading(true)
    setError('')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const redirectTo = `${appUrl}/auth/callback${code ? `?next=/join/${code}` : ''}`

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { display_name: name },
        emailRedirectTo: redirectTo,
      },
    })

    setLoading(false)
    if (authError) { setError(authError.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl">💌</div>
        <h2 className="text-xl font-semibold text-stone-800">Revisa tu correo</h2>
        <p className="text-stone-500 text-sm">
          Te enviamos un enlace a <strong className="text-stone-700">{email}</strong>.<br />
          Solo tienes que hacer clic en él.
        </p>
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
          placeholder="tu@correo.com"
          className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800 placeholder-stone-400"
        />
      </div>
      {error && <p className="text-rose-500 text-sm">{error}</p>}
      <button
        onClick={handleSend}
        disabled={loading}
        className="w-full py-3 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-300 text-white font-semibold rounded-xl transition-colors"
      >
        {loading ? 'Enviando...' : 'Entrar con enlace mágico'}
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
