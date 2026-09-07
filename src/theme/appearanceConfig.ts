/**
 * EDUPULSE APPEARANCE & CUSTOMIZATION SYSTEM
 * Centralized theme, color palette, glassmorphism, orb, and component styling engine.
 */

export type ThemeMode = 'dark' | 'light' | 'system' | 'comfort'
export type OrbShape = 'pill' | 'circle' | 'soft-circle' | 'capsule' | 'liquid'
export type ButtonShape = 'rounded' | 'pill' | 'sharp' | 'capsule' | 'glass' | 'floating'
export type CardStyle = 'glass' | 'flat' | 'soft' | 'elevated' | 'floating' | 'minimal'
export type SidebarStyle = 'glass-sidebar' | 'classic' | 'compact' | 'wide' | 'minimal'
export type NavigationStyle = 'glass' | 'orb' | 'pill' | 'simple' | 'underline' | 'floating'
export type ActiveNavigationStyle = 'glow' | 'orb' | 'gradient' | 'glass' | 'filled' | 'minimal'
export type BackgroundStyle = 'ambient-glow' | 'gradient' | 'aurora' | 'mesh' | 'solid' | 'minimal'
export type GradientStyle = 'linear' | 'radial' | 'aurora' | 'mesh' | 'dual' | 'triple' | 'none'
export type DensityMode = 'compact' | 'comfortable' | 'spacious'
export type AnimationSpeed = 'slow' | 'normal' | 'fast'
export type AnimationIntensity = 'minimal' | 'smooth' | 'expressive'

export interface ColorPalette {
  primary: string
  primaryGlow: string
  secondary: string
  accent: string
  background: string
  surface: string
  surfaceMuted: string
  card: string
  glass: string
  border: string
  text: string
  textSecondary: string
  icon: string
  button: string
  buttonText: string
  activeNav: string
  activeOrb: string
  hover: string
  success: string
  warning: string
  error: string
  orbBlue: string
  orbCyan: string
  orbPurple: string
}

export interface GlassConfig {
  opacity: number // 0.45 to 0.85
  blur: number // 0 to 30px
  brightness: number // 0.8 to 1.2
  borderOpacity: number // 0 to 0.35
  borderWidth: number // 0 to 2px
  shadowIntensity: number // 0 to 1
  saturation: number // 100 to 220%
}

export interface OrbConfig {
  shape: OrbShape
  size: number // 32 to 56px (logo/indicator scale)
  opacity: number // 0.5 to 1.0
  blur: number // 0 to 20px
  glowIntensity: number // 0 to 1
  borderWidth: number // 0 to 2px
  gradientStyle: GradientStyle
  animation: boolean
}

export interface ButtonConfig {
  shape: ButtonShape
  height: number // 36 to 52px
  radius: number // 0 to 28px
  shadow: boolean
  border: boolean
  gradient: boolean
  hoverEffect: boolean
}

export interface CardConfig {
  style: CardStyle
  radius: number // 8 to 32px
  opacity: number // 0.6 to 1.0
  border: boolean
  shadow: boolean
  blur: number // 0 to 24px
  padding: number // 12 to 32px
}

export interface SidebarConfig {
  style: SidebarStyle
  width: number // 220 to 320px
  radius: number // 12 to 32px
  opacity: number // 0.6 to 0.95
  blur: number // 0 to 30px
  border: boolean
  shadow: boolean
}

export interface NavigationConfig {
  style: NavigationStyle
  activeStyle: ActiveNavigationStyle
  itemHeight: number // 40 to 56px
  itemRadius: number // 8 to 24px
}

export interface BackgroundConfig {
  style: BackgroundStyle
  brightness: number // 0.6 to 1.4
  opacity: number // 0.3 to 1.0
  glowIntensity: number // 0 to 1
  glowSize: number // 0.6 to 1.4
}

export interface TypographyConfig {
  textScale: number // 0.85 to 1.2
  headingScale: number // 0.9 to 1.25
  lineHeight: number // 1.3 to 1.8
  letterSpacing: number // -0.03 to 0.05em
  fontWeight: 'normal' | 'medium' | 'semibold'
}

export interface AppearanceConfig {
  presetId: string
  mode: ThemeMode
  palette: ColorPalette
  glass: GlassConfig
  orb: OrbConfig
  button: ButtonConfig
  card: CardConfig
  sidebar: SidebarConfig
  navigation: NavigationConfig
  background: BackgroundConfig
  typography: TypographyConfig
  density: DensityMode
  animationSpeed: AnimationSpeed
  animationIntensity: AnimationIntensity
}

