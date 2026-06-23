"use client";

import { useState, useEffect, useCallback, useMemo, type ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, startOfWeek, subDays, subYears } from 'date-fns'
import {
  Banknote,
  CalendarDays,
  Calculator,
  Clock,
  Download,
  Filter,
  Percent,
  Receipt,
  RefreshCw,
  Search,
  Smartphone,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import * as dataService from '@/lib/dataService'
import type { Invoice } from '@/types'
import { useToast } from '@/components/ui/Toast'

type DatePreset = 'today' | 'yesterday' | 'two_days_ago' | 'last_7_days' | 'this_week' | 'this_month' | 'last_1_year'
type ActiveDatePreset = DatePreset | 'custom'
type DateBasis = 'activity' | 'invoice' | 'payment'
type PaymentStatusFilter = 'all' | Invoice['payment_status']
type PaymentMethodFilter = 'all' | 'cash' | 'online_upi'
type VisitTypeFilter = 'all' | 'first_visit' | 'follow_up'
type DiscountFilter = 'all' | 'with_discount' | 'without_discount'

interface DateRange {
  from: string
  to: string
}

interface SummaryCardProps {
  title: string
  value: string
  detail: string
  icon: ComponentType<{ className?: string }>
  tone: 'emerald' | 'blue' | 'amber' | 'slate' | 'purple' | 'rose'
}

const datePresets: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'two_days_ago', label: '2 days ago' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_1_year', label: 'Last 1 year' },
]

const toneClasses: Record<SummaryCardProps['tone'], string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  slate: 'bg-slate-50 text-slate-700 border-slate-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
}

function formatInputDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function getPresetRange(preset: DatePreset): DateRange {
  const now = new Date()

  if (preset === 'yesterday') {
    const day = subDays(now, 1)
    return { from: formatInputDate(day), to: formatInputDate(day) }
  }

  if (preset === 'two_days_ago') {
    const day = subDays(now, 2)
    return { from: formatInputDate(day), to: formatInputDate(day) }
  }

  if (preset === 'last_7_days') {
    return { from: formatInputDate(subDays(now, 6)), to: formatInputDate(now) }
  }

  if (preset === 'this_week') {
    return {
      from: formatInputDate(startOfWeek(now, { weekStartsOn: 1 })),
      to: formatInputDate(now),
    }
  }

  if (preset === 'this_month') {
    return { from: formatInputDate(startOfMonth(now)), to: formatInputDate(now) }
  }

  if (preset === 'last_1_year') {
    return { from: formatInputDate(subYears(now, 1)), to: formatInputDate(now) }
  }

  return { from: formatInputDate(now), to: formatInputDate(now) }
}

function getRangeBoundaries(range: DateRange) {
  const start = new Date(`${range.from}T00:00:00`)
  const end = new Date(`${range.to}T23:59:59.999`)
  return { start, end }
}

function isDateInRange(value: string | null | undefined, range: DateRange): boolean {
  if (!value) return false
  const date = new Date(value)
  const { start, end } = getRangeBoundaries(range)
  return date >= start && date <= end
}

function isPaidInvoice(invoice: Invoice): boolean {
  return invoice.payment_status !== 'pending'
}

function isCashInvoice(invoice: Invoice): boolean {
  return invoice.payment_status === 'paid_cash' || invoice.payment_method === 'cash'
}

function isOnlineInvoice(invoice: Invoice): boolean {
  return invoice.payment_status === 'paid_online' || invoice.payment_method === 'online_upi'
}

function getPaymentMethodLabel(invoice: Invoice): string {
  if (invoice.payment_status === 'pending') return 'Not paid'
  if (isCashInvoice(invoice)) return 'Cash'
  if (isOnlineInvoice(invoice)) return 'UPI/Online'
  return 'Paid'
}

function getVisitTypeLabel(type: 'first_visit' | 'follow_up' | null | undefined): string {
  if (type === 'first_visit') return 'First-time'
  if (type === 'follow_up') return 'Repeat'
  return 'Unknown'
}

function getInvoiceDateMatch(invoice: Invoice, range: DateRange, basis: DateBasis): boolean {
  if (basis === 'invoice') return isDateInRange(invoice.created_at, range)
  if (basis === 'payment') return isDateInRange(invoice.paid_at, range)
  return isDateInRange(invoice.created_at, range) || isDateInRange(invoice.paid_at, range)
}

