# Feature inventory

## Student experience

**Dashboard** gives a student a calm, prioritized view of today’s classes, next session, pending work, new resources, announcements, and quick access to the daily doubt box. It opens after choosing Student in the development login.

**Timetable** supports day selection and shows subject, teacher, room, and class status. Cancelled classes are visually explicit; on phones each timetable row becomes a readable labelled card rather than a squeezed table.

**Notices** contains official announcements with category, author, date, unread styling, a detail dialog, and mark-as-read behaviour. Notice reads are held locally now and will later be per-user Firestore state.

**Notes and materials** lists subject resources with teacher, file type, description, and date. The View action deliberately explains that Phase 1 uses metadata only; Firebase Storage will later supply authorized URLs.

**Assignments** supports searchable listings and an assignment detail view. A student can select one local file, see its name and size, remove it, and submit. The submission becomes visible in local state, but the interface never claims that a server stored it.

**Daily doubts** validates both subject and question, then immediately adds the new doubt to the student history. Answered doubts render the teacher’s response and unanswered questions remain visibly pending. Firestore will later supply cross-user updates.

**Class group** is a focused academic group conversation rather than a general social messenger. Users can send a local message, while teacher announcements and roles remain clear in the thread. Phase 2 can replace the local list with a Firestore listener.

**Profile and settings** allow local name/email edits, notification preferences, and light/dark/eye comfort appearance modes. These are browser-local Phase 1 values and map to user preferences later.

## Teacher experience

**Dashboard** prioritizes today’s teaching schedule, student count, pending reviews, open doubts, announcements, and the actions teachers need most: assignment creation, material upload, student access, announcements, and doubt replies.

**Classes and students** expose the assigned class, its member count, timetable, coursework, and material destinations. The student directory supports simple name or roll-number search and changes to cards on small screens.

**Timetable management** allows a teacher to cancel an active session after a confirmation dialog. The shared local timetable then updates, so the student and admin perspectives show the cancellation. In Phase 2 this action will also create an FCM notification event.

**Materials** validates title, description, and a selected file before adding the material to the visible local list. The upload copy explicitly marks the operation as a development simulation and identifies Firebase Storage as the future destination.

**Assignments and submissions** validate required assignment fields and a future due date. Creating an assignment updates the shared list immediately. Submission review presents current local submissions and leaves full marking/workflow persistence to Firestore.

**Doubts, announcements, and class group** let teachers answer student questions, publish category-tagged announcements, and send group messages. Every action changes front-end state rather than only showing a toast.

## Principal / Admin experience

**Dashboard** summarizes student/faculty counts, class activity, verification work, announcements, operational metrics, and shortcuts to administration views.

**Student and teacher directories** offer concise searchable records with identities, departments/classes, and verification state. The displayed development data has no real people’s private details.

**Teacher verification** provides approve and reject controls with a confirmation dialog. The result changes the request state immediately and approved teachers appear in the teacher overview.

**Timetable and announcements** provide a college-wide class-status view and a working official announcement composer. Administrators can publish category-labelled notices and see them appear immediately.

**Statistics** renders an intentionally lightweight development analytics view. In Phase 2 it becomes a Firestore-backed operational readout after metrics and permissions are defined.
