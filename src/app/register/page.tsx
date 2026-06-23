"use client";

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Stethoscope, Shield, Clock, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import * as dataService from '@/lib/dataService'
import { fallbackClinicSettings, type PublicClinicSettings } from '@/lib/registration'
import type { Doctor } from '@/types'

const schema = z.object({
  full_name: z.string().min(2, 'Please enter your full name'),
  age: z.coerce.number().min(1, 'Age must be at least 1').max(120, 'Please enter a valid age'),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().regex(/^\d{10}$/, 'Please enter a valid 10-digit phone number'),
  chief_complaint: z.string().min(10, 'Please describe your symptoms in at least 10 characters'),
  doctor_id: z.string().optional(),
  address: z.string().optional(),
  blood_group: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// Default clinic settings — will be replaced by DB settings later
export default function RegisterPage() {
  const router = useRouter()
  const toast = useToast()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [clinicOpen, setClinicOpen] = useState(false)
  const [settings, setSettings] = useState<PublicClinicSettings>(fallbackClinicSettings)
  const [configLoading, setConfigLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/public-config')
        if (!response.ok) throw new Error('Unable to load clinic configuration')
        const config = await response.json()
        setDoctors(config.doctors ?? [])
        setSettings(config.settings ?? fallbackClinicSettings)
        setClinicOpen(Boolean(config.clinic_open))
      } catch {
        setDoctors([])
        setSettings(fallbackClinicSettings)
        setClinicOpen(false)
      } finally {
        setConfigLoading(false)
      }
    }
    load()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  })

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const result = await dataService.selfRegister({
        full_name: data.full_name,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        chief_complaint: data.chief_complaint,
        doctor_id: data.doctor_id || undefined,
        address: data.address,
        blood_group: data.blood_group,
      })
      if (result.duplicate_registration) {
        toast.info(`You are already registered today. Your token is #${result.token_number}.`)
      }
      router.replace(`/confirmation?ref=${encodeURIComponent(result.confirmation_ref)}`)
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FDF9] to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1D9E75] rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-slate-900">{settings.clinic_name}</h1>
            <p className="text-xs text-slate-500">{settings.doctor_name}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${clinicOpen ? 'bg-emerald-500 pulse-dot' : 'bg-slate-400'}`}
            />
            <span className={`text-xs font-medium ${clinicOpen ? 'text-emerald-600' : 'text-slate-500'}`}>
              {clinicOpen ? 'Reception Live' : 'Closed'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Clinic closed banner */}
        {!clinicOpen && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Registration is Closed</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Please visit us during working hours ({settings.working_hours_start} –{' '}
                {settings.working_hours_end}). Registration will reopen automatically.
              </p>
            </div>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Patient Registration</h2>
          <p className="text-slate-500 text-sm mt-1">
            Fill in your details to get a token number. Reception staff will call your token when it&apos;s your turn.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                className={`w-full h-12 px-4 text-base border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent ${
                  errors.full_name ? 'border-red-400' : 'border-slate-300'
                }`}
                {...register('full_name')}
              />
              {errors.full_name && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.full_name.message}
                </p>
              )}
            </div>

            {/* Age + Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  placeholder="e.g. 35"
                  className={`w-full h-12 px-4 text-base border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent ${
                    errors.age ? 'border-red-400' : 'border-slate-300'
                  }`}
                  {...register('age')}
                />
                {errors.age && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.age.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Gender <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 h-12">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <label
                      key={g}
                      className="flex-1 flex items-center justify-center border border-slate-300 rounded-xl cursor-pointer text-sm capitalize hover:border-[#1D9E75] transition-colors has-[:checked]:border-[#1D9E75] has-[:checked]:bg-[#E8F8F2] has-[:checked]:text-[#1D9E75] font-medium"
                    >
                      <input type="radio" value={g} className="sr-only" {...register('gender')} />
                      {g === 'male' ? '♂ M' : g === 'female' ? '♀ F' : 'O'}
                    </label>
                  ))}
                </div>
                {errors.gender && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.gender.message as string}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                maxLength={10}
                className={`w-full h-12 px-4 text-base border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent ${
                  errors.phone ? 'border-red-400' : 'border-slate-300'
                }`}
                {...register('phone')}
              />
              {errors.phone && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.phone.message}
                </p>
              )}
            </div>

            {/* Chief Complaint */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reason for Visit / Symptoms <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Describe your symptoms briefly... (e.g. Fever and cold for 3 days)"
                className={`w-full px-4 py-3 text-base border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent resize-none ${
                  errors.chief_complaint ? 'border-red-400' : 'border-slate-300'
                }`}
                {...register('chief_complaint')}
              />
              {errors.chief_complaint && (
                <p className="mt-1.5 text-xs text-red-600">{errors.chief_complaint.message}</p>
              )}
            </div>

            {/* Doctor preference */}
            {doctors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Doctor Preference
                  <span className="ml-2 text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <select
                  className="w-full h-12 px-4 text-base border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  {...register('doctor_id')}
                >
                  <option value="">Any available doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialization || 'General'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Blood Group */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Blood Group
                <span className="ml-2 text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <select
                className="w-full h-12 px-4 text-base border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                {...register('blood_group')}
              >
                <option value="">Don&apos;t know / Prefer not to say</option>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Address
                <span className="ml-2 text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Your home address"
                className="w-full px-4 py-3 text-base border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent resize-none"
                {...register('address')}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || configLoading || !clinicOpen}
              className="w-full h-14 bg-[#1D9E75] hover:bg-[#0F6E56] disabled:opacity-60 text-white font-semibold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1D9E75]/20 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Registering...
                </>
              ) : configLoading ? (
                <>Checking reception hours...</>
              ) : clinicOpen ? (
                <>Get My Token Number</>
              ) : (
                <>Registration Closed</>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
            <Shield className="w-3.5 h-3.5" />
            <span>Your data is secure and only visible to clinic staff</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
            <Clock className="w-3.5 h-3.5" />
            <span>Working hours: {settings.working_hours_start} – {settings.working_hours_end}, Mon–Sat</span>
          </div>
        </div>
      </div>
    </div>
  )
}