function getRangeLabel(range: DateRange): string {
  const from = formatDate(`${range.from}T00:00:00`)
  const to = formatDate(`${range.to}T00:00:00`)
  return range.from === range.to ? from : `${from} - ${to}`
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function SummaryCard({ title, value, detail, icon: Icon, tone }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function InvoicesPage() {
  const router = useRouter()
  const toast = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<ActiveDatePreset>('today')
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange('today'))
  const [dateBasis, setDateBasis] = useState<DateBasis>('activity')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>('all')
  const [visitTypeFilter, setVisitTypeFilter] = useState<VisitTypeFilter>('all')
  const [discountFilter, setDiscountFilter] = useState<DiscountFilter>('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  useEffect(() => {
    if (!filtersOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filtersOpen])

  const rangeLabel = getRangeLabel(dateRange)

  const summary = useMemo(() => {
    const paidInRange = invoices.filter((invoice) => isPaidInvoice(invoice) && isDateInRange(invoice.paid_at, dateRange))
    const createdInRange = invoices.filter((invoice) => isDateInRange(invoice.created_at, dateRange))
    const pendingInRange = createdInRange.filter((invoice) => invoice.payment_status === 'pending')

    const totalCollection = paidInRange.reduce((sum, invoice) => sum + invoice.total, 0)
    const cashCollection = paidInRange.filter(isCashInvoice).reduce((sum, invoice) => sum + invoice.total, 0)
    const onlineCollection = paidInRange.filter(isOnlineInvoice).reduce((sum, invoice) => sum + invoice.total, 0)
    const totalDiscount = paidInRange.reduce((sum, invoice) => sum + invoice.discount, 0)
    const pendingAmount = pendingInRange.reduce((sum, invoice) => sum + invoice.total, 0)
    const patientIds = new Set(createdInRange.map((invoice) => invoice.patient_id))
    const firstVisitCount = createdInRange.filter((invoice) => invoice.visit?.visit_type === 'first_visit').length
    const repeatVisitCount = createdInRange.filter((invoice) => invoice.visit?.visit_type === 'follow_up').length

    return {
      totalCollection,
      cashCollection,
      onlineCollection,
      totalDiscount,
      pendingAmount,
      paidCount: paidInRange.length,
      pendingCount: pendingInRange.length,
      patientCount: patientIds.size,
      firstVisitCount,
      repeatVisitCount,
      averageOrder: paidInRange.length > 0 ? totalCollection / paidInRange.length : 0,
      cashShare: totalCollection > 0 ? Math.round((cashCollection / totalCollection) * 100) : 0,
      onlineShare: totalCollection > 0 ? Math.round((onlineCollection / totalCollection) * 100) : 0,
    }
  }, [invoices, dateRange])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const parsedMin = minAmount.trim() === '' ? null : Number(minAmount)
    const parsedMax = maxAmount.trim() === '' ? null : Number(maxAmount)

    return invoices.filter((invoice) => {
      if (!getInvoiceDateMatch(invoice, dateRange, dateBasis)) return false

      if (paymentStatusFilter !== 'all' && invoice.payment_status !== paymentStatusFilter) return false
      if (paymentMethodFilter === 'cash' && !isCashInvoice(invoice)) return false
      if (paymentMethodFilter === 'online_upi' && !isOnlineInvoice(invoice)) return false
      if (visitTypeFilter !== 'all' && invoice.visit?.visit_type !== visitTypeFilter) return false
      if (discountFilter === 'with_discount' && invoice.discount <= 0) return false
      if (discountFilter === 'without_discount' && invoice.discount > 0) return false
      if (parsedMin !== null && Number.isFinite(parsedMin) && invoice.total < parsedMin) return false
      if (parsedMax !== null && Number.isFinite(parsedMax) && invoice.total > parsedMax) return false

      if (!query) return true

      const searchable = [
        invoice.invoice_number,
        invoice.patient?.full_name,
        invoice.patient?.phone,
        invoice.patient?.father_name,
        invoice.visit?.token_number ? `token ${invoice.visit.token_number}` : '',
        invoice.visit?.chief_complaint,
        invoice.payment_status.replace('_', ' '),
        getPaymentMethodLabel(invoice),
        invoice.visit?.visit_type === 'first_visit' ? 'first first-time new patient' : '',
        invoice.visit?.visit_type === 'follow_up' ? 'repeat follow-up old patient' : '',
        invoice.subtotal,
        invoice.discount,
        invoice.total,
        formatDate(invoice.created_at),
        invoice.paid_at ? formatDate(invoice.paid_at) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [
    invoices,
    search,
    dateRange,
    dateBasis,
    paymentStatusFilter,
    paymentMethodFilter,
    visitTypeFilter,
    discountFilter,
    minAmount,
    maxAmount,
  ])

  const periodInvoiceCount = useMemo(
    () => invoices.filter((invoice) => getInvoiceDateMatch(invoice, dateRange, dateBasis)).length,
    [invoices, dateRange, dateBasis]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (datePreset === 'custom') count += 1
    if (dateBasis !== 'activity') count += 1
    if (paymentStatusFilter !== 'all') count += 1
    if (paymentMethodFilter !== 'all') count += 1
    if (visitTypeFilter !== 'all') count += 1
    if (discountFilter !== 'all') count += 1
    if (minAmount.trim() !== '') count += 1
    if (maxAmount.trim() !== '') count += 1
    return count
  }, [
    datePreset,
    dateBasis,
    paymentStatusFilter,
    paymentMethodFilter,
    visitTypeFilter,
    discountFilter,
    minAmount,
    maxAmount,
  ])

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    setDateRange(getPresetRange(preset))
  }

  const handlePeriodChange = (value: ActiveDatePreset) => {
    if (value === 'custom') {
      setDatePreset('custom')
      setFiltersOpen(true)
      return
    }

    handlePresetChange(value)
  }

  const resetFilters = () => {
    setSearch('')
    setDatePreset('today')
    setDateRange(getPresetRange('today'))
    setDateBasis('activity')
    setPaymentStatusFilter('all')
    setPaymentMethodFilter('all')
    setVisitTypeFilter('all')
    setDiscountFilter('all')
    setMinAmount('')
    setMaxAmount('')
  }

  const handleMarkAsPaid = async (id: string) => {
    try {
      await dataService.updateInvoice(id, { payment_status: 'paid_cash', payment_method: 'cash' })
      await loadData()
      toast.success('Invoice marked as paid by cash')
    } catch {
      toast.error('Failed to update invoice')
    }
  }

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error('No invoices to export')
      return
    }

    const headers = [
      'Invoice #',
      'Created At',
      'Paid At',
      'Patient',
      'Phone',
      'Father Name',
      'Token #',
      'Visit Type',
      'Disease / Complaint',
      'Payment Status',
      'Payment Method',
      'Subtotal',
      'Discount',
      'Total',
    ]

    const rows = filtered.map((invoice) => [
      invoice.invoice_number,
      formatDate(invoice.created_at, 'dd MMM yyyy hh:mm a'),
      invoice.paid_at ? formatDate(invoice.paid_at, 'dd MMM yyyy hh:mm a') : '',
      invoice.patient?.full_name ?? '',
      invoice.patient?.phone ?? '',
      invoice.patient?.father_name ?? '',
      invoice.visit?.token_number ?? '',
      getVisitTypeLabel(invoice.visit?.visit_type),
      invoice.visit?.chief_complaint ?? '',
      getStatusLabel(invoice.payment_status),
      getPaymentMethodLabel(invoice),
      invoice.subtotal,
      invoice.discount,
      invoice.total,
    ])

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `clinic-invoices-${dateRange.from}-to-${dateRange.to}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Invoice report exported')
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <PageHeader
          title="Invoices"
          description={`Collection summary for ${rangeLabel}. Showing ${filtered.length} of ${periodInvoiceCount} matching invoices.`}
        />

        <section className="mb-6 rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-white to-emerald-50/50 p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <Wallet className="h-3.5 w-3.5" />
                Analytics summary
              </div>
              <h2 className="mt-3 text-xl font-bold text-slate-900">Collection & patient analytics</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Paid collections use payment date. Pending totals and patient counts use invoices created in the selected range.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-slate-100 bg-white/80 p-3 shadow-sm lg:w-64">
              <label htmlFor="analytics-period" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Analytics period
              </label>
              <select
                id="analytics-period"
                value={datePreset}
                onChange={(event) => handlePeriodChange(event.target.value as ActiveDatePreset)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
              >
                {datePresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
                <option value="custom">Custom range</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">{rangeLabel}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total collection"
              value={formatCurrency(summary.totalCollection)}
              detail={`${summary.paidCount} paid invoice${summary.paidCount === 1 ? '' : 's'}`}
              icon={Wallet}
              tone="emerald"
            />
            <SummaryCard
              title="Cash collected"
              value={formatCurrency(summary.cashCollection)}
              detail={`${summary.cashShare}% of collection`}
              icon={Banknote}
              tone="amber"
            />
            <SummaryCard
              title="Online / UPI"
              value={formatCurrency(summary.onlineCollection)}
              detail={`${summary.onlineShare}% of collection`}
              icon={Smartphone}
              tone="blue"
            />
            <SummaryCard
              title="Average bill"
              value={formatCurrency(summary.averageOrder)}
              detail="Paid invoices only"
              icon={Calculator}
              tone="slate"
            />
            <SummaryCard
              title="Patient count"
              value={String(summary.patientCount)}
              detail={`${summary.firstVisitCount} first-time visits`}
              icon={Users}
              tone="purple"
            />
            <SummaryCard
              title="Repeat patients"
              value={String(summary.repeatVisitCount)}
              detail="Follow-up/repeat visits"
              icon={RefreshCw}
              tone="blue"
            />
            <SummaryCard
              title="Discount given"
              value={formatCurrency(summary.totalDiscount)}
              detail="Discount on paid invoices"
              icon={Percent}
              tone="rose"
            />
            <SummaryCard
              title="Pending amount"
              value={formatCurrency(summary.pendingAmount)}
              detail={`${summary.pendingCount} pending invoice${summary.pendingCount === 1 ? '' : 's'}`}
              icon={Clock}
              tone="amber"
            />
          </div>
        </section>

        <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="invoice-search" className="sr-only">
                Search invoices
              </label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="invoice-search"
                type="text"
                placeholder="Search invoice, patient, phone, token, disease, amount..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
              >
                <Filter className="h-4 w-4 text-[#1D9E75]" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-[#1D9E75] px-2 py-0.5 text-xs font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Showing {filtered.length} of {periodInvoiceCount} invoices for {rangeLabel}.
          </p>
        </section>

        {filtersOpen && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="invoice-filter-title"
              className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#1D9E75]">Invoice filters</p>
                  <h3 id="invoice-filter-title" className="mt-1 text-lg font-bold text-slate-900">
                    Refine report
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Adjust date, payment, visit, discount, and amount filters.</p>
                </div>
                <button
                  type="button"
                  aria-label="Close filter panel"
                  onClick={() => setFiltersOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <h4 className="text-sm font-bold text-slate-900">Custom date range</h4>
                  <p className="mt-1 text-xs text-slate-500">Changing these dates switches the analytics period to custom.</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="date-from" className="mb-1 block text-xs font-semibold text-slate-600">
                        From
                      </label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="date-from"
                          type="date"
                          value={dateRange.from}
                          onChange={(event) => {
                            setDatePreset('custom')
                            setDateRange((current) => ({ ...current, from: event.target.value }))
                          }}
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="date-to" className="mb-1 block text-xs font-semibold text-slate-600">
                        To
                      </label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="date-to"
                          type="date"
                          value={dateRange.to}
                          onChange={(event) => {
                            setDatePreset('custom')
                            setDateRange((current) => ({ ...current, to: event.target.value }))
                          }}
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label htmlFor="date-basis" className="mb-1 block text-xs font-semibold text-slate-600">
                      Date basis
                    </label>
                    <select
                      id="date-basis"
                      value={dateBasis}
                      onChange={(event) => setDateBasis(event.target.value as DateBasis)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    >
                      <option value="activity">Invoice or payment date</option>
                      <option value="invoice">Invoice created date</option>
                      <option value="payment">Payment received date</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="payment-status" className="mb-1 block text-xs font-semibold text-slate-600">
                      Payment status
                    </label>
                    <select
                      id="payment-status"
                      value={paymentStatusFilter}
                      onChange={(event) => setPaymentStatusFilter(event.target.value as PaymentStatusFilter)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    >
                      <option value="all">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="paid_cash">Paid cash</option>
                      <option value="paid_online">Paid online</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="payment-method" className="mb-1 block text-xs font-semibold text-slate-600">
                      Method
                    </label>
                    <select
                      id="payment-method"
                      value={paymentMethodFilter}
                      onChange={(event) => setPaymentMethodFilter(event.target.value as PaymentMethodFilter)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    >
                      <option value="all">All methods</option>
                      <option value="cash">Cash</option>
                      <option value="online_upi">Online / UPI</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="visit-type" className="mb-1 block text-xs font-semibold text-slate-600">
                      Visit type
                    </label>
                    <select
                      id="visit-type"
                      value={visitTypeFilter}
                      onChange={(event) => setVisitTypeFilter(event.target.value as VisitTypeFilter)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    >
                      <option value="all">All visits</option>
                      <option value="first_visit">First-time</option>
                      <option value="follow_up">Repeat</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="discount-filter" className="mb-1 block text-xs font-semibold text-slate-600">
                      Discount
                    </label>
                    <select
                      id="discount-filter"
                      value={discountFilter}
                      onChange={(event) => setDiscountFilter(event.target.value as DiscountFilter)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    >
                      <option value="all">All invoices</option>
                      <option value="with_discount">With discount</option>
                      <option value="without_discount">Without discount</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="min-amount" className="mb-1 block text-xs font-semibold text-slate-600">
                        Min amount
                      </label>
                      <input
                        id="min-amount"
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={minAmount}
                        onChange={(event) => setMinAmount(event.target.value)}
                        placeholder="0"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                      />
                    </div>
                    <div>
                      <label htmlFor="max-amount" className="mb-1 block text-xs font-semibold text-slate-600">
                        Max amount
                      </label>
                      <input
                        id="max-amount"
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={maxAmount}
                        onChange={(event) => setMaxAmount(event.target.value)}
                        placeholder="9999"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 p-5">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="min-h-11 flex-1 rounded-xl bg-[#1D9E75] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#15805e] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                >
                  Apply filters
                </button>
              </div>
            </aside>
          </div>
        )}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Receipt className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1 text-base font-semibold text-slate-700">No invoices found</h3>
              <p className="max-w-md text-sm text-slate-500">Try a wider date range, remove filters, or search by another patient/detail.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Visit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Paid at</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Subtotal</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Discount</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((invoice) => (
                    <tr
                      key={invoice.id}
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                      className="cursor-pointer transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">{invoice.invoice_number}</p>
                        {invoice.visit?.token_number && (
                          <p className="text-xs text-slate-500">Token #{invoice.visit.token_number}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{invoice.patient?.full_name ?? '—'}</p>
                        <p className="text-xs text-slate-500">{invoice.patient?.phone ?? 'No phone'}</p>
                        {invoice.patient?.father_name && (
                          <p className="text-xs text-slate-400">Father: {invoice.patient.father_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                          {getVisitTypeLabel(invoice.visit?.visit_type)}
                        </span>
                        {invoice.visit?.chief_complaint && (
                          <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500" title={invoice.visit.chief_complaint}>
                            {invoice.visit.chief_complaint}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(invoice.created_at, 'dd MMM, hh:mm a')}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {invoice.paid_at ? formatDate(invoice.paid_at, 'dd MMM, hh:mm a') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">{formatCurrency(invoice.subtotal)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-rose-600">
                        {invoice.discount > 0 ? `-${formatCurrency(invoice.discount)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{formatCurrency(invoice.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={cn('rounded-full border px-2 py-1 text-xs font-semibold', getStatusColor(invoice.payment_status))}>
                            {getStatusLabel(invoice.payment_status)}
                          </span>
                          <span className="text-xs text-slate-500">{getPaymentMethodLabel(invoice)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {invoice.payment_status === 'pending' ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleMarkAsPaid(invoice.id)
                            }}
                            className="whitespace-nowrap rounded-lg bg-[#1D9E75] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#15805e] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                          >
                            Mark cash paid
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">View details</span>
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
