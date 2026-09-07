# EduPulse — Campus Connect

EduPulse is a responsive campus communication and academic management frontend for students, teachers, and principal/admin users. This repository delivers **Phase 1 only**: a polished React web application with local development data and Firebase-ready service boundaries.

## Technology

- React 19 + TypeScript
- Vite
- React Router
- Lucide icons
- Modern, responsive CSS with light, dark, and eye comfort modes

## Start locally

```bash
npm install
npm run dev
```

Open the address printed by Vite (normally `http://localhost:5173`).

## Build the web application

```bash
npm run build
```

The production bundle is written to `dist/`.

## Phase 1 development access

The login screen includes a clearly-labelled temporary role selector for Student, Teacher, and Principal / Admin workspaces. Enter any valid email address and non-empty password, choose a role, then sign in.

This selector is **not authentication or authorization**. It exists only to develop and test every dashboard before Phase 2. Firebase Authentication plus the Firestore user profile role will replace it.

## Project structure

```text
src/
  app/                 App routes and shared application state
  components/          Shared UI, layout, and feedback components
  constants/           Navigation and role configuration
  features/            Auth, Student, Teacher, and Admin views
  services/            Local development data and repository contracts
  theme/               Design tokens and responsive global styles
  types/               Central domain types
```

## Data behaviour

Phase 1 data is seeded from `src/services/local/developmentData.ts` and saved to browser local storage, so actions remain visible during development. The UI updates when a teacher creates work, a student submits it, a doubt is answered, a class is cancelled, or an admin verifies a teacher.

File selection is intentionally metadata-only in this phase. No uploaded file is claimed to be permanently stored or sent to a server.

## Phase 2 and Phase 3

- **Phase 2:** replace the local implementations behind `src/services/repositories/contracts.ts` with Firebase Authentication, Firestore, Storage, and FCM implementations.
- **Phase 3:** package the same responsive React application with Capacitor for Android. No separate Android UI or business logic is planned.

See `docs/` for the architecture, feature inventory, responsive behaviour, and exact Firebase integration points.