export const defaultAppearanceConfig: AppearanceConfig = {
  presetId: 'ocean-blue',
  mode: 'dark',
  palette: {
    primary: '#4f8cff',
    primaryGlow: 'rgba(79, 140, 255, 0.35)',
    secondary: '#765cff',
    accent: '#49d8ff',
    background: '#080e1e',
    surface: '#101827',
    surfaceMuted: '#172344',
    card: 'rgba(16, 24, 39, 0.74)',
    glass: 'rgba(16, 24, 39, 0.74)',
    border: 'rgba(255, 255, 255, 0.11)',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    icon: '#cbd5e1',
    button: '#4f8cff',
    buttonText: '#ffffff',
    activeNav: '#ffffff',
    activeOrb: '#49d8ff',
    hover: 'rgba(255, 255, 255, 0.06)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    orbBlue: '#4f8cff',
    orbCyan: '#49d8ff',
    orbPurple: '#765cff',
  },
  glass: {
    opacity: 0.74,
    blur: 20,
    brightness: 1.0,
    borderOpacity: 0.11,
    borderWidth: 1,
    shadowIntensity: 0.45,
    saturation: 190,
  },
  orb: {
    shape: 'pill',
    size: 40,
    opacity: 0.95,
    blur: 12,
    glowIntensity: 0.85,
    borderWidth: 1,
    gradientStyle: 'linear',
    animation: true,
  },
  button: {
    shape: 'rounded',
    height: 44,
    radius: 14,
    shadow: true,
    border: true,
    gradient: true,
    hoverEffect: true,
  },
  card: {
    style: 'glass',
    radius: 20,
    opacity: 0.74,
    border: true,
    shadow: true,
    blur: 18,
    padding: 24,
  },
  sidebar: {
    style: 'glass-sidebar',
    width: 260,
    radius: 28,
    opacity: 0.74,
    blur: 20,
    border: true,
    shadow: true,
  },
  navigation: {
    style: 'orb',
    activeStyle: 'orb',
    itemHeight: 46,
    itemRadius: 18,
  },
  background: {
    style: 'ambient-glow',
    brightness: 1.0,
    opacity: 0.65,
    glowIntensity: 0.7,
    glowSize: 1.0,
  },
  typography: {
    textScale: 1.0,
    headingScale: 1.0,
    lineHeight: 1.5,
    letterSpacing: 0,
    fontWeight: 'medium',
  },
  density: 'comfortable',
  animationSpeed: 'normal',
  animationIntensity: 'smooth',
}

const APPEARANCE_STORAGE_KEY = 'edupulse_appearance_config'

export function loadAppearanceConfig(): AppearanceConfig {
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY)
    if (!raw) return defaultAppearanceConfig
    const parsed = JSON.parse(raw)
    return {
      ...defaultAppearanceConfig,
      ...parsed,
      palette: { ...defaultAppearanceConfig.palette, ...parsed.palette },
      glass: { ...defaultAppearanceConfig.glass, ...parsed.glass },
      orb: { ...defaultAppearanceConfig.orb, ...parsed.orb },
      button: { ...defaultAppearanceConfig.button, ...parsed.button },
      card: { ...defaultAppearanceConfig.card, ...parsed.card },
      sidebar: { ...defaultAppearanceConfig.sidebar, ...parsed.sidebar },
      navigation: { ...defaultAppearanceConfig.navigation, ...parsed.navigation },
      background: { ...defaultAppearanceConfig.background, ...parsed.background },
      typography: { ...defaultAppearanceConfig.typography, ...parsed.typography },
    }
  } catch (e) {
    console.warn('Failed to load appearance config, using default:', e)
    return defaultAppearanceConfig
  }
}

export function saveAppearanceConfig(config: AppearanceConfig): void {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.warn('Failed to save appearance config to localStorage:', e)
  }
}

/**
 * Apply the appearance configuration to the DOM by setting CSS variables
 * directly on document.documentElement.style and appropriate dataset attributes.
 */
