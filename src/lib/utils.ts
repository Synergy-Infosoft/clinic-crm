import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  return format(new Date(date), fmt)
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy, hh:mm a')
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'hh:mm a')
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'cancelled':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    case 'pending':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'paid_cash':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'paid_online':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    case 'pending':
      return 'Pending'
    case 'paid_cash':
      return 'Paid (Cash)'
    case 'paid_online':
      return 'Paid (UPI)'
    default:
      return status
  }
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function isClinicOpen(
  workingHoursStart: string,
  workingHoursEnd: string,
  workingDays: number[]
): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay()
  if (!workingDays.includes(dayOfWeek)) return false
  const currentTime = format(now, 'HH:mm')
  return currentTime >= workingHoursStart && currentTime <= workingHoursEnd
}
