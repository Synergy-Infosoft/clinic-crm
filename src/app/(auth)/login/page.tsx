"use client";

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Stethoscope, Eye, EyeOff, Shield } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useBranding } from '@/context/BrandingContext'
import { useToast } from '@/components/ui/Toast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { BrandLogo } from '@/components/shared/BrandLogo'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const { settings } = useBranding()
  const toast = useToast()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  })

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await login(data.email, data.password)
      const requestedPath = new URLSearchParams(window.location.search).get('next')
      const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
        ? requestedPath
        : '/dashboard'
      router.replace(destination)
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <BrandLogo
            logoUrl={settings.logo_url}
            label={`${settings.clinic_name} logo`}
            className="inline-flex w-16 h-16 bg-[var(--primary)] rounded-2xl mb-4 shadow-xl overflow-hidden"
            fallback={<Stethoscope className="w-8 h-8 text-white" />}
          />
          <h1 className="text-2xl font-bold text-white">{settings.clinic_name}</h1>
          <p className="text-slate-400 text-sm mt-1">Appointment & Reception Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Staff Sign In</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your credentials to access the dashboard</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              placeholder="your@clinic.com"
              error={errors.email?.message}
              autoComplete="email"
              {...register('email')}
            />
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full h-11 px-3 pr-10 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent hover:border-slate-400"
                  autoComplete="current-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" loading={isSubmitting} size="lg" className="w-full mt-6">
              Sign In
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-3 text-center font-medium">Demo Accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Admin', email: 'admin@clinic.com', password: 'Admin@1234' },
                { label: 'Reception', email: 'receptionist@clinic.com', password: 'Clinic@1234' },
                { label: 'Doctor', email: 'doctor@clinic.com', password: 'Doctor@1234' },
              ].map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={async () => {
                    try {
                      await login(acc.email, acc.password)
                      router.push('/dashboard')
                    } catch {
                      toast.error('Login failed')
                    }
                  }}
                  className="text-xs py-2 px-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-[var(--primary)] transition-colors text-center"
                >
                  <span className="block font-medium text-slate-700">{acc.label}</span>
                  <span className="text-slate-400 text-xs">Click to login</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Shield className="w-3 h-3" />
          <span>Secure login — Staff access only</span>
        </div>
      </div>
    </div>
  )
}
