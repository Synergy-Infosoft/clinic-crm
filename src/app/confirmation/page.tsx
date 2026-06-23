"use client";

import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Home, RefreshCw } from 'lucide-react'
import * as dataService from '@/lib/dataService'

// Confetti component
function Confetti() {
  const colors = ['#1D9E75', '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA']
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 3}s`,
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 360}deg`,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            top: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDuration: p.duration,
            animationDelay: p.delay,
            transform: `rotate(${p.rotate})`,
          }}
        />
      ))}
    </div>
  )
}

function AnimatedCheckmark() {
  return (
    <div className="flex items-center justify-center mb-6">
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
        <circle
          className="checkmark-circle"
          cx="50"
          cy="50"
          r="44"
          stroke="#1D9E75"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
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
  const tokenNumber = params?.get('token') ?? '?'
  const patientName = decodeURIComponent(params?.get('name') ?? 'Patient')
  const visitId = params?.get('visitId') ?? ''
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const [showConfetti, setShowConfetti] = useState(true)
  const [registrationTime] = useState(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateQueuePosition = async () => {
    try {
      const todayVisits = await dataService.getVisits(format(new Date(), 'yyyy-MM-dd'))
      const activeVisits = todayVisits.filter(
        (v) => v.status === 'waiting' || v.status === 'with_doctor'
      )
      const position = activeVisits.findIndex((v) => v.id === visitId) + 1
      setQueuePosition(position > 0 ? position : activeVisits.length > 0 ? activeVisits.length : 1)
    } catch {
      setQueuePosition(null)
    }
  }

  useEffect(() => {
    updateQueuePosition()
    intervalRef.current = setInterval(updateQueuePosition, 30000)
    const timer = setTimeout(() => setShowConfetti(false), 4000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FDF9] to-white">
      {showConfetti && <Confetti />}

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <p className="text-sm font-semibold text-[#1D9E75]">ClinicFlow Medical Center</p>
        </div>

        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center mb-4">
          <AnimatedCheckmark />

          <p className="text-slate-500 text-sm font-medium mb-1">Registration Successful!</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Welcome, {patientName}!</h1>

          {/* Token Number */}
          <div className="token-badge mb-6">
            <span>{tokenNumber}</span>
          </div>
          <p className="text-sm text-slate-500 mb-1">Your Token Number</p>

          {/* Queue position */}
          {queuePosition !== null && (
            <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
              <span>
                {queuePosition === 1
                  ? '🎉 You are next in queue!'
                  : `You are #${queuePosition} in queue`}
              </span>
              <button
                onClick={updateQueuePosition}
                className="p-0.5 hover:bg-blue-100 rounded-full transition-colors"
                title="Refresh position"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-3">
            Registered on {format(registrationTime, 'dd MMM yyyy')} at{' '}
            {format(registrationTime, 'hh:mm a')}
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <h2 className="text-base font-semibold text-slate-900 mb-4">What to do next?</h2>
          <div className="space-y-3">
            {[
              { step: '1', icon: '🪑', title: 'Take a seat', desc: 'Please wait in the waiting area' },
              { step: '2', icon: '📢', title: 'Wait for your token', desc: 'Your token number will be called at the counter' },
              { step: '3', icon: '🏥', title: 'Proceed to reception', desc: 'Go to the reception desk when your token is called' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#E8F8F2] rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{title}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Important notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-amber-800 mb-1">📱 Important</p>
          <p className="text-xs text-amber-700">
            Please keep your phone handy. Show this screen at the counter if asked. Your token
            number is <strong>#{tokenNumber}</strong>.
          </p>
        </div>

        {/* Register another */}
        <div className="text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm text-[#1D9E75] font-medium hover:underline"
          >
            <Home className="w-4 h-4" />
            Register another patient
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Queue position auto-refreshes every 30 seconds
        </p>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}
