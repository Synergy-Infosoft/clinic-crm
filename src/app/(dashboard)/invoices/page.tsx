"use client";

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatCurrency, formatDate } from '@/lib/utils'
import * as dataService from '@/lib/dataService'
import type { Invoice } from '@/types'
import { Search, Receipt } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export default function InvoicesPage() {
  const router = useRouter()
  const toast = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const data = await dataService.getInvoices()
      setInvoices(data)
    } catch {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.patient?.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleMarkAsPaid = async (id: string) => {
    try {
      await dataService.updateInvoice(id, { payment_status: 'paid_cash' })
      await loadData()
      toast.success('Invoice marked as paid')
    } catch {
      toast.error('Failed to update invoice')
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <PageHeader
          title="Invoices"
          description={`Showing ${filtered.length} invoices`}
        />

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number or patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          />
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Receipt className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-1">No invoices found</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Invoice #</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Patient</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((inv) => (
                    <tr 
                      key={inv.id} 
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-sm text-slate-900">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{inv.patient?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(inv.created_at)}</td>
                      <td className="px-4 py-3 font-semibold text-sm text-slate-900">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          inv.payment_status.startsWith('paid')
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {inv.payment_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {inv.payment_status === 'pending' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsPaid(inv.id)
                            }}
                            className="text-xs px-2.5 py-1 bg-[#1D9E75] text-white rounded-lg hover:bg-[#15805e] transition-colors font-medium whitespace-nowrap"
                          >
                            Mark as Paid
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">View Details</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
