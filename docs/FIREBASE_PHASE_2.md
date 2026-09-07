# Firebase integration plan

Phase 2 should retain the route tree and role-specific UI. The change is to replace local adapters at the service boundary.

## Authentication

Create `services/firebase/firebaseClient.ts` as the only Firebase initialization point. Implement `AuthService` from `src/services/repositories/contracts.ts` with Firebase email/password login, `signOut`, password reset, and Google provider popup/redirect as appropriate for the Capacitor target.

After Firebase Auth returns a user, load `users/{uid}` from Firestore. Its role field determines the Student, Teacher, or Admin route. Remove the Phase 1 development role selector entirely.

## Firestore

Replace the local repositories for users, timetables, announcements, materials, assignments, submissions, doubts, messages, notifications, and verification requests. Keep normalized references such as `collegeId`, `classId`, `teacherId`, and `studentId` in documents so queries stay scoped.

Use snapshot listeners for timetable cancellation, announcements, messages, doubts, and notifications where immediate updates matter. Preserve empty, loading, retry, and friendly-error states as repositories become asynchronous.

## Storage

Implement file validation and upload inside a centralized storage service. Materials and assignment submissions should write metadata to Firestore only after a Firebase Storage upload succeeds. Store content type, original file name, byte size, uploader ID, ownership scope, and a storage path; request download URLs only when needed.

## FCM

Create notification events for class cancellation, assignment creation/due reminders, material publication, announcement delivery, verification decisions, and doubt responses. The UI’s notification toggle becomes the user’s messaging preference. Do not expose FCM tokens outside the service boundary.

## Security rules

Use Firebase Authentication claims or role documents backed by strict Firestore and Storage rules. Students may access their own profile/submissions and class-scoped material; teachers may manage their allocated classes; admins receive approved management permissions. Frontend role guards remain only UX protection and never replace security rules.
