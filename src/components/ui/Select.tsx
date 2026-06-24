import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full h-11 px-3 text-sm border rounded-lg bg-white text-slate-900',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent',
            'appearance-none cursor-pointer',
            error ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 hover:border-slate-400',
            className
          )}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394A3B8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.2em', paddingRight: '2.5rem' }}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
