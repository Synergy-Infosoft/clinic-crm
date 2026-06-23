"use client";

import { useEffect, useState } from 'react'
import { Building2, Clock, Save, ShieldAlert } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as dataService from '@/lib/dataService'
import type { ClinicSettings } from '@/types'

const dayOptions = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

const timezoneOptions = [
  { value: 'Asia/Kolkata', label: 'India ? Asia/Kolkata' },
  { value: 'Asia/Dubai', label: 'UAE ? Asia/Dubai' },
  { value: 'Asia/Singapore', label: 'Singapore ? Asia/Singapore' },
  { value: 'UTC', label: 'UTC' },
]

const emptySettings: ClinicSettings = {
  clinic_name: '',
  address: '',
  phone: '',
  doctor_name: '',
  registration_number: '',
  working_hours_start: '09:00',
  working_hours_end: '18:00',
  working_days: [1, 2, 3, 4, 5, 6],
  timezone: 'Asia/Kolkata',
}

export default function SettingsPage() {
  const toast = useToast()
  const { profile, loading: authLoading } = useAuth()
  const [settings, setSettings] = useState<ClinicSettings>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await dataService.getClinicSettings()
        setSettings(data)
      } catch (error) {
        console.error('Failed to load clinic settings:', error)
        toast.error('Unable to load clinic settings')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) loadSettings()
  }, [authLoading, toast])

  const updateField = <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const toggleWorkingDay = (day: number) => {
    setSettings((current) => {
      const exists = current.working_days.includes(day)
      const working_days = exists
        ? current.working_days.filter((value) => value !== day)
        : [...current.working_days, day].sort((a, b) => a - b)
      return { ...current, working_days }
    })
  }

  const handleSave = async () => {
    if (!settings.clinic_name.trim()) {
      toast.error('Clinic name is required')
      return
    }
    if (settings.working_hours_start >= settings.working_hours_end) {
      toast.error('Opening time must be before closing time')
      return
    }
    if (settings.working_days.length === 0) {
      toast.error('Select at least one working day')
      return
    }

    setSaving(true)
    try {
      const updated = await dataService.updateClinicSettings(settings)
      setSettings(updated)
      toast.success('Clinic settings saved')
    } catch (error) {
      console.error('Failed to save clinic settings:', error)
      toast.error('Unable to save settings. Please check admin permissions.')
    } finally {
      setSaving(false)
    }
  }

  if (!authLoading && profile?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <div className="card p-8 text-center max-w-xl mx-auto mt-10">
            <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Admin access required</h1>
            <p className="text-sm text-slate-500">
              Clinic settings can only be changed by an administrator.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <PageHeader
          title="Settings"
          description="Manage clinic details, public registration hours, and contact information"
          actions={
            <Button onClick={handleSave} loading={saving} disabled={loading || authLoading} size="sm">
              <Save className="w-4 h-4" />
              Save Settings
            </Button>
          }
        />

        {loading || authLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="card p-5 lg:col-span-2 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <Building2 className="w-5 h-5 text-[#1D9E75]" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Clinic Information</h2>
                  <p className="text-xs text-slate-500">Shown on QR registration and patient documents.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Clinic Name"
                  required
                  value={settings.clinic_name}
                  onChange={(event) => updateField('clinic_name', event.target.value)}
                />
                <Input
                  label="Primary Doctor Name"
                  value={settings.doctor_name}
                  onChange={(event) => updateField('doctor_name', event.target.value)}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  value={settings.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                />
                <Input
                  label="Registration Number"
                  value={settings.registration_number}
                  onChange={(event) => updateField('registration_number', event.target.value)}
                />
              </div>

              <Textarea
                label="Clinic Address"
                rows={3}
                value={settings.address}
                onChange={(event) => updateField('address', event.target.value)}
              />
            </section>

            <section className="card p-5 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <Clock className="w-5 h-5 text-[#1D9E75]" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Registration Hours</h2>
                  <p className="text-xs text-slate-500">Controls when public QR registration is open.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Opens At"
                  type="time"
                  required
                  value={settings.working_hours_start}
                  onChange={(event) => updateField('working_hours_start', event.target.value)}
                />
                <Input
                  label="Closes At"
                  type="time"
                  required
                  value={settings.working_hours_end}
                  onChange={(event) => updateField('working_hours_end', event.target.value)}
                />
              </div>

              <Select
                label="Timezone"
                required
                options={timezoneOptions}
                value={settings.timezone}
                onChange={(event) => updateField('timezone', event.target.value)}
              />

              <div>
                <p className="block text-sm font-medium text-slate-700 mb-2">Working Days</p>
                <div className="grid grid-cols-4 gap-2">
                  {dayOptions.map((day) => {
                    const selected = settings.working_days.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleWorkingDay(day.value)}
                        aria-pressed={selected}
                        className={`h-10 rounded-lg text-xs font-semibold border transition-colors ${
                          selected
                            ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#1D9E75]'
                        }`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
