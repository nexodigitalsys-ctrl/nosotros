'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

type ProgramDay = {
  day_number: number
  week_number: number
  theme_key: string
  question_es: string
  gesture_es: string
}

type Entry = {
  id: string
  couple_id: string
  user_id: string
  day_number: number
  connection_score: number | null
  mood: string | null
  reflection_es: string | null
  gesture_done: boolean
}

type Comment = {
  id: string
  entry_id: string
  author_id: string
  body: string
  created_at: string
}

type Step = 'termometro' | 'pregunta' | 'gesto' | 'revelacion'

const STEPS: Step[] = ['termometro', 'pregunta', 'gesto', 'revelacion']

const MOODS = [
  { key: 'agotado',   emoji: '😔', label: 'Agotado/a' },
  { key: 'neutro',    emoji: '😐', label: 'Neutro' },
  { key: 'bien',      emoji: '🙂', label: 'Bien' },
  { key: 'contento',  emoji: '😊', label: 'Contento/a' },
  { key: 'conectado', emoji: '🥰', label: 'Conectado/a' },
]

interface Props {
  userId: string
  coupleId: string
  myName: string
  partnerName: string
  partnerId: string | null
  dayNumber: number
  programDay: ProgramDay | null
  initialMyEntry: Entry | null
  initialPartnerEntry: Entry | null
  streak: number
}

function resolveStep(entry: Entry | null): Step {
  if (!entry || entry.connection_score === null) return 'termometro'
  if (!entry.reflection_es) return 'pregunta'
  if (!entry.gesture_done) return 'gesto'
  return 'revelacion'
}

