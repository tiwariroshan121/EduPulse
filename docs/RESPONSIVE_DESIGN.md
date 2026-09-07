# Responsive design

EduPulse uses content-width limits, fluid spacing, and explicit breakpoints rather than simply shrinking a desktop screen.

| Width | Behaviour |
| --- | --- |
| 360–640px | Compact header, bottom navigation, full-width actions, one-column cards, modal padding, and labelled table cards. |
| 641–960px | Adaptive dashboards and a slide-in navigation drawer; information remains touch-friendly. |
| 961–1180px | Persistent desktop workspace with sidebar; cards adapt from four to two columns when appropriate. |
| 1181px+ | Full sidebar, multi-column dashboards, spacious tables, and a capped content width for large displays. |

Key details: controls meet comfortable touch sizes, long tables convert to structured cards under 700px, the content container is capped at 1600px, mobile forms are full width, chat messages wrap, navigation never depends on hover, and a bottom inset is reserved for mobile navigation.

Design tokens in `src/theme/global.css` keep colors, surfaces, typography, radius, spacing, and theme variants consistent across the app.
