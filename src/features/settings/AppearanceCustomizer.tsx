import { memo, useState } from 'react'
import {
  Sparkles,
  Sliders,
  RotateCcw,
  Check,
  Palette,
  Eye,
  Layers,
  Circle,
  Square,
  Minimize2,
  Sun,
  Moon,
  Monitor,
  Zap,
} from 'lucide-react'
import { useApp } from '../../app/AppProvider'
import { themePresets } from '../../theme/themePresets'
import type {
  OrbShape,
  ButtonShape,
  CardStyle,
  DensityMode,
  AnimationSpeed,
  AnimationIntensity,
} from '../../theme/appearanceConfig'
import { Modal } from '../../components/common/UI'

export const AppearanceCustomizer = memo(function AppearanceCustomizer() {
  const { appearance, updateAppearance, setAppearancePreset, resetAppearance, notify } = useApp()
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'presets' | 'colors' | 'glass' | 'components' | 'motion'>('presets')

  const handlePresetSelect = (presetId: string) => {
    setAppearancePreset(presetId)
  }

  const handleColorChange = (key: keyof typeof appearance.palette, value: string) => {
    updateAppearance({
      presetId: 'custom',
      palette: {
        ...appearance.palette,
        [key]: value,
        // Auto-derive primary glow if changing primary
        ...(key === 'primary' ? { primaryGlow: `${value}59`, orbBlue: value } : {}),
        ...(key === 'accent' ? { activeOrb: value, orbCyan: value } : {}),
      },
    })
  }

  const handleResetConfirm = () => {
    resetAppearance()
    setResetModalOpen(false)
  }

  return (
    <div className="appearance-customizer">
      {/* 1. Header & Live Preview Dock */}
      <div className="customizer-layout">
        <div className="customizer-controls-column">
          {/* Customizer Sub-Nav Tabs */}
          <div className="customizer-tabs" role="tablist">
            <button
              type="button"
              className={`customizer-tab ${activeTab === 'presets' ? 'customizer-tab--active' : ''}`}
              onClick={() => setActiveTab('presets')}
            >
              <Palette size={16} /> <span>Theme Presets</span>
            </button>
            <button
              type="button"
              className={`customizer-tab ${activeTab === 'colors' ? 'customizer-tab--active' : ''}`}
              onClick={() => setActiveTab('colors')}
            >
              <Sparkles size={16} /> <span>Custom Colors</span>
            </button>
            <button
              type="button"
              className={`customizer-tab ${activeTab === 'glass' ? 'customizer-tab--active' : ''}`}
              onClick={() => setActiveTab('glass')}
            >
              <Layers size={16} /> <span>Glass & Orbs</span>
            </button>
            <button
              type="button"
              className={`customizer-tab ${activeTab === 'components' ? 'customizer-tab--active' : ''}`}
              onClick={() => setActiveTab('components')}
            >
              <Sliders size={16} /> <span>Components & UI</span>
            </button>
            <button
              type="button"
              className={`customizer-tab ${activeTab === 'motion' ? 'customizer-tab--active' : ''}`}
              onClick={() => setActiveTab('motion')}
            >
              <Zap size={16} /> <span>Motion & Type</span>
            </button>
          </div>

          {/* TAB 1: THEME PRESETS */}
          {activeTab === 'presets' && (
            <div className="customizer-section-panel">
              <div className="section-title-group">
                <h3>Ready-Made Visual Themes</h3>
                <p>Curated design systems with harmonized color palettes, glass surfaces, and glowing orbs.</p>
              </div>

              {/* Mode Switcher */}
              <div className="mode-segmented-control">
                <span className="control-label">Appearance Mode:</span>
                <div className="segmented-button-group">
                  <button
                    type="button"
                    className={`segment-btn ${appearance.mode === 'dark' ? 'segment-btn--active' : ''}`}
                    onClick={() => updateAppearance({ mode: 'dark' })}
                  >
                    <Moon size={14} /> <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${appearance.mode === 'light' ? 'segment-btn--active' : ''}`}
                    onClick={() => updateAppearance({ mode: 'light' })}
                  >
                    <Sun size={14} /> <span>Light</span>
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${appearance.mode === 'system' ? 'segment-btn--active' : ''}`}
                    onClick={() => updateAppearance({ mode: 'system' })}
                  >
                    <Monitor size={14} /> <span>System</span>
                  </button>
                </div>
              </div>

              {/* Presets Grid */}
              <div className="presets-cards-grid">
                {themePresets.map((preset) => {
                  const isSelected = appearance.presetId === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`preset-card ${isSelected ? 'preset-card--active' : ''}`}
                      onClick={() => handlePresetSelect(preset.id)}
                    >
                      <div className="preset-card-top">
                        <div className="preset-swatches">
                          <span className="swatch-circle" style={{ background: preset.swatch.primary }} />
                          <span className="swatch-circle" style={{ background: preset.swatch.secondary }} />
                          <span className="swatch-circle" style={{ background: preset.swatch.accent }} />
                          <span className="swatch-circle" style={{ background: preset.swatch.surface }} />
                        </div>
                        {isSelected && (
                          <span className="preset-active-check">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <strong className="preset-card-name">{preset.name}</strong>
                      <span className="preset-card-subtitle">{preset.subtitle}</span>
                      <p className="preset-card-desc">{preset.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM COLOR PALETTE */}
          {activeTab === 'colors' && (
            <div className="customizer-section-panel">
              <div className="section-title-group">
                <h3>Custom Color Palette</h3>
                <p>Fine-tune individual hex colors or use color pickers to craft your own unique institutional palette.</p>
              </div>

              <div className="color-pickers-grid">
                <div className="color-field-row">
                  <label htmlFor="color-primary">
                    <span className="color-field-label">Primary Color</span>
                    <small>Main brand actions, active highlights & buttons</small>
                  </label>
                  <div className="color-input-combo">
                    <input
                      id="color-primary"
                      type="color"
                      value={appearance.palette.primary}
                      onChange={(e) => handleColorChange('primary', e.target.value)}
                    />
                    <input
                      type="text"
                      className="color-hex-text"
                      value={appearance.palette.primary}
                      onChange={(e) => handleColorChange('primary', e.target.value)}
                    />
                  </div>
                </div>

                <div className="color-field-row">
                  <label htmlFor="color-accent">
                    <span className="color-field-label">Accent / Cyan Luminous</span>
                    <small>Glowing orb indicators, badges & focus rings</small>
                  </label>
                  <div className="color-input-combo">
                    <input
                      id="color-accent"
                      type="color"
                      value={appearance.palette.accent}
                      onChange={(e) => handleColorChange('accent', e.target.value)}
                    />
                    <input
                      type="text"
                      className="color-hex-text"
                      value={appearance.palette.accent}
                      onChange={(e) => handleColorChange('accent', e.target.value)}
                    />
                  </div>
                </div>

                <div className="color-field-row">
                  <label htmlFor="color-secondary">
                    <span className="color-field-label">Secondary / Gradient Core</span>
                    <small>Multi-stop gradients and atmospheric orbs</small>
                  </label>
                  <div className="color-input-combo">
                    <input
                      id="color-secondary"
                      type="color"
                      value={appearance.palette.secondary}
                      onChange={(e) => handleColorChange('secondary', e.target.value)}
                    />
                    <input
                      type="text"
                      className="color-hex-text"
                      value={appearance.palette.secondary}
                      onChange={(e) => handleColorChange('secondary', e.target.value)}
                    />
                  </div>
                </div>

                <div className="color-field-row">
                  <label htmlFor="color-bg">
                    <span className="color-field-label">Background Canvas</span>
                    <small>Overall app canvas base color</small>
                  </label>
                  <div className="color-input-combo">
                    <input
                      id="color-bg"
                      type="color"
                      value={appearance.palette.background}
                      onChange={(e) => handleColorChange('background', e.target.value)}
                    />
                    <input
                      type="text"
                      className="color-hex-text"
                      value={appearance.palette.background}
                      onChange={(e) => handleColorChange('background', e.target.value)}
                    />
                  </div>
                </div>

                <div className="color-field-row">
                  <label htmlFor="color-surface">
                    <span className="color-field-label">Surface / Card Acrylic</span>
                    <small>Containers, cards, dialogs, and topbar base</small>
                  </label>
                  <div className="color-input-combo">
                    <input
                      id="color-surface"
                      type="color"
                      value={appearance.palette.surface}
                      onChange={(e) => handleColorChange('surface', e.target.value)}
                    />
                    <input
                      type="text"
                      className="color-hex-text"
                      value={appearance.palette.surface}
                      onChange={(e) => handleColorChange('surface', e.target.value)}
                    />
                  </div>
                </div>

                <div className="color-field-row">
                  <label htmlFor="color-orb">
                    <span className="color-field-label">Glass Orb Active Glow</span>
                    <small>Navigation glowing indicator dot color</small>
                  </label>
                  <div className="color-input-combo">
                    <input
                      id="color-orb"
                      type="color"
                      value={appearance.palette.orbCyan}
                      onChange={(e) => handleColorChange('orbCyan', e.target.value)}
                    />
                    <input
                      type="text"
                      className="color-hex-text"
                      value={appearance.palette.orbCyan}
                      onChange={(e) => handleColorChange('orbCyan', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GLASSMORPHISM & GLASS ORBS */}
          {activeTab === 'glass' && (
            <div className="customizer-section-panel">
              <div className="section-title-group">
                <h3>Glassmorphism & Glass Orb Physics</h3>
                <p>Adjust the frosted glass surface opacity, blur intensity, saturation, and active Glass Orb geometry.</p>
              </div>

              <div className="sliders-stack">
                <div className="slider-row">
                  <div className="slider-header">
                    <span>Glass Opacity</span>
                    <strong>{Math.round(appearance.glass.opacity * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0.45"
                    max="0.85"
                    step="0.01"
                    value={appearance.glass.opacity}
                    onChange={(e) =>
                      updateAppearance({
                        glass: { ...appearance.glass, opacity: parseFloat(e.target.value) },
                      })
                    }
                  />
                  <div className="slider-ticks">
                    <span>Translucent (45%)</span>
                    <span>Standard (74%)</span>
                    <span>Solid Acrylic (85%)</span>
                  </div>
                </div>

                <div className="slider-row">
                  <div className="slider-header">
                    <span>Backdrop Blur Intensity</span>
                    <strong>{appearance.glass.blur}px</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={appearance.glass.blur}
                    onChange={(e) =>
                      updateAppearance({
                        glass: { ...appearance.glass, blur: parseInt(e.target.value) },
                      })
                    }
                  />
                  <div className="slider-ticks">
                    <span>Sharp (0px)</span>
                    <span>Optimal (20px)</span>
                    <span>Heavy Frost (30px)</span>
                  </div>
                </div>

                <div className="slider-row">
                  <div className="slider-header">
                    <span>Glass Color Saturation</span>
                    <strong>{appearance.glass.saturation}%</strong>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="220"
                    step="5"
                    value={appearance.glass.saturation}
                    onChange={(e) =>
                      updateAppearance({
                        glass: { ...appearance.glass, saturation: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>

                <div className="slider-row">
                  <div className="slider-header">
                    <span>Glass Border Width</span>
                    <strong>{appearance.glass.borderWidth}px</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.5"
                    value={appearance.glass.borderWidth}
                    onChange={(e) =>
                      updateAppearance({
                        glass: { ...appearance.glass, borderWidth: parseFloat(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              {/* Glass Orb Shapes */}
              <div className="sub-settings-block">
                <h4>Glass Orb Indicator Shape</h4>
                <div className="shape-picker-row">
                  {[
                    { id: 'pill', label: 'Pill Shape', icon: <Minimize2 size={16} /> },
                    { id: 'circle', label: 'Circle Orb', icon: <Circle size={16} /> },
                    { id: 'soft-circle', label: 'Soft Circle', icon: <Circle size={16} /> },
                    { id: 'capsule', label: 'Rounded Capsule', icon: <Square size={16} /> },
                    { id: 'liquid', label: 'Liquid Orb', icon: <Sparkles size={16} /> },
                  ].map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      className={`shape-pill ${appearance.orb.shape === shape.id ? 'shape-pill--active' : ''}`}
                      onClick={() =>
                        updateAppearance({
                          orb: { ...appearance.orb, shape: shape.id as OrbShape },
                        })
                      }
                    >
                      {shape.icon}
                      <span>{shape.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMPONENTS & DENSITY */}
          {activeTab === 'components' && (
            <div className="customizer-section-panel">
              <div className="section-title-group">
                <h3>Component Shapes & UI Density</h3>
                <p>Customize card elevation, button corners, sidebar width, and global spacing density.</p>
              </div>

              {/* Button Shape */}
              <div className="sub-settings-block">
                <h4>Button Shape Preset</h4>
                <div className="shape-picker-row">
                  {[
                    { id: 'rounded', label: 'Rounded' },
                    { id: 'pill', label: 'Pill' },
                    { id: 'sharp', label: 'Sharp' },
                    { id: 'capsule', label: 'Soft Capsule' },
                    { id: 'glass', label: 'Frosted Glass' },
                    { id: 'floating', label: 'Floating Glow' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`shape-pill ${appearance.button.shape === b.id ? 'shape-pill--active' : ''}`}
                      onClick={() =>
                        updateAppearance({
                          button: { ...appearance.button, shape: b.id as ButtonShape },
                        })
                      }
                    >
                      <span>{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Style */}
              <div className="sub-settings-block">
                <h4>Card & Container Style</h4>
                <div className="shape-picker-row">
                  {[
                    { id: 'glass', label: 'Frosted Glass' },
                    { id: 'flat', label: 'Flat Modern' },
                    { id: 'soft', label: 'Soft Border' },
                    { id: 'floating', label: 'Floating Elevation' },
                    { id: 'minimal', label: 'Minimalist Wire' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`shape-pill ${appearance.card.style === c.id ? 'shape-pill--active' : ''}`}
                      onClick={() =>
                        updateAppearance({
                          card: { ...appearance.card, style: c.id as CardStyle },
                        })
                      }
                    >
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* UI Density */}
              <div className="sub-settings-block">
                <h4>UI Spacing Density</h4>
                <div className="shape-picker-row">
                  {[
                    { id: 'compact', label: 'Compact', desc: 'More content per screen' },
                    { id: 'comfortable', label: 'Comfortable', desc: 'Standard balanced spacing' },
                    { id: 'spacious', label: 'Spacious', desc: 'Generous breathable padding' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`shape-pill ${appearance.density === d.id ? 'shape-pill--active' : ''}`}
                      onClick={() => updateAppearance({ density: d.id as DensityMode })}
                    >
                      <span>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Width */}
              <div className="slider-row">
                <div className="slider-header">
                  <span>Sidebar Width (Desktop)</span>
                  <strong>{appearance.sidebar.width}px</strong>
                </div>
                <input
                  type="range"
                  min="220"
                  max="320"
                  step="10"
                  value={appearance.sidebar.width}
                  onChange={(e) =>
                    updateAppearance({
                      sidebar: { ...appearance.sidebar, width: parseInt(e.target.value) },
                    })
                  }
                />
                <div className="slider-ticks">
                  <span>Compact (220px)</span>
                  <span>Default (260px)</span>
                  <span>Wide (320px)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MOTION & TYPOGRAPHY */}
          {activeTab === 'motion' && (
            <div className="customizer-section-panel">
              <div className="section-title-group">
                <h3>Typography Scale & Motion Physics</h3>
                <p>Adjust readability scales and animation responsiveness across all views.</p>
              </div>

              <div className="slider-row">
                <div className="slider-header">
                  <span>Font Scale Multiplier</span>
                  <strong>{Math.round(appearance.typography.textScale * 100)}%</strong>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.20"
                  step="0.05"
                  value={appearance.typography.textScale}
                  onChange={(e) =>
                    updateAppearance({
                      typography: {
                        ...appearance.typography,
                        textScale: parseFloat(e.target.value),
                        headingScale: parseFloat(e.target.value),
                      },
                    })
                  }
                />
                <div className="slider-ticks">
                  <span>Small (85%)</span>
                  <span>Normal (100%)</span>
                  <span>Large (120%)</span>
                </div>
              </div>

              <div className="sub-settings-block">
                <h4>Animation Speed</h4>
                <div className="shape-picker-row">
                  {[
                    { id: 'fast', label: 'Snappy (Fast)' },
                    { id: 'normal', label: 'Balanced (Normal)' },
                    { id: 'slow', label: 'Cinematic (Slow)' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`shape-pill ${appearance.animationSpeed === s.id ? 'shape-pill--active' : ''}`}
                      onClick={() => updateAppearance({ animationSpeed: s.id as AnimationSpeed })}
                    >
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sub-settings-block">
                <h4>Motion Intensity</h4>
                <div className="shape-picker-row">
                  {[
                    { id: 'minimal', label: 'Minimal Motion' },
                    { id: 'smooth', label: 'Smooth Ambient' },
                    { id: 'expressive', label: 'Expressive Springs' },
                  ].map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className={`shape-pill ${appearance.animationIntensity === i.id ? 'shape-pill--active' : ''}`}
                      onClick={() => updateAppearance({ animationIntensity: i.id as AnimationIntensity })}
                    >
                      <span>{i.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="customizer-action-bar">
            <button
              type="button"
              className="button button--ghost reset-btn"
              onClick={() => setResetModalOpen(true)}
            >
              <RotateCcw size={15} /> <span>Reset Appearance</span>
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => notify('Appearance saved and applied to all views.', 'success')}
            >
              <Check size={16} /> <span>Apply & Save</span>
            </button>
          </div>
        </div>

        {/* 2. LIVE PREVIEW DOCK (Real-Time Interactive Panel) */}
        <div className="customizer-preview-column">
          <div className="preview-sticky-dock">
            <div className="preview-dock-header">
              <div className="preview-dock-title">
                <Eye size={16} />
                <span>Live Identity Preview</span>
              </div>
              <span className="preview-badge">Live System</span>
            </div>

            {/* Mini Application Preview Screen */}
            <div className="live-preview-viewport">
              {/* Mini Topbar */}
              <div className="preview-mini-topbar">
                <div className="mini-brand">
                  <span className="mini-logo-orb">E</span>
                  <span>EduPulse</span>
                </div>
                <div className="mini-actions">
                  <span className="mini-icon-pill" />
                  <span className="mini-icon-pill" />
                </div>
              </div>

              {/* Main Content Showcase */}
              <div className="preview-mini-body">
                {/* Mini Sidebar Nav Items */}
                <div className="preview-mini-sidebar">
                  <div className="preview-nav-item preview-nav-item--active">
                    <span className="preview-orb-dot" />
                    <span>Dashboard</span>
                  </div>
                  <div className="preview-nav-item">
                    <span>Timetable</span>
                  </div>
                  <div className="preview-nav-item">
                    <span>Messages</span>
                  </div>
                </div>

                {/* Mini Dashboard Workspace */}
                <div className="preview-mini-content">
                  {/* Metric Card */}
                  <div className="preview-card">
                    <div className="preview-card-header">
                      <span>Attendance</span>
                      <span className="preview-status-pill">94.2%</span>
                    </div>
                    <div className="preview-progress-track">
                      <div className="preview-progress-bar" style={{ width: '94%' }} />
                    </div>
                  </div>

                  {/* Button Showcase */}
                  <div className="preview-button-row">
                    <button type="button" className="preview-btn-primary">
                      Primary
                    </button>
                    <button type="button" className="preview-btn-ghost">
                      Ghost
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="preview-dock-footer">
              <small>
                Preset: <strong>{themePresets.find((p) => p.id === appearance.presetId)?.name || 'Custom'}</strong> · Glass:{' '}
                <strong>{Math.round(appearance.glass.opacity * 100)}%</strong> · Blur: <strong>{appearance.glass.blur}px</strong>
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal open={resetModalOpen} title="Reset Appearance Settings" onClose={() => setResetModalOpen(false)}>
        <p className="modal-copy">
          Are you sure you want to reset your appearance settings to the default <strong>Ocean Glass</strong> theme?
        </p>
        <p className="modal-subcopy" style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
          This will only reset colors, glassmorphism, and component styling. None of your courses, notes, timetable, or account data will be modified.
        </p>
        <div className="modal-actions">
          <button className="button button--ghost" onClick={() => setResetModalOpen(false)}>
            Cancel
          </button>
          <button className="button button--danger" onClick={handleResetConfirm}>
            Yes, Reset Appearance
          </button>
        </div>
      </Modal>
    </div>
  )
})
