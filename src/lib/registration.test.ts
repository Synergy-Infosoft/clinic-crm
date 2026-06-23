import { describe, expect, it } from 'vitest'
import { fallbackClinicSettings, isClinicOpenNow, registrationSchema } from './registration'

describe('registrationSchema', () => {
  const validInput = {
    full_name: 'Asha Patel',
    age: 34,
    gender: 'female' as const,
    phone: '98765 43210',
    chief_complaint: 'Fever for two days',
    visit_type: 'first_visit' as const,
    consultation_date: '2026-06-23',
    consultation_time: '10:30',
  }

  it('normalizes a valid Indian phone number', () => {
    const result = registrationSchema.parse(validInput)
    expect(result.phone).toBe('9876543210')
  })

  it('rejects invalid clinical registration input', () => {
    const result = registrationSchema.safeParse({
      ...validInput,
      age: 0,
      phone: '123',
      chief_complaint: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('isClinicOpenNow', () => {
  const settings = {
    ...fallbackClinicSettings,
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    working_days: [1, 2, 3, 4, 5, 6],
  }

  it('uses the configured clinic timezone', () => {
    expect(isClinicOpenNow(settings, new Date('2026-06-23T06:30:00.000Z'))).toBe(true)
    expect(isClinicOpenNow(settings, new Date('2026-06-23T14:00:00.000Z'))).toBe(false)
  })

  it('closes on excluded weekdays', () => {
    expect(isClinicOpenNow(settings, new Date('2026-06-21T06:30:00.000Z'))).toBe(false)
  })
})
