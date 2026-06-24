"use client"

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { applyBrandThemeToDocument, normalizeBrandTheme } from '@/lib/brandTheme'
import { fallbackClinicSettings, type PublicClinicSettings } from '@/lib/registration'

interface BrandingContextValue {
  settings: PublicClinicSettings
  loading: boolean
  refreshBranding: () => Promise<void>
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined)

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicClinicSettings>(fallbackClinicSettings)
  const [loading, setLoading] = useState(true)

  const refreshBranding = useCallback(async () => {
    try {
      const response = await fetch('/api/public-config', { cache: 'no-store' })
      if (!response.ok) throw new Error('Unable to load clinic branding')
      const config = await response.json()
      setSettings({ ...fallbackClinicSettings, ...(config.settings ?? {}) })
    } catch {
      setSettings(fallbackClinicSettings)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshBranding()
  }, [refreshBranding])

  const theme = useMemo(() => normalizeBrandTheme(settings), [settings])

  useEffect(() => {
    applyBrandThemeToDocument(theme)
  }, [theme])

  const value = useMemo(
    () => ({ settings: { ...settings, ...theme }, loading, refreshBranding }),
    [loading, refreshBranding, settings, theme]
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export function useBranding() {
  const context = useContext(BrandingContext)
  if (!context) {
    return {
      settings: fallbackClinicSettings,
      loading: false,
      refreshBranding: async () => {},
    } satisfies BrandingContextValue
  }
  return context
}
