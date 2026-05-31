'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

type Mode = 'choose' | 'creating' | 'created' | 'join'

export default function OnboardingPage() {
  const [mode, setMode] = useState<Mode>('choose')
  const [inviteCode, setInviteCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function handleCreate() {
    setLoading(true)
    setError('')
    const { data: coupleId, error: rpcError } = await supabase.rpc('create_couple')
    if (rpcError || !coupleId) {
      setError(rpcError?.message ?? 'Error al crear el espacio.')
      setLoading(false)
      return
    }
    const { data: couple } = await supabase
      .from('couples')
      .select('invite_code')
      .eq('id', coupleId)
      .single()
    setInviteCode(couple?.invite_code ?? '')
    setMode('created')
    setLoading(false)
  }

  async function handleJoin() {
    if (!inputCode.trim()) { setError('Introduce el código de invitación.'); return }
    setLoading(true)
    setError('')
    const { error: rpcError } = await supabase.rpc('join_couple', { code: inputCode.trim().toLowerCase() })
    if (rpcError) { setError(rpcError.message); setLoading(false); return }
    router.push('/pacto')
  }

  function shareWhatsApp() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const text = `Te invito a Nosotros, nuestro espacio privado para los próximos 30 días 💛\nÚnete aquí: ${appUrl}/join/${inviteCode}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-amber-50 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">

        {mode === 'choose' && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="w-full max-w-sm space-y-4"
          >
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🏡</div>
              <h1 className="text-2xl font-bold text-stone-800">Bienvenido/a</h1>
              <p className="text-stone-500 mt-2">¿Cómo quieres empezar?</p>
            </div>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-4 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-300 text-white font-semibold rounded-2xl transition-colors text-lg shadow-sm"
            >
              {loading ? 'Creando...' : 'Crear nuestro espacio'}
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-4 bg-white hover:bg-stone-50 text-stone-700 font-semibold rounded-2xl border border-stone-200 transition-colors text-lg"
            >
              Unirme con un código
            </button>
          </motion.div>
        )}

        {mode === 'created' && (
          <motion.div
            key="created"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="w-full max-w-sm"
          >
            <div className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-sm border border-rose-100 space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">✨</div>
                <h2 className="text-xl font-bold text-stone-800">Espacio creado</h2>
                <p className="text-stone-500 mt-1 text-sm">Comparte este código con tu pareja</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-5 text-center">
                <p className="text-xs text-stone-400 uppercase tracking-widest mb-2">Código de invitación</p>
                <p className="text-3xl font-mono font-bold text-rose-600 tracking-widest">{inviteCode}</p>
              </div>
              <button
                onClick={shareWhatsApp}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
              >
                Compartir por WhatsApp
              </button>
              <button
                onClick={() => router.push('/pacto')}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors"
              >
                Continuar al pacto →
              </button>
            </div>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="w-full max-w-sm"
          >
            <div className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-sm border border-rose-100 space-y-5">
              <div className="text-center">
                <div className="text-4xl mb-3">🔑</div>
                <h2 className="text-xl font-bold text-stone-800">Unirme al espacio</h2>
                <p className="text-stone-500 mt-1 text-sm">Introduce el código que te compartió tu pareja</p>
              </div>
              <input
                type="text"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toLowerCase())}
                placeholder="xxxxxxxx"
                maxLength={12}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800 placeholder-stone-400 font-mono text-center text-xl tracking-widest"
              />
              {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold rounded-xl transition-colors"
              >
                {loading ? 'Uniéndome...' : 'Unirme'}
              </button>
              <button
                onClick={() => { setMode('choose'); setError('') }}
                className="w-full py-2 text-stone-400 hover:text-stone-600 text-sm transition-colors"
              >
                Volver
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </main>
  )
}
