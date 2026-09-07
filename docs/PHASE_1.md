# Phase 1 scope

Phase 1 is the complete EduPulse frontend experience. It intentionally has no Firebase SDK, credentials, database, permanent file storage, or production authentication.

## Included

- Development login with field validation, password visibility control, loading feedback, Google Sign-In preparation, and a development-only role picker.
- Role-aware navigation guards for Student, Teacher, and Principal / Admin areas.
- Complete routed workspaces with dashboards, profile editing, notification UI, settings, light mode, dark mode, and eye comfort mode.
- Local state interactions: publish assignments and announcements, select files for a session, submit coursework, ask and answer doubts, cancel a class, send group messages, mark notices read, and approve/reject teacher verification.
- Realistic, non-personal development data for Bonsalo College.
- Mobile-first breakpoints, a tablet/desktop sidebar, compact mobile header, mobile bottom navigation, and card-based mobile tables.

## Intentionally deferred

- Firebase Authentication and Google provider sign-in.
- Firestore persistence, real-time listeners, and security rules.
- Firebase Storage uploads and download URLs.
- Firebase Cloud Messaging and system notifications.
- Attendance, payments, and unrelated administration modules.

## Local persistence

Browser local storage persists data during Phase 1 testing. It is a development convenience, not a production repository. Clearing browser storage restores the initial experience on the next visit.
