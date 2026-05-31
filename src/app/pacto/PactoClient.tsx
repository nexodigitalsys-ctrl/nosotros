'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Profile {
  member_slot: string
  display_name: string
}

interface Couple {
  id: string
  pact_text: string
  pact_signed_a: string | null
  pact_signed_b: string | null
}

export default function PactoClient({ profile, couple }: { profile: Profile; couple: Couple }) {
  const [signedA, setSignedA] = useState(!!couple.pact_signed_a)
  const [signedB, setSignedB] = useState(!!couple.pact_signed_b)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const mySlot = profile.member_slot
  const mySigned = mySlot === 'a' ? signedA : signedB
  const bothSigned = signedA && signedB

  // Realtime: detecta cuando la pareja firma
  useEffect(() => {
    const channel = supabase
      .channel('pacto')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` },
        (payload) => {
          const updated = payload.new as Couple
          setSignedA(!!updated.pact_signed_a)
          setSignedB(!!updated.pact_signed_b)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [couple.id, supabase])

  async function handleSign() {
    setLoading(true)
    const field = mySlot === 'a' ? 'pact_signed_a' : 'pact_signed_b'
    const { error } = await supabase
      .from('couples')
      .update({ [field]: new Date().toISOString() })
      .eq('id', couple.id)
    if (!error) {
      if (mySlot === 'a') setSignedA(true)
      else setSignedB(true)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-amber-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Nuestro pacto</h1>
          <p className="text-stone-500 mt-1 text-sm">30 días para reconectarnos</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-sm border border-rose-100 space-y-7">
          <blockquote className="text-stone-700 leading-relaxed text-center italic border-l-4 border-rose-200 pl-4">
            {couple.pact_text}
          </blockquote>

          <div className="flex justify-center gap-10">
            <div className={`flex flex-col items-center gap-2 transition-colors ${signedA ? 'text-rose-500' : 'text-stone-300'}`}>
              <span className="text-2xl">{signedA ? '✍️' : '○'}</span>
              <span className="text-xs font-medium uppercase tracking-wide">
                {mySlot === 'a' ? profile.display_name || 'Tú' : 'Tu pareja'}
              </span>
            </div>
            <div className={`flex flex-col items-center gap-2 transition-colors ${signedB ? 'text-rose-500' : 'text-stone-300'}`}>
              <span className="text-2xl">{signedB ? '✍️' : '○'}</span>
              <span className="text-xs font-medium uppercase tracking-wide">
                {mySlot === 'b' ? profile.display_name || 'Tú' : 'Tu pareja'}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!mySigned && (
              <motion.button
                key="sign"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleSign}
                disabled={loading}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-300 text-white font-semibold rounded-xl transition-colors"
              >
                {loading ? 'Firmando...' : 'Firmo este pacto'}
              </motion.button>
            )}

            {mySigned && !bothSigned && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-stone-500 text-sm bg-amber-50 rounded-xl p-4 border border-amber-100"
              >
                <p>Has firmado 💛</p>
                <p className="mt-1">Esperando que tu pareja también firme…</p>
              </motion.div>
            )}

            {bothSigned && (
              <motion.button
                key="start"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => router.push('/hoy')}
                className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold rounded-xl text-lg shadow-md hover:shadow-lg transition-shadow"
              >
                Empezar juntos 🌱
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  )
}
