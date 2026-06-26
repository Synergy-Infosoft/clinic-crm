import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultBrandTheme } from '../lib/brandTheme'
import type { Patient, Visit, Invoice, Doctor, ChargePreset, ClinicSettings, Profile } from '../types'

interface AppState {
  // Auth
  currentUser: Profile | null
  setCurrentUser: (user: Profile | null) => void

  // Patients
  patients: Patient[]
  setPatients: (patients: Patient[]) => void
  addPatient: (patient: Patient) => void
  updatePatient: (id: string, updates: Partial<Patient>) => void

  // Visits
  visits: Visit[]
  setVisits: (visits: Visit[]) => void
  addVisit: (visit: Visit) => void
  updateVisit: (id: string, updates: Partial<Visit>) => void

  // Invoices
  invoices: Invoice[]
  setInvoices: (invoices: Invoice[]) => void
  addInvoice: (invoice: Invoice) => void
  updateInvoice: (id: string, updates: Partial<Invoice>) => void

  // Doctors
  doctors: Doctor[]
  setDoctors: (doctors: Doctor[]) => void

  // Charge Presets
  chargePresets: ChargePreset[]
  setChargePresets: (presets: ChargePreset[]) => void

  // Clinic Settings
  clinicSettings: ClinicSettings
  setClinicSettings: (settings: ClinicSettings) => void

  // UI State
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

const defaultSettings: ClinicSettings = {
  clinic_name: 'ClinicFlow Medical Center',
  address: '123 Health Street, Medical District, City - 400001',
  phone: '+91 98765 43210',
  doctor_name: 'Dr. Rakesh Sharma',
  registration_number: 'MH-12345-2024',
  website_url: '',
  ...defaultBrandTheme,
  working_hours_start: '09:00',
  working_hours_end: '18:00',
  working_days: [1, 2, 3, 4, 5, 6],
  working_schedule: [
    { day: 1, enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    { day: 2, enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    { day: 3, enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    { day: 4, enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    { day: 5, enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    { day: 6, enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
    { day: 0, enabled: false, slots: [] },
  ],
  timezone: 'Asia/Kolkata',
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      patients: [],
      setPatients: (patients) => set({ patients }),
      addPatient: (patient) => set((state) => ({ patients: [patient, ...state.patients] })),
      updatePatient: (id, updates) =>
        set((state) => ({
          patients: state.patients.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      visits: [],
      setVisits: (visits) => set({ visits }),
      addVisit: (visit) => set((state) => ({ visits: [visit, ...state.visits] })),
      updateVisit: (id, updates) =>
        set((state) => ({
          visits: state.visits.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        })),

      invoices: [],
      setInvoices: (invoices) => set({ invoices }),
      addInvoice: (invoice) => set((state) => ({ invoices: [invoice, ...state.invoices] })),
      updateInvoice: (id, updates) =>
        set((state) => ({
          invoices: state.invoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
        })),

      doctors: [],
      setDoctors: (doctors) => set({ doctors }),

      chargePresets: [],
      setChargePresets: (chargePresets) => set({ chargePresets }),

      clinicSettings: defaultSettings,
      setClinicSettings: (settings) => set({ clinicSettings: settings }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'clinicflow-storage',
      partialize: (state) => ({
        clinicSettings: state.clinicSettings,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