export function applyAppearanceToDOM(config: AppearanceConfig): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const s = root.style
  const p = config.palette
  const g = config.glass
  const o = config.orb
  const b = config.button
  const c = config.card
  const sb = config.sidebar
  const n = config.navigation
  const t = config.typography

  // 1. Dataset attributes
  root.dataset.theme = config.mode === 'system' ? 'dark' : config.mode
  root.dataset.preset = config.presetId
  root.dataset.density = config.density
  root.dataset.cardStyle = c.style
  root.dataset.buttonShape = b.shape
  root.dataset.orbShape = o.shape
  root.dataset.sidebarStyle = sb.style
  root.dataset.navStyle = n.style

  // 2. Primary & Accent Colors
  s.setProperty('--primary', p.primary)
  s.setProperty('--primary-glow', p.primaryGlow)
  s.setProperty('--cyan-accent', p.accent)
  s.setProperty('--purple', p.secondary)
  s.setProperty('--orb-blue', p.orbBlue)
  s.setProperty('--orb-cyan', p.orbCyan)
  s.setProperty('--orb-purple', p.orbPurple)

  // 3. Canvas & Surface
  s.setProperty('--bg', p.background)
  s.setProperty('--bg-canvas', p.background)
  s.setProperty('--surface', p.surface)
  s.setProperty('--surface-muted', p.surfaceMuted)
  s.setProperty('--surface-elevated', p.surface)
  s.setProperty('--text', p.text)
  s.setProperty('--text-muted', p.textSecondary)
  s.setProperty('--line', p.border)

  // 4. Glassmorphism
  s.setProperty('--glass-blur', `${g.blur}px`)
  s.setProperty('--glass-opacity', `${g.opacity}`)
  s.setProperty('--glass-saturation', `${g.saturation}%`)
  s.setProperty('--glass-border-width', `${g.borderWidth}px`)

  // Construct glass background color dynamically
  const glassBgColor = p.glass.startsWith('rgba')
    ? p.glass
    : `rgba(16, 24, 39, ${g.opacity})`
  s.setProperty('--glass-bg', glassBgColor)
  s.setProperty('--glass-sidebar-bg', glassBgColor)
  s.setProperty('--glass-sidebar-border', `rgba(255, 255, 255, ${g.borderOpacity})`)

  // 5. Glass Orb Active Gradient
  const orbGradient = `linear-gradient(135deg, ${p.orbBlue}52 0%, ${p.orbPurple}30 100%)`
  s.setProperty('--glass-orb-gradient', orbGradient)
  s.setProperty('--glass-orb-glow', `radial-gradient(circle, ${p.orbCyan}73 0%, ${p.orbBlue}26 60%, transparent 80%)`)

  // 6. Ambient Orbs dynamically matching theme
  s.setProperty('--ambient-orb-1', `radial-gradient(circle, ${p.primary}73 0%, ${p.primary}0d 70%, transparent 100%)`)
  s.setProperty('--ambient-orb-2', `radial-gradient(circle, ${p.secondary}66 0%, ${p.secondary}0d 70%, transparent 100%)`)
  s.setProperty('--ambient-orb-3', `radial-gradient(circle, ${p.accent}47 0%, ${p.accent}0a 70%, transparent 100%)`)
  s.setProperty('--ambient-orb-4', `radial-gradient(circle, ${p.primary}59 0%, ${p.primary}0a 70%, transparent 100%)`)

  // 7. Component Radii
  s.setProperty('--card-radius', `${c.radius}px`)
  s.setProperty('--button-radius', `${b.radius}px`)
  s.setProperty('--sidebar-radius', `${sb.radius}px`)
  s.setProperty('--sidebar-width', `${sb.width}px`)
  s.setProperty('--nav-item-radius', `${n.itemRadius}px`)

  // 8. Typography Scale
  s.setProperty('--font-scale', `${t.textScale}`)
  s.setProperty('--heading-scale', `${t.headingScale}`)

  // 9. Motion Duration Override
  const speedMultiplier = config.animationSpeed === 'fast' ? 0.6 : config.animationSpeed === 'slow' ? 1.6 : 1.0
  s.setProperty('--transition-fast', `${Math.round(150 * speedMultiplier)}ms cubic-bezier(0.4, 0, 0.2, 1)`)
  s.setProperty('--transition-normal', `${Math.round(220 * speedMultiplier)}ms cubic-bezier(0.4, 0, 0.2, 1)`)
  s.setProperty('--transition-smooth', `${Math.round(300 * speedMultiplier)}ms cubic-bezier(0.16, 1, 0.3, 1)`)
}
