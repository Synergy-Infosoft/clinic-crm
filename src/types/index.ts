export type UserRole = 'admin' | 'receptionist' | 'doctor'

export type VisitStatus = 'pending' | 'completed' | 'cancelled'

export type PaymentStatus = 'pending' | 'paid_cash' | 'paid_online'

export type PaymentMethod = 'cash' | 'online_upi' | null

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  email: string
  created_at: string
}

export interface Doctor {
  id: string
  name: string
  specialization: string | null
  is_active: boolean
}

export interface Patient {
  id: string
  full_name: string
  age: number
  gender: 'male' | 'female' | 'other'
  phone: string
  address: string | null
  father_name: string | null
  referral_source: string | null
  blood_group: string | null
  created_at: string
  updated_at?: string
}

export interface Visit {
  id: string
  patient_id: string
  doctor_id: string | null
  token_number: number
  token_date: string
  chief_complaint: string
  consultation_date: string
  consultation_time: string
  visit_type: 'first_visit' | 'follow_up'
  status: VisitStatus
  notes: string | null
  prescription: string | null
  registered_by: 'self' | 'receptionist'
  confirmation_token?: string
  created_at: string
  updated_at?: string
  patient?: Patient
  doctor?: Doctor
}

export interface LineItem {
  id: string
  name: string
  quantity: number
  amount: number
}

export interface Invoice {
  id: string
  visit_id: string
  patient_id: string
  invoice_number: string
  line_items: LineItem[]
  subtotal: number
  discount: number
  total: number
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  paid_at: string | null
  created_at: string
  updated_at?: string
  visit?: Visit
  patient?: Patient
}

export interface WorkingHoursSlot {
  start: string
  end: string
}

export interface ClinicDaySchedule {
  day: number
  enabled: boolean
  slots: WorkingHoursSlot[]
}

export interface ChargePreset {
  id: string
  name: string
  amount: number
  category: string
  is_active: boolean
}

export interface ClinicSettings {
  clinic_name: string
  address: string
  phone: string
  doctor_name: string
  registration_number: string
  working_hours_start: string
  working_hours_end: string
  working_days: number[]
  working_schedule: ClinicDaySchedule[]
  timezone: string
}

export interface DashboardStats {
  patients_today: number
  pending: number
  completed: number
  revenue_today: number
  pending_invoices: number
}
