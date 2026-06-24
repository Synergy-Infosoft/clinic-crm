"use client";

import { format } from 'date-fns'
import { Wifi, WifiOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useBranding } from '@/context/BrandingContext'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

export function Header() {
  const { profile } = useAuth()
  const { settings } = useBranding()
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const roleColors: Record<string, 'warning' | 'info' | 'success'> = {
    admin: 'warning',
    receptionist: 'info',
    doctor: 'success',
  }

  return (
    <>
      {!isOnline && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-red-700 text-sm">
          <WifiOff className="w-4 h-4" />
          <span>You are offline. Some features may not work.</span>
        </div>
      )}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center gap-4 print:hidden">
        {/* Clinic name - mobile */}
        <div className="flex-1 md:flex-none">
          <h1 className="text-sm font-bold text-slate-900 md:hidden">{settings.clinic_name}</h1>
          <p className="text-xs text-slate-500 md:hidden">{settings.doctor_name}</p>
        </div>

        {/* Today's date - center */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div
              className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-red-500')}
              style={isOnline ? { animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' } : {}}
            />
            <span className="font-medium">{format(new Date(), 'EEEE, d MMMM yyyy')}</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-emerald-500 hidden md:block" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500 hidden md:block" />
          )}
          <div className="hidden md:flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{profile?.full_name ?? 'Staff'}</p>
            </div>
            {profile?.role && (
              <Badge variant={roleColors[profile.role] ?? 'info'} className="capitalize">
                {profile.role}
              </Badge>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
