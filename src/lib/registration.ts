import { z } from 'zod'

export const referralSources = [
  'google',
  'youtube',
  'social_media',
  'friend_family',
  'doctor_referral',
  'walk_in',
  'other',
] as const

export const visitTypes = ['first_visit', 'follow_up'] as const

export const registrationSchema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your full name').max(120),
  father_name: z.string().trim().max(120).optional(),
  age: z.coerce.number().int().min(1, 'Age must be at least 1').max(120, 'Please enter a valid age'),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().transform((value) => value.replace(/\D/g, '')).pipe(
    z.string().regex(/^\d{10}$/, 'Please enter a valid 10-digit phone number')
  ),
  chief_complaint: z.string().trim().min(5, 'Please describe the reason for your visit').max(1000),
  doctor_id: z.union([z.string().uuid(), z.literal('')]).optional(),
  address: z.string().trim().max(500).optional(),
  referral_source: z.union([z.enum(referralSources), z.literal('')]).optional(),
  visit_type: z.enum(visitTypes),
  consultation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a consultation date'),
  consultation_time: z.string().regex(/^\d{2}:\d{2}$/, 'Please select a consultation time'),
})

export type RegistrationInput = z.input<typeof registrationSchema>

export interface PublicClinicSettings {
  clinic_name: string
  address: string
  phone: string
  doctor_name: string
  registration_number: string
  working_hours_start: string
  working_hours_end: string
  working_days: number[]
  timezone: string
}

export const fallbackClinicSettings: PublicClinicSettings = {
  clinic_name: 'ClinicFlow Medical Center',
  address: '',
  phone: '',
  doctor_name: 'Clinic Doctor',
  registration_number: '',
  working_hours_start: '09:00',
  working_hours_end: '18:00',
  working_days: [1, 2, 3, 4, 5, 6],
  timezone: 'Asia/Kolkata',
}

export function isClinicOpenNow(settings: PublicClinicSettings, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: settings.timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  const weekday = parts.find((part) => part.type === 'weekday')?.value
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const currentTime = `${hour}:${minute}`

  return Boolean(
    weekday &&
      settings.working_days.includes(weekdayIndex[weekday]) &&
      currentTime >= settings.working_hours_start.slice(0, 5) &&
      currentTime <= settings.working_hours_end.slice(0, 5)
  )
}
