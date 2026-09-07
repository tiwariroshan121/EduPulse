import { useState } from 'react'
import { Bell, Mail, Palette, Sliders, Shield, Zap } from 'lucide-react'
import { useApp } from '../../app/AppProvider'
import { Card, SectionHeading } from '../../components/common/UI'
import { AppearanceCustomizer } from './AppearanceCustomizer'
import './SettingsView.css'

interface ToggleItemProps {
  icon?: React.ReactNode
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleRow({ icon, title, description, checked, onChange, disabled = false }: ToggleItemProps) {
  return (
    <label className={`settings-toggle-row ${disabled ? 'settings-toggle-row--disabled' : ''}`}>
      <div className="settings-toggle-info">
        {icon && <div className="settings-toggle-icon">{icon}</div>}
        <div>
          <span className="settings-toggle-title">{title}</span>
          <p className="settings-toggle-desc">{description}</p>
        </div>
      </div>
      <div className="settings-switch-wrapper">
        <input
          type="checkbox"
          className="settings-switch-input"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="settings-switch-slider" />
      </div>
    </label>
  )
}

export function SettingsView() {
  const { settings, updateSettings } = useApp()
  const [settingsSection, setSettingsSection] = useState<'appearance' | 'system'>('appearance')

  return (
    <div className="settings-view page-stack">
      <div className="settings-view-header">
        <div>
          <h1>Preferences & System Settings</h1>
          <p>Configure appearance themes, frosted glass, colors, ambient animations, and institutional preferences.</p>
        </div>

        {/* Primary Settings Mode Selector */}
        <div className="settings-mode-nav">
          <button
            type="button"
            className={`settings-nav-btn ${settingsSection === 'appearance' ? 'settings-nav-btn--active' : ''}`}
            onClick={() => setSettingsSection('appearance')}
          >
            <Palette size={16} /> <span>Appearance & Customization</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${settingsSection === 'system' ? 'settings-nav-btn--active' : ''}`}
            onClick={() => setSettingsSection('system')}
          >
            <Sliders size={16} /> <span>Notifications & System</span>
          </button>
        </div>
      </div>

      {/* 1. APPEARANCE & CUSTOMIZATION SYSTEM */}
      {settingsSection === 'appearance' && <AppearanceCustomizer />}

      {/* 2. NOTIFICATIONS & SYSTEM PREFERENCES */}
      {settingsSection === 'system' && (
        <div className="system-settings-stack">
          {/* Notifications */}
          <Card className="settings-section-card" interactive>
            <SectionHeading
              title="Notifications & Updates"
              detail="Manage alerts for timetable changes, room shifts, announcements, and chat messages."
            />
            <div className="settings-group-stack">
              <ToggleRow
                icon={<Bell size={18} />}
                title="In-App Push Notifications"
                description="Receive banner alerts and navigation badges for timetable cancellations and exam notices."
                checked={settings.notificationsEnabled}
                onChange={(checked) => updateSettings({ notificationsEnabled: checked })}
              />
              <ToggleRow
                icon={<Mail size={18} />}
                title="Email Alerts"
                description="Send urgent campus notices and weekly timetable summaries to your registered email."
                checked={settings.emailUpdates}
                onChange={(checked) => updateSettings({ emailUpdates: checked })}
              />
            </div>
          </Card>

          {/* Performance & Accessibility */}
          <Card className="settings-section-card" interactive>
            <SectionHeading
              title="Performance & Accessibility"
              detail="Adjust hardware usage and accessibility preferences."
            />
            <div className="settings-group-stack">
              <ToggleRow
                icon={<Zap size={18} />}
                title="Performance Mode"
                description="Reduces backdrop blur radius and disables non-essential animations on battery saver."
                checked={settings.performanceMode ?? false}
                onChange={(checked) => updateSettings({ performanceMode: checked })}
              />
              <ToggleRow
                icon={<Shield size={18} />}
                title="Reduced Motion"
                description="Minimizes sliding and continuous orbital motion for maximum visual comfort."
                checked={settings.reducedMotion ?? false}
                onChange={(checked) => updateSettings({ reducedMotion: checked })}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
