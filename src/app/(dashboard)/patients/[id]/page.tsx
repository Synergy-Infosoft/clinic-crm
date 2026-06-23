"use client";

import { useState, useEffect, type ComponentType } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  BadgeInfo,
  Calendar,
  CalendarClock,
  ClipboardList,
  Clock,
  FileText,
  Hash,
  HeartPulse,
  MapPin,
  Megaphone,
  NotebookText,
  Phone,
  Pill,
  Stethoscope,
  User,
  UserRound,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/Button'
import { formatDate, formatDateTime } from '@/lib/utils'
import * as dataService from '@/lib/dataService'
import type { Patient, Visit } from '@/types'

interface DetailItemProps {
  label: string
  value: string | number | null | undefined
  icon: ComponentType<{ className?: string }>
  tone?: 'emerald' | 'blue' | 'amber' | 'purple' | 'slate' | 'rose' | 'indigo'
}

const toneClasses: Record<NonNullable<DetailItemProps['tone']>, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  slate: 'bg-slate-50 text-slate-700 border-slate-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
}

function formatOptional(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Not provided'
  return String(value)
}

function formatReferralSource(source: string | null | undefined): string {
  const labels: Record<string, string> = {
    google: 'Google',
    youtube: 'YouTube',
    social_media: 'Social Media',
    friend_family: 'Friend / Family',
    doctor_referral: 'Doctor Referral',
    walk_in: 'Walk-in / Signboard',
    other: 'Other',
  }

  if (!source) return 'Not provided'
  return labels[source] ?? source.replace(/_/g, ' ')
}

function formatVisitType(type: Visit['visit_type'] | null | undefined): string {
  if (type === 'first_visit') return 'First-time visit'
  if (type === 'follow_up') return 'Repeat / follow-up'
  return 'Not provided'
}

function formatRegisteredBy(value: Visit['registered_by'] | null | undefined): string {
  if (value === 'self') return 'Self registration'
  if (value === 'receptionist') return 'Reception desk'
  return 'Not provided'
}

function formatTimeValue(value: string | null | undefined): string {
  if (!value) return 'Not provided'
  return value.slice(0, 5)
}

function DetailItem({ label, value, icon: Icon, tone = 'slate' }: DetailItemProps) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-900">{formatOptional(value)}</p>
      </div>
    </div>
  )
}

