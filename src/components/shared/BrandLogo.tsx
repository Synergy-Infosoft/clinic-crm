import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BrandLogoProps {
  logoUrl?: string | null
  label: string
  className?: string
  fallback: ReactNode
}

function toCssUrl(value: string) {
  return value.replace(/["\\\n\r]/g, encodeURIComponent)
}

export function BrandLogo({ logoUrl, label, className, fallback }: BrandLogoProps) {
  const safeLogoUrl = logoUrl?.trim()

  if (safeLogoUrl) {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn('block bg-cover bg-center bg-no-repeat', className)}
        style={{ backgroundImage: `url("${toCssUrl(safeLogoUrl)}")` }}
      />
    )
  }

  return (
    <span className={cn('flex items-center justify-center', className)} aria-hidden="true">
      {fallback}
    </span>
  )
}
