import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fallbackClinicSettings, isClinicOpenNow, normalizeWorkingSchedule } from '@/lib/registration'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const [{ data: settings }, { data: doctors, error: doctorsError }] = await Promise.all([
      supabase.from('clinic_settings').select('*').eq('id', 1).maybeSingle(),
      supabase
        .from('doctors')
        .select('id, name, specialization, is_active')
        .eq('is_active', true)
        .order('name'),
    ])

    if (doctorsError) throw doctorsError

    const publicSettings = {
      ...fallbackClinicSettings,
      ...(settings ?? {}),
      working_hours_start: String(settings?.working_hours_start ?? fallbackClinicSettings.working_hours_start).slice(0, 5),
      working_hours_end: String(settings?.working_hours_end ?? fallbackClinicSettings.working_hours_end).slice(0, 5),
      working_schedule: normalizeWorkingSchedule(
        settings?.working_schedule,
        settings?.working_days ?? fallbackClinicSettings.working_days,
        String(settings?.working_hours_start ?? fallbackClinicSettings.working_hours_start).slice(0, 5),
        String(settings?.working_hours_end ?? fallbackClinicSettings.working_hours_end).slice(0, 5)
      ),
    }

    return NextResponse.json(
      {
        settings: publicSettings,
        doctors: doctors ?? [],
        clinic_open: isClinicOpenNow(publicSettings),
      },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
    )
  } catch {
    return NextResponse.json(
      {
        settings: fallbackClinicSettings,
        doctors: [],
        clinic_open: isClinicOpenNow(fallbackClinicSettings),
        configuration_warning: true,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
