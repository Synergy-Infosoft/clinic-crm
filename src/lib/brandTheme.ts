export interface BrandThemeSettings {
  logo_url: string
  theme_color: string
  theme_color_hover: string
  theme_color_light: string
}

export const defaultBrandTheme: BrandThemeSettings = {
  logo_url: '',
  theme_color: '#1D9E75',
  theme_color_hover: '#0F6E56',
  theme_color_light: '#E8F8F2',
}

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

export function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed.toUpperCase() : fallback
}

function mixHexColors(color: string, mixWith: string, weight: number) {
  const normalizedColor = normalizeHexColor(color, defaultBrandTheme.theme_color)
  const normalizedMix = normalizeHexColor(mixWith, '#FFFFFF')
  const amount = Math.min(Math.max(weight, 0), 1)

  const source = Number.parseInt(normalizedColor.slice(1), 16)
  const target = Number.parseInt(normalizedMix.slice(1), 16)

  const sr = (source >> 16) & 255
  const sg = (source >> 8) & 255
  const sb = source & 255

  const tr = (target >> 16) & 255
  const tg = (target >> 8) & 255
  const tb = target & 255

  const r = Math.round(sr * (1 - amount) + tr * amount)
  const g = Math.round(sg * (1 - amount) + tg * amount)
  const b = Math.round(sb * (1 - amount) + tb * amount)

  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function deriveHoverColor(primaryColor: string) {
  return mixHexColors(primaryColor, '#000000', 0.28)
}

export function deriveLightColor(primaryColor: string) {
  return mixHexColors(primaryColor, '#FFFFFF', 0.88)
}

export function normalizeBrandTheme(settings: Partial<BrandThemeSettings> | null | undefined): BrandThemeSettings {
  const primary = normalizeHexColor(settings?.theme_color, defaultBrandTheme.theme_color)
  return {
    logo_url: typeof settings?.logo_url === 'string' ? settings.logo_url.trim() : '',
    theme_color: primary,
    theme_color_hover: normalizeHexColor(settings?.theme_color_hover, deriveHoverColor(primary)),
    theme_color_light: normalizeHexColor(settings?.theme_color_light, deriveLightColor(primary)),
  }
}

export function applyBrandThemeToDocument(theme: BrandThemeSettings) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--primary', theme.theme_color)
  root.style.setProperty('--primary-hover', theme.theme_color_hover)
  root.style.setProperty('--primary-light', theme.theme_color_light)
}
