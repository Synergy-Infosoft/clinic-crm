import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { fallbackClinicSettings, isClinicOpenNow, registrationSchema } from '@/lib/registration'

export const dynamic = 'force-dynamic'

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) {
    return errorResponse('Invalid request origin', 403)
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return errorResponse('Content-Type must be application/json', 415)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON request body', 400)
  }

  const parsed = registrationSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('Please correct the highlighted fields', 400, parsed.error.flatten().fieldErrors)
  }

  try {
    const admin = createAdminClient()
    const { data: settingsRow } = await admin
      .from('clinic_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    const settings = {
      ...fallbackClinicSettings,
      ...(settingsRow ?? {}),
      working_hours_start: String(settingsRow?.working_hours_start ?? fallbackClinicSettings.working_hours_start).slice(0, 5),
      working_hours_end: String(settingsRow?.working_hours_end ?? fallbackClinicSettings.working_hours_end).slice(0, 5),
    }

    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    if (!user && !isClinicOpenNow(settings)) {
      return errorResponse(
        `Registration is closed. Please visit between ${settings.working_hours_start} and ${settings.working_hours_end}.`,
        403
      )
    }

    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const clientIp = forwardedFor || request.headers.get('x-real-ip') || 'unknown'
    const salt = process.env.REGISTRATION_RATE_LIMIT_SALT || process.env.NEXT_PUBLIC_SUPABASE_URL || 'clinic-registration'
    const requestHash = user
      ? null
      : createHash('sha256').update(`${salt}:${clientIp}`).digest('hex')

    const input = parsed.data
    const { data, error } = await admin.rpc('register_patient_atomic', {
      p_full_name: input.full_name,
      p_age: input.age,
      p_gender: input.gender,
      p_phone: input.phone,
      p_chief_complaint: input.chief_complaint,
      p_doctor_id: input.doctor_id || null,
      p_address: input.address || null,
      p_blood_group: input.blood_group || null,
      p_registered_by: user ? 'receptionist' : 'self',
      p_request_hash: requestHash,
    })

    if (error) {
      if (error.message.includes('RATE_LIMITED')) {
        return errorResponse('Too many registration attempts. Please wait 15 minutes and try again.', 429)
      }
      if (error.code === '23505') {
        return errorResponse('A registration conflict occurred. Please retry once.', 409)
      }
      throw error
    }

    const result = Array.isArray(data) ? data[0] : data
    if (!result) throw new Error('Registration did not return a result')

    return NextResponse.json(
      {
        token_number: result.token_number,
        visit_id: result.visit_id,
        patient_name: result.patient_name,
        confirmation_ref: result.confirmation_token,
        duplicate_registration: result.duplicate_registration,
      },
      { status: result.duplicate_registration ? 200 : 201, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Patient registration failed', error instanceof Error ? error.message : 'Unknown error')
    return errorResponse('Registration is temporarily unavailable. Please contact reception.', 503)
  }
}
