import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const referenceSchema = z.string().uuid()

export async function GET(request: NextRequest) {
  const parsed = referenceSchema.safeParse(request.nextUrl.searchParams.get('ref'))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid confirmation reference' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: visit, error } = await supabase
      .from('visits')
      .select('id, token_number, token_date, status, created_at, patient:patients(full_name)')
      .eq('confirmation_token', parsed.data)
      .maybeSingle()

    if (error) throw error
    if (!visit) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    const { data: activeVisits, error: queueError } = await supabase
      .from('visits')
      .select('id')
      .eq('token_date', visit.token_date)
      .in('status', ['waiting', 'with_doctor'])
      .order('token_number', { ascending: true })

    if (queueError) throw queueError

    const patientRelation = visit.patient as unknown as { full_name?: string } | null
    const queueIndex = (activeVisits ?? []).findIndex((item) => item.id === visit.id)

    return NextResponse.json(
      {
        token_number: visit.token_number,
        patient_name: patientRelation?.full_name ?? 'Patient',
        status: visit.status,
        queue_position: queueIndex >= 0 ? queueIndex + 1 : null,
        registered_at: visit.created_at,
      },
      { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } }
    )
  } catch (error) {
    console.error('Registration status failed', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Unable to load registration status' }, { status: 503 })
  }
}
