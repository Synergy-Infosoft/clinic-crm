/**
 * Supabase Data Service
 * Replaces the mock backend with real Supabase database calls.
 */

import { createClient } from './supabase/client'
import { format } from 'date-fns'
import type { Patient, Visit, Invoice, Doctor, ChargePreset, LineItem, DashboardStats } from '../types'

export interface SelfRegisterPayload {
  full_name: string
  age: number
  gender: 'male' | 'female' | 'other'
  phone: string
  chief_complaint: string
  doctor_id?: string
  address?: string
  blood_group?: string
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export async function getPatients(): Promise<Patient[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Patient[]
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
  if (error) return null
  return data as Patient
}

export async function getPatientByPhone(phone: string): Promise<Patient | null> {
  const supabase = createClient()
  const { data } = await supabase.from('patients').select('*').eq('phone', phone).maybeSingle()
  return data as Patient | null
}

export async function createPatient(
  data: Omit<Patient, 'id' | 'created_at' | 'updated_at'>
): Promise<Patient> {
  const supabase = createClient()
  const { data: patient, error } = await supabase
    .from('patients')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return patient as Patient
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Patient
}

// ─── Visits ───────────────────────────────────────────────────────────────────

export async function getVisits(date?: string): Promise<Visit[]> {
  const supabase = createClient()
  let query = supabase
    .from('visits')
    .select('*, patient:patients(*), doctor:doctors(*)')
    .order('token_number', { ascending: true })
  if (date) query = query.eq('token_date', date)
  const { data, error } = await query
  if (error) throw error
  return data as Visit[]
}

export async function getVisitById(id: string): Promise<Visit | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('visits')
    .select('*, patient:patients(*), doctor:doctors(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Visit
}

export async function getVisitsByPatient(patientId: string): Promise<Visit[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('visits')
    .select('*, doctor:doctors(*)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Visit[]
}

export async function createVisit(
  data: Omit<Visit, 'id' | 'created_at' | 'updated_at' | 'patient' | 'doctor'>
): Promise<Visit> {
  const supabase = createClient()
  const { data: visit, error } = await supabase.from('visits').insert(data).select().single()
  if (error) throw error
  return visit as Visit
}

export async function updateVisit(id: string, updates: Partial<Visit>): Promise<Visit> {
  const supabase = createClient()
  const { status, doctor_id, notes, prescription } = updates as any
  const patch: Record<string, any> = {}
  if (status !== undefined) patch.status = status
  if (doctor_id !== undefined) patch.doctor_id = doctor_id
  if (notes !== undefined) patch.notes = notes
  if (prescription !== undefined) patch.prescription = prescription

  const { data, error } = await supabase
    .from('visits')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Visit
}

// ─── Token ────────────────────────────────────────────────────────────────────

export async function getNextToken(date: string = format(new Date(), 'yyyy-MM-dd')): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('token_date', date)
  return (count ?? 0) + 1
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function getInvoices(fromDate?: string, toDate?: string): Promise<Invoice[]> {
  const supabase = createClient()
  let query = supabase
    .from('invoices')
    .select('*, patient:patients(*), visit:visits(*)')
    .order('created_at', { ascending: false })
  if (fromDate) query = query.gte('created_at', fromDate)
  if (toDate) query = query.lte('created_at', toDate + 'T23:59:59')
  const { data, error } = await query
  if (error) throw error
  return data as Invoice[]
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, patient:patients(*), visit:visits(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Invoice
}

export async function getInvoiceByVisit(visitId: string): Promise<Invoice | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('visit_id', visitId)
    .maybeSingle()
  return data as Invoice | null
}

export async function createInvoice(
  visitId: string,
  patientId: string,
  lineItems: LineItem[] = []
): Promise<Invoice> {
  const supabase = createClient()
  const subtotal = lineItems.reduce((acc, item) => acc + item.amount * item.quantity, 0)

  // Generate invoice number
  const today = format(new Date(), 'yyMM')
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', format(new Date(), 'yyyy-MM-dd'))
  const invoiceNumber = `${today}-${String((count ?? 0) + 1).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      visit_id: visitId,
      patient_id: patientId,
      invoice_number: invoiceNumber,
      line_items: lineItems,
      subtotal,
      discount: 0,
      total: subtotal,
      payment_status: 'pending',
      payment_method: null,
      paid_at: null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Invoice
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
  const supabase = createClient()
  const patch: Record<string, any> = { ...updates }

  // Recalculate totals if line_items changed
  if (updates.line_items !== undefined) {
    patch.subtotal = updates.line_items.reduce(
      (acc: number, item: LineItem) => acc + item.amount * item.quantity,
      0
    )
    patch.total = patch.subtotal - (updates.discount ?? 0)
  }
  if (updates.discount !== undefined && patch.subtotal === undefined) {
    // Need current subtotal — fetch first
    const current = await getInvoiceById(id)
    if (current) patch.total = current.subtotal - updates.discount
  }

  // Handle payment
  if (updates.payment_status && updates.payment_status !== 'pending') {
    patch.paid_at = new Date().toISOString()
  }

  delete patch.visit
  delete patch.patient

  const { data, error } = await supabase
    .from('invoices')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Invoice
}

// ─── Doctors ──────────────────────────────────────────────────────────────────

export async function getDoctors(): Promise<Doctor[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data as Doctor[]
}

export async function createDoctor(data: Omit<Doctor, 'id'>): Promise<Doctor> {
  const supabase = createClient()
  const { data: doctor, error } = await supabase.from('doctors').insert(data).select().single()
  if (error) throw error
  return doctor as Doctor
}

export async function updateDoctor(id: string, updates: Partial<Doctor>): Promise<Doctor> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('doctors')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Doctor
}

// ─── Charge Presets ───────────────────────────────────────────────────────────

export async function getChargePresets(): Promise<ChargePreset[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('charge_presets')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data as ChargePreset[]
}

export async function createChargePreset(data: Omit<ChargePreset, 'id'>): Promise<ChargePreset> {
  const supabase = createClient()
  const { data: preset, error } = await supabase
    .from('charge_presets')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return preset as ChargePreset
}

export async function updateChargePreset(
  id: string,
  updates: Partial<ChargePreset>
): Promise<ChargePreset> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('charge_presets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ChargePreset
}

export async function deleteChargePreset(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('charge_presets').delete().eq('id', id)
  if (error) throw error
}

// ─── Self Registration ────────────────────────────────────────────────────────

export async function selfRegister(payload: SelfRegisterPayload): Promise<{
  token_number: number
  visit_id: string
  patient_name: string
  patient_id: string
}> {
  const today = format(new Date(), 'yyyy-MM-dd')

  // Check for existing patient
  let patient = await getPatientByPhone(payload.phone)

  if (patient) {
    // Check for duplicate registration today
    const supabase = createClient()
    const { data: todayVisit } = await supabase
      .from('visits')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('token_date', today)
      .neq('status', 'cancelled')
      .maybeSingle()

    if (todayVisit) {
      return {
        token_number: todayVisit.token_number,
        visit_id: todayVisit.id,
        patient_name: patient.full_name,
        patient_id: patient.id,
      }
    }

    // Update patient details
    patient = await updatePatient(patient.id, {
      full_name: payload.full_name,
      age: payload.age,
      address: payload.address ?? patient.address,
      blood_group: payload.blood_group ?? patient.blood_group,
    })
  } else {
    patient = await createPatient({
      full_name: payload.full_name,
      age: payload.age,
      gender: payload.gender,
      phone: payload.phone,
      address: payload.address ?? null,
      blood_group: payload.blood_group ?? null,
    })
  }

  const token = await getNextToken(today)

  const visit = await createVisit({
    patient_id: patient.id,
    doctor_id: payload.doctor_id ?? null,
    token_number: token,
    token_date: today,
    chief_complaint: payload.chief_complaint,
    status: 'waiting',
    notes: null,
    prescription: null,
    registered_by: 'self',
  })

  // Create draft invoice with consultation fee
  const presets = await getChargePresets()
  const consultationPreset = presets.find((p) => p.name === 'Consultation Fee')

  if (consultationPreset) {
    await createInvoice(visit.id, patient.id, [
      { id: crypto.randomUUID(), name: consultationPreset.name, quantity: 1, amount: consultationPreset.amount },
    ])
  } else {
    await createInvoice(visit.id, patient.id, [])
  }

  return {
    token_number: token,
    visit_id: visit.id,
    patient_name: patient.full_name,
    patient_id: patient.id,
  }
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: todayVisits } = await supabase
    .from('visits')
    .select('status')
    .eq('token_date', today)

  const visits = todayVisits ?? []

  const { data: paidInvoices } = await supabase
    .from('invoices')
    .select('total')
    .gte('created_at', today)
    .neq('payment_status', 'pending')

  const { count: pendingCount } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('payment_status', 'pending')

  return {
    patients_today: visits.length,
    waiting: visits.filter((v) => v.status === 'waiting').length,
    with_doctor: visits.filter((v) => v.status === 'with_doctor').length,
    completed: visits.filter((v) => v.status === 'completed').length,
    revenue_today: (paidInvoices ?? []).reduce((acc, inv) => acc + inv.total, 0),
    pending_invoices: pendingCount ?? 0,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getVisitCount(patientId: string): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientId)
  return count ?? 0
}

export async function getTotalSpent(patientId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('invoices')
    .select('total')
    .eq('patient_id', patientId)
    .neq('payment_status', 'pending')
  return (data ?? []).reduce((acc, inv) => acc + inv.total, 0)
}

// ─── Realtime (Supabase channels) ─────────────────────────────────────────────

type Listener = (data: unknown) => void
const _localListeners: Record<string, Listener[]> = {}

/** Subscribe to a local event (for components that still use the old subscribe API) */
export function subscribe(event: string, listener: Listener) {
  if (!_localListeners[event]) _localListeners[event] = []
  _localListeners[event].push(listener)
  return () => {
    _localListeners[event] = _localListeners[event].filter((l) => l !== listener)
  }
}

export function emit(event: string, data: unknown) {
  ;(_localListeners[event] || []).forEach((l) => l(data))
}

/** Subscribe to real Supabase realtime for visits table */
export function subscribeToVisits(callback: () => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel('visits-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, callback)
    .subscribe()
  // Return synchronous cleanup — removeChannel is fire-and-forget
  return () => { supabase.removeChannel(channel) }
}
