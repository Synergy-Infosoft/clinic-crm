"use client";

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { BellRing, Clock3, Home, MapPin, RefreshCw, Smartphone } from 'lucide-react'

interface RegistrationStatus {
  token_number: number
  patient_name: string
  status: 'pending' | 'completed' | 'cancelled'
  queue_position: number | null
  registered_at: string
}

function Confetti({ enabled }: { enabled: boolean }) {
  const pieces = useMemo(() => {
    if (!enabled) return []
    const colors = ['#1D9E75', '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA']
    return Array.from({ length: 36 }, (_, id) => ({
      id,
      color: colors[id % colors.length],
      left: `${(id * 37) % 100}%`,
      delay: `${(id % 8) * 0.12}s`,
      duration: `${2.4 + (id % 5) * 0.3}s`,
      size: `${6 + (id % 4) * 2}px`,
    }))
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: piece.left,
            top: '-20px',
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            animationDuration: piece.duration,
            animationDelay: piece.delay,
          }}
        />
      ))}
    </div>
  )
}

function AnimatedCheckmark() {
  return (
    <div className="flex items-center justify-center mb-6" aria-hidden="true">
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
        <circle className="checkmark-circle" cx="50" cy="50" r="44" stroke="#1D9E75" strokeWidth="4" />
        <path
          className="checkmark-check"
          d="M28 52 L44 68 L72 34"
          stroke="#1D9E75"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function ConfirmationContent() {
  const params = useSearchParams()
  const reference = params?.get('ref') ?? ''
  const [status, setStatus] = useState<RegistrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)

  const updateStatus = async (background = false) => {
    if (!reference) {
      setError('This confirmation link is incomplete. Please register again or contact reception.')
      setLoading(false)
      return
    }

    if (background) setRefreshing(true)
    try {
      const response = await fetch(`/api/registration-status?ref=${encodeURIComponent(reference)}`, {
        cache: 'no-store',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to load registration')
      setStatus(result)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load registration')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setShowConfetti(!reduceMotion)
    updateStatus()
    const interval = window.setInterval(() => updateStatus(true), 30_000)
    const confettiTimer = window.setTimeout(() => setShowConfetti(false), 4_000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(confettiTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" aria-busy="true">
        <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
        <span className="sr-only">Loading registration confirmation</span>
      </main>
    )
  }

  if (!status) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Confirmation unavailable</h1>
          <p className="text-sm text-slate-600 mt-2">{error}</p>
          <Link href="/register" className="inline-flex mt-5 h-11 items-center px-4 rounded-lg bg-[#1D9E75] text-white font-medium">
            Return to registration
          </Link>
        </div>
      </main>
    )
  }

  const instructions = [
    { icon: MapPin, title: 'Take a seat', description: 'Please wait in the clinic waiting area.' },
    { icon: BellRing, title: 'Listen for your token', description: 'Reception will call your token number.' },
    { icon: Clock3, title: 'Follow staff guidance', description: 'Proceed when the reception team asks you.' },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F0FDF9] to-white">
      <Confetti enabled={showConfetti} />
      <div className="max-w-lg mx-auto px-4 py-8">
        <p className="text-center text-sm font-semibold text-[#1D9E75] mb-6">ClinicFlow Medical Center</p>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center mb-4" aria-live="polite">
          <AnimatedCheckmark />
          <p className="text-slate-500 text-sm font-medium mb-1">Registration successful</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Welcome, {status.patient_name}!</h1>

          <div className="token-badge mb-6" aria-label={`Your token number is ${status.token_number}`}>
            <span>{status.token_number}</span>
          </div>
          <p className="text-sm text-slate-500">Your token number</p>

          {status.queue_position !== null && status.status !== 'completed' && status.status !== 'cancelled' && (
            <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
              <span>{status.queue_position === 1 ? 'You are next in queue' : `You are #${status.queue_position} in queue`}</span>
              <button
                type="button"
                onClick={() => updateStatus(true)}
                disabled={refreshing}
                className="w-9 h-9 inline-flex items-center justify-center hover:bg-blue-100 rounded-full disabled:opacity-50"
                aria-label="Refresh queue position"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-3">
            Registered on {format(new Date(status.registered_at), 'dd MMM yyyy')} at {format(new Date(status.registered_at), 'hh:mm a')}
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <h2 className="text-base font-semibold text-slate-900 mb-4">What to do next</h2>
          <div className="space-y-4">
            {instructions.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#E8F8F2] rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <Icon className="w-5 h-5 text-[#1D9E75]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{title}</p>
                  <p className="text-sm text-slate-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <Smartphone className="w-5 h-5 text-amber-700 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Keep this page handy</p>
            <p className="text-sm text-amber-700 mt-1">Show token #{status.token_number} at reception if asked.</p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/register" className="inline-flex min-h-11 items-center gap-2 text-sm text-[#1D9E75] font-medium hover:underline">
            <Home className="w-4 h-4" aria-hidden="true" />
            Register another patient
          </Link>
          <p className="text-xs text-slate-400 mt-3">Queue position refreshes every 30 seconds</p>
        </div>
      </div>
    </main>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F8FAFC]" />}>
      <ConfirmationContent />
    </Suspense>
  )
}
