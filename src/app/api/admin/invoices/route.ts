import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const createInvoiceSchema = z.object({
  visit_id: z.string().uuid('Invalid visit id'),
})

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() || null
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function addOrigin(origins: Set<string>, value: string | null | undefined) {
  const origin = normalizeOrigin(value)
  if (origin) origins.add(origin)
}

function getAllowedOrigins(request: NextRequest) {
  const origins = new Set<string>()
  const forwardedHost = firstHeaderValue(request.headers.get('x-forwarded-host'))
  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto'))
  const host = firstHeaderValue(request.headers.get('host'))
  const requestProtocol = request.nextUrl.protocol.replace(':', '') || 'https'
  const effectiveProtocol = forwardedProto || requestProtocol

  addOrigin(origins, request.nextUrl.origin)
  addOrigin(origins, process.env.NEXT_PUBLIC_APP_URL)

  const extraOrigins = process.env.APP_ALLOWED_ORIGINS?.split(',') ?? []
  for (const origin of extraOrigins) addOrigin(origins, origin.trim())

  for (const candidateHost of [forwardedHost, host]) {
    if (!candidateHost) continue
    addOrigin(origins, `${effectiveProtocol}://${candidateHost}`)
    if (!forwardedProto && !candidateHost.startsWith('localhost') && !candidateHost.startsWith('127.0.0.1')) {
      addOrigin(origins, `https://${candidateHost}`)
    }
  }

  return origins
}

function isAllowedRequestOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  const normalizedOrigin = normalizeOrigin(origin)
  if (!normalizedOrigin) return false
  return getAllowedOrigins(request).has(normalizedOrigin)
}

async function requireBillingAccess() {
  const userClient = await createClient()
  const { data: { user }, error: userError } = await userClient.auth.getUser()

  if (userError || !user) {
    return { admin: null, response: jsonResponse({ error: 'Authentication required' }, 401) }
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw profileError

  if (!profile || !['admin', 'receptionist'].includes(profile.role)) {
    return { admin: null, response: jsonResponse({ error: 'Billing access required' }, 403) }
  }

  return { admin, response: null }
}

function getInvoiceRpcStatus(message: string) {
  if (/VISIT_NOT_FOUND/i.test(message)) return { status: 404, error: 'Visit not found' }
  if (/VISIT_CANCELLED/i.test(message)) return { status: 409, error: 'Cannot generate an invoice for a cancelled visit' }
  return null
}

export async function POST(request: NextRequest) {
  if (!isAllowedRequestOrigin(request)) {
    return jsonResponse({ error: 'Invalid request origin' }, 403)
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return jsonResponse({ error: 'Content-Type must be application/json' }, 415)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body' }, 400)
  }

  const parsed = createInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return jsonResponse({ error: 'Invalid invoice request', details: parsed.error.flatten().fieldErrors }, 400)
  }

  try {
    const auth = await requireBillingAccess()
    if (auth.response) return auth.response

    const admin = auth.admin
    if (!admin) return jsonResponse({ error: 'Billing access required' }, 403)

    const { data: rpcData, error: rpcError } = await admin.rpc('create_invoice_for_visit', {
      p_visit_id: parsed.data.visit_id,
    })

    if (rpcError) {
      const mapped = getInvoiceRpcStatus(rpcError.message)
      if (mapped) return jsonResponse({ error: mapped.error }, mapped.status)
      throw rpcError
    }

    const invoiceRow = Array.isArray(rpcData) ? rpcData[0] : rpcData
    if (!invoiceRow?.id) throw new Error('Invoice RPC did not return an invoice')

    const { data: invoice, error: invoiceError } = await admin
      .from('invoices')
      .select('*, patient:patients(*), visit:visits(*)')
      .eq('id', invoiceRow.id)
      .single()

    if (invoiceError) throw invoiceError

    return jsonResponse({ invoice })
  } catch (error) {
    console.error('Invoice creation failed', error instanceof Error ? error.message : 'Unknown error')
    return jsonResponse({ error: 'Unable to create invoice' }, 503)
  }
}
