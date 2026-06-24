import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full px-3 py-2.5 text-sm border rounded-lg bg-white text-slate-900 placeholder:text-slate-400 resize-none',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent',
            error ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 hover:border-slate-400',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
