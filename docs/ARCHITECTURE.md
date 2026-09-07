# Architecture

EduPulse keeps UI and data concerns separate so Firebase can replace only the data implementations in Phase 2.

```text
Route + Layout
       ↓
Feature page / shared component
       ↓
AppProvider action and feature state
       ↓
Repository contract
       ↓
Phase 1: local development data + browser storage
Phase 2: Firebase Auth / Firestore / Storage / FCM adapters
```

## Application layer

- `src/app/App.tsx` owns top-level route composition and role guards.
- `src/app/AppProvider.tsx` exposes user session state, theme preferences, toasts, and frontend actions. It is the only place that mutates the local data store.
- `src/constants/navigation.ts` centralizes role labels and navigation entries.

## Feature layer

`src/features/auth`, `src/features/student`, `src/features/teacher`, and `src/features/admin` own their role-specific screens. Shared cards, controls, dialogs, tables, feedback, and responsive shell remain in `src/components`.

## Data layer

`src/types/domain.ts` contains the central Role type plus reusable domain models. `src/services/local/developmentData.ts` provides only the initial development seed. `src/services/repositories/contracts.ts` defines interfaces for auth, timetable, materials, assignments, announcements, and doubts.

This prevents feature pages from being rewritten when data moves from local state to Firebase. A Firebase adapter will satisfy the same contract and `AppProvider` can adopt asynchronous loading, failure, and real-time update states.

## Capacitor compatibility

The web app uses standard browser APIs, responsive CSS, and one React codebase. Phase 3 can add Capacitor at the project boundary without duplicating routes, components, or business flows.
