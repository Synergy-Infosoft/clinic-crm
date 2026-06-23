"use client";

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Search, Plus, StickyNote } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/Button'
import { AddVisitDialog } from '@/components/visits/AddVisitDialog'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatTime } from '@/lib/utils'
import * as dataService from '@/lib/dataService'
import type { Visit, Doctor } from '@/types'

type StatusFilter = 'all' | Visit['status']

export default function VisitsPage() {
  const router = useRouter()
  const toast = useToast()
  const [visits, setVisits] = useState<Visit[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddVisit, setShowAddVisit] = useState(false)
  const [cancelVisitId, setCancelVisitId] = useState<string | null>(null)
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editPrescription, setEditPrescription] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [visitsData, doctorsData] = await Promise.all([
        dataService.getVisits(selectedDate),
        dataService.getDoctors(),
      ])
      setVisits(visitsData)
      setDoctors(doctorsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    setLoading(true)
    loadData()
    // Wrap async loadData so it doesn't leak a Promise as a cleanup return
    const handleChange = () => { loadData() }
    const unsub = dataService.subscribeToVisits(handleChange)
    return unsub
  }, [loadData])

  const filtered = visits.filter((v) => {
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    const matchesSearch =
      !search ||
      (v.patient?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      v.token_number.toString().includes(search)
    return matchesStatus && matchesSearch
  })

  const handleStatusChange = async (visitId: string, status: Visit['status']) => {
    try {
      await dataService.updateVisit(visitId, { status })
      await loadData()
      if (selectedVisit?.id === visitId) {
        setSelectedVisit((prev) => prev ? { ...prev, status } : prev)
      }
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleSaveVisitDetails = async () => {
    if (!selectedVisit) return
    setSaving(true)
    try {
      await dataService.updateVisit(selectedVisit.id, {
        notes: editNotes,
        prescription: editPrescription,
      })
      await loadData()
      toast.success('Visit details saved')
      setSelectedVisit(null)
    } catch {
      toast.error('Failed to save visit details')
    } finally {
      setSaving(false)
    }
  }

  const openVisitDetails = (visit: Visit) => {
    setSelectedVisit(visit)
    setEditNotes(visit.notes || '')
    setEditPrescription(visit.prescription || '')
  }

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'waiting', label: 'Waiting' },
    { value: 'with_doctor', label: 'With Doctor' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const counts: Record<StatusFilter, number> = {
    all: visits.length,
    waiting: visits.filter((v) => v.status === 'waiting').length,
    with_doctor: visits.filter((v) => v.status === 'with_doctor').length,
    completed: visits.filter((v) => v.status === 'completed').length,
    cancelled: visits.filter((v) => v.status === 'cancelled').length,
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <PageHeader
          title="Patient Queue"
          description="Manage today's appointments and visit status"
          actions={
            <Button onClick={() => setShowAddVisit(true)} size="sm">
              <Plus className="w-4 h-4" />
              Add Patient
            </Button>
          }
        />

        {/* Filters */}
        <div className="card p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 whitespace-nowrap">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by patient name or token..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
              />
            </div>
          </div>

          <div className="flex gap-1 mt-3 overflow-x-auto">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-[#1D9E75] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
                <span className={`${statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-white text-slate-600'} rounded-full px-1.5 py-0.5 text-xs`}>
                  {counts[tab.value]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Visit Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-slate-400 text-sm">No visits found for the selected filters</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((visit) => (
              <div
                key={visit.id}
                className="card p-4 hover-card cursor-pointer"
                onClick={() => openVisitDetails(visit)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#1D9E75]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-[#1D9E75]">{visit.token_number}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900">{visit.patient?.full_name}</h3>
                      <span className="text-xs text-slate-500">{visit.patient?.age}y · {visit.patient?.gender}</span>
                      <StatusBadge status={visit.status} size="sm" />
                      {visit.registered_by === 'self' && (
                        <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100">QR</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1">{visit.chief_complaint}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {visit.doctor && <span className="text-xs text-slate-500">Dr: {visit.doctor.name}</span>}
                      <span className="text-xs text-slate-400">{formatTime(visit.created_at)}</span>
                      {visit.notes && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <StickyNote className="w-3 h-3" /> Has notes
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {visit.status === 'waiting' && (
                      <button
                        onClick={() => handleStatusChange(visit.id, 'with_doctor')}
                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium whitespace-nowrap"
                      >
                        With Doctor
                      </button>
                    )}
                    {visit.status === 'with_doctor' && (
                      <button
                        onClick={() => handleStatusChange(visit.id, 'completed')}
                        className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const inv = await dataService.getInvoiceByVisit(visit.id)
                        if (inv) router.push(`/invoices/${inv.id}`)
                        else router.push('/invoices')
                      }}
                      className="text-xs px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-medium"
                    >
                      Invoice
                    </button>
                    {visit.status !== 'cancelled' && visit.status !== 'completed' && (
                      <button
                        onClick={() => setCancelVisitId(visit.id)}
                        className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visit Details Modal */}
      <Modal
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
        title={selectedVisit ? `Visit #${selectedVisit.token_number} — ${selectedVisit.patient?.full_name}` : ''}
        size="xl"
      >
        {selectedVisit && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Patient</p>
                <p className="text-sm font-semibold">{selectedVisit.patient?.full_name}</p>
                <p className="text-xs text-slate-500">{selectedVisit.patient?.age}y · {selectedVisit.patient?.gender} · {selectedVisit.patient?.phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Status</p>
                <StatusBadge status={selectedVisit.status} />
                <p className="text-xs text-slate-500 mt-1">{formatTime(selectedVisit.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Chief Complaint</p>
                <p className="text-sm text-slate-800">{selectedVisit.chief_complaint}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Assigned Doctor</p>
                <p className="text-sm text-slate-800">{selectedVisit.doctor?.name || 'Not assigned'}</p>
              </div>
            </div>

            {/* Doctor assignment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Doctor</label>
              <select
                defaultValue={selectedVisit.doctor_id || ''}
                onChange={async (e) => {
                  await dataService.updateVisit(selectedVisit.id, { doctor_id: e.target.value || null })
                  await loadData()
                }}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
              >
                <option value="">No doctor assigned</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Clinical Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Add clinical notes..."
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prescription</label>
              <textarea
                value={editPrescription}
                onChange={(e) => setEditPrescription(e.target.value)}
                rows={4}
                placeholder="Enter prescription details..."
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none font-mono"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedVisit.status === 'waiting' && (
                <button
                  onClick={() => handleStatusChange(selectedVisit.id, 'with_doctor')}
                  className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Mark as With Doctor
                </button>
              )}
              {selectedVisit.status === 'with_doctor' && (
                <button
                  onClick={() => handleStatusChange(selectedVisit.id, 'completed')}
                  className="px-4 py-2 text-sm font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  Mark as Completed
                </button>
              )}
              <button
                onClick={async () => {
                  const inv = await dataService.getInvoiceByVisit(selectedVisit.id)
                  if (inv) router.push(`/invoices/${inv.id}`)
                  setSelectedVisit(null)
                }}
                className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                View Invoice
              </button>
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedVisit(null)} className="flex-1">
                Close
              </Button>
              <Button onClick={handleSaveVisitDetails} loading={saving} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <AddVisitDialog
        isOpen={showAddVisit}
        onClose={() => setShowAddVisit(false)}
        onSuccess={() => { loadData(); toast.success('Patient added to queue') }}
        doctors={doctors}
      />

      <ConfirmDialog
        isOpen={!!cancelVisitId}
        onClose={() => setCancelVisitId(null)}
        onConfirm={() => {
          if (cancelVisitId) handleStatusChange(cancelVisitId, 'cancelled')
          setCancelVisitId(null)
        }}
        title="Cancel Visit"
        description="Are you sure you want to cancel this visit?"
        confirmLabel="Yes, Cancel"
      />
    </DashboardLayout>
  )
}
