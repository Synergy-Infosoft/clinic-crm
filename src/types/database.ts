export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<{
        id: string
        full_name: string
        role: 'admin' | 'receptionist' | 'doctor'
        created_at: string
      }>
      doctors: Table<{
        id: string
        name: string
        specialization: string | null
        is_active: boolean
        created_at: string
      }>
      patients: Table<{
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
        updated_at: string
      }>
      visits: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string | null
          token_number: number
          token_date: string
          chief_complaint: string
          consultation_date: string
          consultation_time: string
          visit_type: 'first_visit' | 'follow_up'
          status: 'pending' | 'completed' | 'cancelled'
          notes: string | null
          prescription: string | null
          registered_by: 'self' | 'receptionist'
          confirmation_token: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id?: string | null
          token_number: number
          token_date?: string
          chief_complaint: string
          consultation_date?: string
          consultation_time?: string
          visit_type?: 'first_visit' | 'follow_up'
          status?: 'pending' | 'completed' | 'cancelled'
          notes?: string | null
          prescription?: string | null
          registered_by?: 'self' | 'receptionist'
          confirmation_token?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['visits']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'visits_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'visits_doctor_id_fkey'
            columns: ['doctor_id']
            isOneToOne: false
            referencedRelation: 'doctors'
            referencedColumns: ['id']
          },
        ]
      }
      token_counters: Table<{
        id: string
        counter_date: string
        last_token: number
      }>
      invoices: {
        Row: {
          id: string
          visit_id: string
          patient_id: string
          invoice_number: string
          line_items: Array<{ id: string; name: string; quantity: number; amount: number }>
          subtotal: number
          discount: number
          total: number
          payment_status: 'pending' | 'paid_cash' | 'paid_online'
          payment_method: 'cash' | 'online_upi' | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          visit_id: string
          patient_id: string
          invoice_number: string
          line_items?: Array<{ id: string; name: string; quantity: number; amount: number }>
          subtotal?: number
          discount?: number
          total?: number
          payment_status?: 'pending' | 'paid_cash' | 'paid_online'
          payment_method?: 'cash' | 'online_upi' | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'invoices_visit_id_fkey'
            columns: ['visit_id']
            isOneToOne: true
            referencedRelation: 'visits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
        ]
      }
      charge_presets: Table<{
        id: string
        name: string
        amount: number
        category: string
        is_active: boolean
        created_at: string
      }>
      clinic_settings: Table<{
        id: number
        clinic_name: string
        address: string
        phone: string
        doctor_name: string
        registration_number: string
        working_hours_start: string
        working_hours_end: string
        working_days: number[]
        working_schedule: Json
        timezone: string
        created_at: string
        updated_at: string
      }>
      audit_logs: Table<{
        id: number
        actor_id: string | null
        table_name: string
        record_id: string | null
        action: 'INSERT' | 'UPDATE' | 'DELETE'
        created_at: string
      }>
    }
    Views: Record<string, never>
    Functions: {
      get_next_token: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      register_patient_atomic: {
        Args: {
          p_full_name: string
          p_age: number
          p_gender: string
          p_phone: string
          p_chief_complaint: string
          p_doctor_id?: string | null
          p_address?: string | null
          p_father_name?: string | null
          p_referral_source?: 'google' | 'youtube' | 'social_media' | 'friend_family' | 'doctor_referral' | 'walk_in' | 'other' | null
          p_visit_type?: 'first_visit' | 'follow_up'
          p_consultation_date?: string
          p_consultation_time?: string
          p_registered_by?: string
          p_request_hash?: string | null
        }
        Returns: Array<{
          token_number: number
          visit_id: string
          patient_name: string
          confirmation_token: string
          duplicate_registration: boolean
        }>
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