export default function HoyClient({
  userId, coupleId, myName, partnerName, dayNumber,
  programDay, initialMyEntry, initialPartnerEntry, streak,
}: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [myEntry, setMyEntry] = useState<Entry | null>(initialMyEntry)
  const [partnerEntry, setPartnerEntry] = useState<Entry | null>(initialPartnerEntry)
  const [step, setStep] = useState<Step>(resolveStep(initialMyEntry))

  const [score, setScore] = useState(initialMyEntry?.connection_score ?? 5)
  const [mood, setMood] = useState(initialMyEntry?.mood ?? '')
  const [reflection, setReflection] = useState(initialMyEntry?.reflection_es ?? '')
  const [gestureDone, setGestureDone] = useState(initialMyEntry?.gesture_done ?? false)
  const [saving, setSaving] = useState(false)

  const [comments, setComments] = useState<Comment[]>([])
  const [comment, setComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  const bothRevealed = !!(myEntry?.reflection_es && partnerEntry?.reflection_es)

  // Realtime: entries de la pareja
  useEffect(() => {
    const channel = supabase
      .channel(`hoy-entries-${coupleId}-${dayNumber}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'entries',
        filter: `couple_id=eq.${coupleId}`,
      }, (payload) => {
        const entry = payload.new as Entry
        if (entry.day_number !== dayNumber) return
        if (entry.user_id === userId) setMyEntry(entry)
        else setPartnerEntry(entry)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coupleId, dayNumber, userId]) // eslint-disable-line

  // Realtime + carga inicial de comentarios
  useEffect(() => {
    if (!bothRevealed) return
    const ids = [myEntry?.id, partnerEntry?.id].filter(Boolean) as string[]
    if (!ids.length) return

    supabase.from('comments').select('*').in('entry_id', ids)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setComments(data) })

    const channel = supabase
      .channel(`hoy-comments-${coupleId}-${dayNumber}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'comments',
      }, (payload) => {
        const c = payload.new as Comment
        if (ids.includes(c.entry_id)) setComments(prev => [...prev, c])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [bothRevealed, myEntry?.id, partnerEntry?.id]) // eslint-disable-line

  async function upsertEntry(data: Partial<Entry>) {
    setSaving(true)
    const { data: result, error } = await supabase
      .from('entries')
      .upsert({
        couple_id: coupleId,
        user_id: userId,
        day_number: dayNumber,
        updated_at: new Date().toISOString(),
        ...data,
      }, { onConflict: 'couple_id,user_id,day_number' })
      .select()
      .single()
    setSaving(false)
    if (!error && result) setMyEntry(result)
    return !error
  }

  async function handleTermometro() {
    if (!mood) return
    const ok = await upsertEntry({ connection_score: score, mood })
    if (ok) setStep('pregunta')
  }

  async function handlePregunta() {
    if (!reflection.trim()) return
    const ok = await upsertEntry({ reflection_es: reflection.trim() })
    if (ok) setStep('gesto')
  }

  async function handleGesto() {
    const ok = await upsertEntry({ gesture_done: gestureDone })
    if (ok) setStep('revelacion')
  }

  async function handleComment() {
    if (!comment.trim() || !myEntry) return
    setSavingComment(true)
    await supabase.from('comments').insert({
      entry_id: myEntry.id,
      author_id: userId,
      body: comment.trim(),
    })
    setComment('')
    setSavingComment(false)
  }

  const slide = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
    transition: { duration: 0.22 },
  }

  const myFirst = myName.split(' ')[0]
  const partnerFirst = partnerName.split(' ')[0]

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-amber-50 flex flex-col">

      {/* Header */}
      <header className="px-6 pt-10 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest">Día {dayNumber} · semana {programDay?.week_number}</p>
            <h1 className="text-xl font-bold text-stone-800 capitalize">{programDay?.theme_key ?? '—'}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400">Constancia</p>
            <p className="text-lg font-bold text-rose-500">{streak} 🔥</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              s === step ? 'bg-rose-400' :
              STEPS.indexOf(s) < STEPS.indexOf(step) ? 'bg-rose-300' : 'bg-stone-200'
            }`} />
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-28">
        <AnimatePresence mode="wait">

          {/* PASO 1 — Termómetro */}
          {step === 'termometro' && (
            <motion.div key="termometro" {...slide} className="space-y-6 pt-2">
              <p className="text-stone-600 text-center text-base">¿Cómo sientes la conexión hoy?</p>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-stone-400 px-1">
                  <span>0 · Lejos</span>
                  <span className="text-2xl font-bold text-rose-500 leading-none">{score}</span>
                  <span>10 · Muy cerca</span>
                </div>
                <input
                  type="range" min={0} max={10} step={1}
                  value={score}
                  onChange={e => setScore(Number(e.target.value))}
                  className="w-full accent-rose-500 h-2"
                />
              </div>

              <div>
                <p className="text-sm text-stone-500 mb-3 text-center">¿Y tu ánimo?</p>
                <div className="grid grid-cols-5 gap-2">
                  {MOODS.map(m => (
                    <button key={m.key} onClick={() => setMood(m.key)}
                      className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all ${
                        mood === m.key ? 'border-rose-400 bg-rose-50' : 'border-stone-200 bg-white'
                      }`}>
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="text-xs text-stone-500 mt-1 leading-tight text-center">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleTermometro} disabled={!mood || saving}
                className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold rounded-xl transition-colors">
                {saving ? 'Guardando…' : 'Continuar →'}
              </button>
            </motion.div>
          )}

          {/* PASO 2 — Pregunta */}
          {step === 'pregunta' && (
            <motion.div key="pregunta" {...slide} className="space-y-5 pt-2">
              <div className="bg-white/80 rounded-2xl p-6 border border-rose-100 shadow-sm">
                <p className="text-xs text-rose-400 uppercase tracking-widest mb-3">Pregunta del día</p>
                <p className="text-stone-700 text-lg leading-relaxed font-medium">{programDay?.question_es}</p>
              </div>
              <textarea
                value={reflection}
                onChange={e => setReflection(e.target.value)}
                placeholder="Escribe tu respuesta aquí…"
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800 placeholder-stone-400 resize-none"
              />
              <button onClick={handlePregunta} disabled={!reflection.trim() || saving}
                className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold rounded-xl transition-colors">
                {saving ? 'Guardando…' : 'Continuar →'}
              </button>
            </motion.div>
          )}

          {/* PASO 3 — Gesto */}
          {step === 'gesto' && (
            <motion.div key="gesto" {...slide} className="space-y-5 pt-2">
              <div className="text-center pt-2">
                <div className="text-5xl mb-3">🤝</div>
                <p className="text-xs text-rose-400 uppercase tracking-widest">Gesto del día</p>
              </div>
              <div className="bg-white/80 rounded-2xl p-6 border border-rose-100 shadow-sm">
                <p className="text-stone-700 text-lg leading-relaxed">{programDay?.gesture_es}</p>
              </div>
              <label className="flex items-center gap-3 bg-white rounded-xl p-4 border border-stone-200 cursor-pointer select-none">
                <input
                  type="checkbox" checked={gestureDone}
                  onChange={e => setGestureDone(e.target.checked)}
                  className="w-5 h-5 accent-rose-500 rounded"
                />
                <span className="text-stone-700">Lo he hecho hoy</span>
              </label>
              <button onClick={handleGesto} disabled={saving}
                className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold rounded-xl transition-colors">
                {saving ? 'Guardando…' : gestureDone ? 'Completado ✓ · Continuar →' : 'Continuar →'}
              </button>
            </motion.div>
          )}

          {/* PASO 4 — Revelación */}
          {step === 'revelacion' && (
            <motion.div key="revelacion" {...slide} className="space-y-5 pt-2">
              {!bothRevealed ? (
                <div className="text-center space-y-5 pt-8">
                  <div className="text-6xl">🔒</div>
                  <h2 className="text-lg font-semibold text-stone-700">Tu parte está guardada</h2>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    La revelación aparece cuando los dos respondan.<br />
                    Está bloqueada para que sea honesta.
                  </p>
                  <div className="flex gap-3 justify-center pt-1">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      myEntry?.reflection_es ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-400'
                    }`}>
                      {myFirst} {myEntry?.reflection_es ? '✓' : '…'}
                    </span>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      partnerEntry?.reflection_es ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-400'
                    }`}>
                      {partnerFirst} {partnerEntry?.reflection_es ? '✓' : '…'}
                    </span>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-5"
                >
                  <div className="text-center pt-1">
                    <div className="text-4xl mb-2">💛</div>
                    <h2 className="text-xl font-bold text-stone-700">Revelación</h2>
                    <p className="text-xs text-stone-400 mt-1">Día {dayNumber} — {programDay?.theme_key}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white/80 rounded-2xl p-5 border border-rose-100 shadow-sm">
                      <p className="text-xs text-rose-400 font-bold uppercase tracking-widest mb-2">{myFirst}</p>
                      <p className="text-stone-700 leading-relaxed">{myEntry?.reflection_es}</p>
                    </div>
                    <div className="bg-amber-50/90 rounded-2xl p-5 border border-amber-100 shadow-sm">
                      <p className="text-xs text-amber-500 font-bold uppercase tracking-widest mb-2">{partnerFirst}</p>
                      <p className="text-stone-700 leading-relaxed">{partnerEntry?.reflection_es}</p>
                    </div>
                  </div>

                  {/* Scores del día */}
                  {(myEntry?.connection_score !== null || partnerEntry?.connection_score !== null) && (
                    <div className="flex gap-3">
                      {myEntry?.connection_score !== null && (
                        <div className="flex-1 bg-white/70 rounded-xl p-3 border border-stone-100 text-center">
                          <p className="text-xs text-stone-400">{myFirst}</p>
                          <p className="text-2xl font-bold text-rose-500">{myEntry.connection_score}</p>
                          <p className="text-lg">{MOODS.find(m => m.key === myEntry.mood)?.emoji ?? ''}</p>
                        </div>
                      )}
                      {partnerEntry?.connection_score !== null && (
                        <div className="flex-1 bg-white/70 rounded-xl p-3 border border-stone-100 text-center">
                          <p className="text-xs text-stone-400">{partnerFirst}</p>
                          <p className="text-2xl font-bold text-rose-500">{partnerEntry.connection_score}</p>
                          <p className="text-lg">{MOODS.find(m => m.key === partnerEntry.mood)?.emoji ?? ''}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comentarios */}
                  <div className="space-y-3 pt-1">
                    <p className="text-sm font-semibold text-stone-600">Comentarios</p>
                    {comments.length === 0 && (
                      <p className="text-xs text-stone-400 text-center py-3">Ninguno todavía — ¿quieres decir algo?</p>
                    )}
                    <div className="space-y-2">
                      {comments.map(c => (
                        <div key={c.id} className={`rounded-xl p-3 text-sm ${
                          c.author_id === userId
                            ? 'bg-rose-50 text-stone-700 ml-8'
                            : 'bg-stone-50 text-stone-700 mr-8'
                        }`}>
                          <p className="text-xs text-stone-400 mb-1 font-medium">
                            {c.author_id === userId ? myFirst : partnerFirst}
                          </p>
                          {c.body}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text" value={comment}
                        onChange={e => setComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                        placeholder="Añade un comentario…"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 text-stone-800 placeholder-stone-400"
                      />
                      <button onClick={handleComment} disabled={!comment.trim() || savingComment}
                        className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white rounded-xl text-sm font-bold transition-colors">
                        →
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Nav inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-stone-100 safe-area-pb">
        <div className="flex justify-around max-w-md mx-auto px-4 py-2">
          {[
            { icon: '🏡', label: 'Hoy',      href: '/hoy',  active: true },
            { icon: '💬', label: 'Convos',   href: null,    active: false },
            { icon: '📜', label: 'Pacto',    href: '/pacto',active: false },
            { icon: '📈', label: 'Progreso', href: null,    active: false },
          ].map(item => (
            <button key={item.label}
              onClick={() => item.href && router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors ${
                item.active ? 'text-rose-500' :
                item.href ? 'text-stone-400 hover:text-stone-600' : 'text-stone-200 cursor-default'
              }`}>
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

    </div>
  )
}
