"use client";

import { useEffect, useState } from 'react'
import { Building2, Clock, Plus, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { defaultWorkingSchedule, splitClinicScheduleExample } from '@/lib/registration'
import * as dataService from '@/lib/dataService'
import type { ClinicDaySchedule, ClinicSettings } from '@/types'

const dayOptions = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
]

const timezoneOptions = [
  { value: 'Asia/Kolkata', label: 'India - Asia/Kolkata' },
  { value: 'Asia/Dubai', label: 'UAE - Asia/Dubai' },
  { value: 'Asia/Singapore', label: 'Singapore - Asia/Singapore' },
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
  working_schedule: defaultWorkingSchedule,
  timezone: 'Asia/Kolkata',
}

function cloneSchedule(schedule: ClinicDaySchedule[]) {
  return schedule.map((day) => ({
    ...day,
    slots: day.slots.map((slot) => ({ ...slot })),
  }))
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

  const updateSchedule = (updater: (schedule: ClinicDaySchedule[]) => ClinicDaySchedule[]) => {
    setSettings((current) => {
      const working_schedule = updater(cloneSchedule(current.working_schedule))
      return {
        ...current,
        working_schedule,
        working_days: working_schedule.filter((day) => day.enabled).map((day) => day.day),
        working_hours_start: working_schedule.find((day) => day.enabled)?.slots[0]?.start ?? current.working_hours_start,
        working_hours_end: working_schedule.find((day) => day.enabled)?.slots[0]?.end ?? current.working_hours_end,
      }
    })
  }

  const toggleDay = (day: number) => {
    updateSchedule((schedule) => schedule.map((entry) => {
      if (entry.day !== day) return entry
      const enabled = !entry.enabled
      return {
        ...entry,
        enabled,
        slots: enabled && entry.slots.length === 0 ? [{ start: '09:00', end: '18:00' }] : entry.slots,
      }
    }))
  }

  const updateSlot = (day: number, index: number, key: 'start' | 'end', value: string) => {
    updateSchedule((schedule) => schedule.map((entry) => {
      if (entry.day !== day) return entry
      return {
        ...entry,
        slots: entry.slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, [key]: value } : slot),
      }
    }))
  }

  const addSlot = (day: number) => {
    updateSchedule((schedule) => schedule.map((entry) => {
      if (entry.day !== day || entry.slots.length >= 3) return entry
      return {
        ...entry,
        enabled: true,
        slots: [...entry.slots, { start: '17:00', end: '21:00' }],
      }
    }))
  }

  const removeSlot = (day: number, index: number) => {
    updateSchedule((schedule) => schedule.map((entry) => {
      if (entry.day !== day) return entry
      const slots = entry.slots.filter((_, slotIndex) => slotIndex !== index)
      return { ...entry, enabled: slots.length > 0 && entry.enabled, slots }
    }))
  }

  const applySplitSchedule = () => {
    updateSchedule(() => cloneSchedule(splitClinicScheduleExample))
    toast.info('Applied split morning/evening schedule')
  }

  const handleSave = async () => {
    if (!settings.clinic_name.trim()) {
      toast.error('Clinic name is required')
      return
    }

    const enabledDays = settings.working_schedule.filter((day) => day.enabled)
    if (enabledDays.length === 0) {
      toast.error('Select at least one working day')
      return
    }

    for (const day of enabledDays) {
      if (day.slots.length === 0) {
        toast.error('Every enabled day needs at least one time slot')
        return
      }
      for (const slot of day.slots) {
        if (!slot.start || !slot.end || slot.start >= slot.end) {
          toast.error('Each time slot must have a valid start and end time')
          return
        }
      }
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
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <PageHeader
          title="Settings"
          description="Manage clinic details, split registration hours, and contact information"
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
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <section className="card p-5 lg:col-span-2 space-y-5 h-fit">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <Building2 className="w-5 h-5 text-[#1D9E75]" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Clinic Information</h2>
                  <p className="text-xs text-slate-500">Shown on QR registration and patient documents.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
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

            <section className="card p-5 lg:col-span-3 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#1D9E75]" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Registration Hours</h2>
                    <p className="text-xs text-slate-500">Add morning/evening sessions per day. Public QR registration opens only inside these slots.</p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={applySplitSchedule}>
                  Apply split schedule
                </Button>
              </div>

              <Select
                label="Timezone"
                required
                options={timezoneOptions}
                value={settings.timezone}
                onChange={(event) => updateField('timezone', event.target.value)}
              />

              <div className="space-y-3">
                {dayOptions.map((day) => {
                  const schedule = settings.working_schedule.find((entry) => entry.day === day.value)
                  const enabled = Boolean(schedule?.enabled)
                  return (
                    <div key={day.value} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          aria-pressed={enabled}
                          className={`min-w-24 h-10 rounded-lg text-sm font-semibold border transition-colors ${
                            enabled
                              ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-[#1D9E75]'
                          }`}
                        >
                          {day.short}
                        </button>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{day.label}</p>
                          <p className="text-xs text-slate-500">{enabled ? 'Open for registration' : 'Closed'}</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => addSlot(day.value)} disabled={!enabled || (schedule?.slots.length ?? 0) >= 3}>
                          <Plus className="w-4 h-4" />
                          Slot
                        </Button>
                      </div>

                      {enabled && (
                        <div className="mt-3 space-y-2 pl-0 sm:pl-28">
                          {schedule?.slots.map((slot, index) => (
                            <div key={`${day.value}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                              <Input
                                label={index === 0 ? 'Start' : undefined}
                                type="time"
                                value={slot.start}
                                onChange={(event) => updateSlot(day.value, index, 'start', event.target.value)}
                              />
                              <Input
                                label={index === 0 ? 'End' : undefined}
                                type="time"
                                value={slot.end}
                                onChange={(event) => updateSlot(day.value, index, 'end', event.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => removeSlot(day.value, index)}
                                aria-label={`Remove ${day.label} slot ${index + 1}`}
                                className="h-11 w-11 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
