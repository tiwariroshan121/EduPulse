import { memo } from 'react'
import './AmbientBackground.css'

export const AmbientBackground = memo(function AmbientBackground() {
  return (
    <div className="ambient-background" aria-hidden="true">
      <div className="ambient-orb ambient-orb--1" />
      <div className="ambient-orb ambient-orb--2" />
      <div className="ambient-orb ambient-orb--3" />
      <div className="ambient-orb ambient-orb--4" />
      <div className="ambient-mesh" />
    </div>
  )
})
