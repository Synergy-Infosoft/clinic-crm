import { cn, getStatusLabel } from '../../lib/utils'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const statusClasses: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  paid_cash: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  paid_online: 'bg-blue-100 text-blue-800 border-blue-200',
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1',
        statusClasses[status] || 'bg-slate-100 text-slate-600 border-slate-200'
      )}
    >
      {getStatusLabel(status)}
    </span>
  )
}
