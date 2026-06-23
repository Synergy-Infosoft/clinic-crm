import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', loading, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-[#1D9E75] hover:bg-[#0F6E56] text-white focus:ring-[#1D9E75]': variant === 'primary',
            'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-300': variant === 'secondary',
            'border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 focus:ring-slate-300': variant === 'outline',
            'hover:bg-slate-100 text-slate-600 focus:ring-slate-300': variant === 'ghost',
            'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400': variant === 'danger',
            'bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-400': variant === 'success',
          },
          {
            'text-xs px-2.5 py-1.5 h-8': size === 'sm',
            'text-sm px-4 py-2 h-10': size === 'md',
            'text-base px-6 py-3 h-12': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