export default function PatientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [patient, setPatient] = useState<Patient | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [patientData, visitsData] = await Promise.all([
          dataService.getPatientById(id),
          dataService.getVisitsByPatient(id),
        ])
        setPatient(patientData)
        setVisits(visitsData)
      } catch (error) {
        console.error('Failed to load patient data:', error)
      } finally {
        setLoading(false)
      }
    }
    if (id) loadData()
  }, [id])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
        </div>
      </DashboardLayout>
    )
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-slate-800">Patient not found</h2>
          <Button onClick={() => router.push('/patients')} className="mt-4">
            Back to Patients
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const latestVisit = visits[0]
  const completedVisits = visits.filter((visit) => visit.status === 'completed').length
  const pendingVisits = visits.filter((visit) => visit.status === 'pending').length
  const patientInitial = patient.full_name.trim().charAt(0).toUpperCase() || '?'

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Back to patients"
            onClick={() => router.push('/patients')}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1D9E75]">Patient profile</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">{patient.full_name}</h1>
            <p className="mt-1 text-sm text-slate-500">Registered on {formatDate(patient.created_at, 'MMMM d, yyyy')}</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-[#1D9E75] text-4xl font-bold text-white shadow-sm">
                  {patientInitial}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900">{patient.full_name}</h2>
                    {latestVisit && <StatusBadge status={latestVisit.status} />}
                  </div>
                  <p className="mt-2 text-sm font-medium capitalize text-slate-600">
                    {patient.age} years • {patient.gender}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                      <Phone className="h-3.5 w-3.5 text-[#1D9E75]" />
                      {patient.phone}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                      <Calendar className="h-3.5 w-3.5 text-blue-600" />
                      {visits.length} visit{visits.length === 1 ? '' : 's'}
                    </span>
                    {latestVisit && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                        <Hash className="h-3.5 w-3.5 text-amber-600" />
                        Latest token #{latestVisit.token_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/80 p-3 shadow-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{visits.length}</p>
                  <p className="text-xs font-medium text-slate-500">Total visits</p>
                </div>
                <div className="border-x border-slate-100 px-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{completedVisits}</p>
                  <p className="text-xs font-medium text-slate-500">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-700">{pendingVisits}</p>
                  <p className="text-xs font-medium text-slate-500">Pending</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">Registration details</h2>
                <p className="mt-1 text-sm text-slate-500">All patient information collected during registration.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <DetailItem label="Full name" value={patient.full_name} icon={UserRound} tone="emerald" />
                <DetailItem label="Father's name" value={patient.father_name} icon={User} tone="indigo" />
                <DetailItem label="Age & gender" value={`${patient.age} years • ${patient.gender}`} icon={HeartPulse} tone="blue" />
                <DetailItem label="Phone number" value={patient.phone} icon={Phone} tone="emerald" />
                <DetailItem label="Address" value={patient.address} icon={MapPin} tone="purple" />
                <DetailItem label="Heard about us" value={formatReferralSource(patient.referral_source)} icon={Megaphone} tone="amber" />
                <DetailItem label="Registered on" value={formatDateTime(patient.created_at)} icon={CalendarClock} tone="slate" />
              </div>
            </section>

            {latestVisit && (
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Latest visit summary</h2>
                  <p className="mt-1 text-sm text-slate-500">Most recent consultation request for quick reference.</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <DetailItem label="Visit type" value={formatVisitType(latestVisit.visit_type)} icon={ClipboardList} tone="blue" />
                  <DetailItem
                    label="Consultation schedule"
                    value={`${formatDate(latestVisit.consultation_date || latestVisit.token_date)} at ${formatTimeValue(latestVisit.consultation_time)}`}
                    icon={Clock}
                    tone="amber"
                  />
                  <DetailItem label="Registered by" value={formatRegisteredBy(latestVisit.registered_by)} icon={BadgeInfo} tone="slate" />
                  <DetailItem label="Doctor" value={latestVisit.doctor?.name ?? 'Not assigned'} icon={Stethoscope} tone="emerald" />
                </div>
              </section>
            )}
          </div>

          <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Calendar className="h-5 w-5 text-[#1D9E75]" />
                  Visit history
                </h2>
                <p className="mt-1 text-sm text-slate-500">Complete visit, scheduling, and clinical details.</p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {visits.length} visit{visits.length === 1 ? '' : 's'}
              </span>
            </div>

            {visits.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                <p className="text-sm text-slate-500">No visits recorded for this patient yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visits.map((visit) => (
                  <article key={visit.id} className="p-5 transition-colors hover:bg-slate-50/70">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-bold text-slate-900">
                            {format(new Date(visit.consultation_date || visit.token_date), 'MMMM d, yyyy')}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            Token #{visit.token_number}
                          </span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {formatVisitType(visit.visit_type)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {formatTimeValue(visit.consultation_time)} • {formatRegisteredBy(visit.registered_by)}
                          {visit.doctor ? ` • Dr. ${visit.doctor.name.replace(/^Dr\.?\s*/i, '')}` : ' • Doctor not assigned'}
                        </p>
                      </div>
                      <StatusBadge status={visit.status} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <DetailItem label="Consultation date" value={formatDate(visit.consultation_date || visit.token_date)} icon={Calendar} tone="blue" />
                      <DetailItem label="Consultation time" value={formatTimeValue(visit.consultation_time)} icon={Clock} tone="amber" />
                      <DetailItem label="Registered by" value={formatRegisteredBy(visit.registered_by)} icon={BadgeInfo} tone="slate" />
                      <DetailItem label="Doctor" value={visit.doctor?.name ?? 'Not assigned'} icon={Stethoscope} tone="emerald" />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <NotebookText className="h-4 w-4 text-slate-500" />
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Disease / chief complaint</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm font-medium text-slate-800">{visit.chief_complaint || 'Not provided'}</p>
                      </div>

                      {visit.notes && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Doctor notes</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-slate-800">{visit.notes}</p>
                        </div>
                      )}

                      {visit.prescription && (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Pill className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Prescription</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-slate-800">{visit.prescription}</p>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}
