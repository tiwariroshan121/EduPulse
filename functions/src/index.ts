import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

const db = admin.firestore()
const messaging = admin.messaging()

// Helper to send notification to user
async function sendNotificationToUser(userId: string, title: string, body: string, data: Record<string, string> = {}) {
  const tokensSnapshot = await db.collection('deviceTokens').where('uid', '==', userId).get()
  const tokens = tokensSnapshot.docs.map((doc) => doc.data().token).filter(Boolean)

  if (tokens.length === 0) return

  const message = {
    tokens,
    notification: { title, body },
    data,
    webpush: {
      fcmOptions: { link: data.url || '/' },
    },
  }

  try {
    await messaging.sendEachForMulticast(message)
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

// Helper to create notification record
async function createNotificationRecord(recipientId: string, collegeId: string, type: string, title: string, body: string, relatedId?: string) {
  await db.collection('notifications').add({
    recipientId,
    collegeId,
    type,
    title,
    body,
    relatedId: relatedId || null,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

// Trigger: Class cancelled
export const onClassCancelled = functions.firestore
  .document('timetable/{entryId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()

    if (before.status === 'Scheduled' && after.status === 'Cancelled') {
      const classDoc = await db.collection('classes').doc(after.classId).get()
      if (!classDoc.exists) return

      const classData = classDoc.data()!
      const studentIds = classData.studentIds || []

      // Send to all students in the class
      for (const studentId of studentIds) {
        await createNotificationRecord(
          studentId,
          after.collegeId,
          'class_cancelled',
          'Class Cancelled',
          `${after.subject} at ${after.startTime} has been cancelled.`,
          context.params.entryId
        )
        await sendNotificationToUser(studentId, 'Class Cancelled', `${after.subject} at ${after.startTime} has been cancelled.`, { url: '/student/timetable' })
      }

      // Notify teacher
      if (after.teacherId) {
        await createNotificationRecord(
          after.teacherId,
          after.collegeId,
          'class_cancelled',
          'Class Cancelled',
          `Your class ${after.subject} at ${after.startTime} has been cancelled.`,
          context.params.entryId
        )
        await sendNotificationToUser(after.teacherId, 'Class Cancelled', `Your class ${after.subject} at ${after.startTime} has been cancelled.`, { url: '/teacher/timetable' })
      }
    }
  })

// Trigger: New announcement
export const onAnnouncementCreated = functions.firestore
  .document('announcements/{announcementId}')
  .onCreate(async (snap, context) => {
    const announcement = snap.data()
    const collegeId = announcement.collegeId
    const audienceType = announcement.audienceType

    let userIds: string[] = []

    if (audienceType === 'all_students' || audienceType === 'students_and_teachers') {
      const studentsSnapshot = await db.collection('users').where('collegeId', '==', collegeId).where('role', '==', 'student').where('status', '==', 'active').get()
      userIds.push(...studentsSnapshot.docs.map((doc) => doc.id))
    }

    if (audienceType === 'all_teachers' || audienceType === 'students_and_teachers') {
      const teachersSnapshot = await db.collection('users').where('collegeId', '==', collegeId).where('role', '==', 'teacher').where('status', '==', 'active').where('verificationStatus', '==', 'approved').get()
      userIds.push(...teachersSnapshot.docs.map((doc) => doc.id))
    }

    if (audienceType === 'specific_class' && announcement.classId) {
      const classDoc = await db.collection('classes').doc(announcement.classId).get()
      if (classDoc.exists) {
        const classData = classDoc.data()!
        userIds.push(...(classData.studentIds || []))
        userIds.push(...(classData.teacherIds || []))
      }
    }

    // Deduplicate
    userIds = [...new Set(userIds)]

    for (const userId of userIds) {
      await createNotificationRecord(
        userId,
        collegeId,
        'announcement',
        announcement.title,
        announcement.message,
        context.params.announcementId
      )
      await sendNotificationToUser(userId, announcement.title, announcement.message, { url: audienceType.includes('teacher') ? '/teacher/announcements' : '/student/notices' })
    }
  })

// Trigger: New material
export const onMaterialCreated = functions.firestore
  .document('materials/{materialId}')
  .onCreate(async (snap, context) => {
    const material = snap.data()
    const classDoc = await db.collection('classes').doc(material.classId).get()
    if (!classDoc.exists) return

    const classData = classDoc.data()!
    const studentIds = classData.studentIds || []

    for (const studentId of studentIds) {
      await createNotificationRecord(
        studentId,
        material.collegeId,
        'material',
        'New Material Available',
        `${material.title} was added to ${material.subject}.`,
        context.params.materialId
      )
      await sendNotificationToUser(studentId, 'New Material Available', `${material.title} was added to ${material.subject}.`, { url: '/student/notes' })
    }
  })

// Trigger: New assignment
export const onAssignmentCreated = functions.firestore
  .document('assignments/{assignmentId}')
  .onCreate(async (snap, context) => {
    const assignment = snap.data()
    const classDoc = await db.collection('classes').doc(assignment.classId).get()
    if (!classDoc.exists) return

    const classData = classDoc.data()!
    const studentIds = classData.studentIds || []

    for (const studentId of studentIds) {
      await createNotificationRecord(
        studentId,
        assignment.collegeId,
        'assignment',
        'New Assignment',
        `${assignment.title} has been assigned for ${assignment.subject}.`,
        context.params.assignmentId
      )
      await sendNotificationToUser(studentId, 'New Assignment', `${assignment.title} has been assigned for ${assignment.subject}.`, { url: '/student/assignments' })
    }
  })

// Trigger: Doubt answered
export const onDoubtAnswered = functions.firestore
  .document('doubts/{doubtId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()

    if (before.status === 'pending' && after.status === 'answered' && after.teacherResponse) {
      await createNotificationRecord(
        after.studentId,
        after.collegeId,
        'doubt_answered',
        'Doubt Answered',
        `Your doubt in ${after.subject} has been answered.`,
        context.params.doubtId
      )
      await sendNotificationToUser(after.studentId, 'Doubt Answered', `Your doubt in ${after.subject} has been answered.`, { url: '/student/doubts' })
    }
  })

// Trigger: Assignment graded
export const onAssignmentGraded = functions.firestore
  .document('submissions/{submissionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()

    if (before.status !== 'graded' && after.status === 'graded' && after.marks) {
      await createNotificationRecord(
        after.studentId,
        after.collegeId,
        'assignment_graded',
        'Assignment Graded',
        `Your submission for ${after.assignmentId} has been graded: ${after.marks}.`,
        context.params.submissionId
      )
      await sendNotificationToUser(after.studentId, 'Assignment Graded', `Your submission has been graded: ${after.marks}.`, { url: '/student/assignments' })
    }
  })

// Trigger: Teacher verification decision
export const onTeacherVerification = functions.firestore
  .document('teacherVerificationRequests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()

    if (before.status === 'pending' && (after.status === 'approved' || after.status === 'rejected')) {
      const title = after.status === 'approved' ? 'Verification Approved' : 'Verification Rejected'
      const body = after.status === 'approved'
        ? 'Your teacher verification has been approved. You can now access the teacher workspace.'
        : 'Your teacher verification has been rejected. Please contact administration for details.'

      await createNotificationRecord(
        after.uid,
        after.collegeId,
        'teacher_verification',
        title,
        body,
        context.params.requestId
      )
      await sendNotificationToUser(after.uid, title, body, { url: '/login' })
    }
  })

// Scheduled function: Assignment due reminders (runs daily at 9 AM)
export const assignmentDueReminder = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const assignmentsSnapshot = await db.collection('assignments')
      .where('status', '==', 'active')
      .where('dueDate', '<=', tomorrow.toISOString().split('T')[0])
      .where('dueDate', '>=', now.toISOString().split('T')[0])
      .get()

    for (const assignmentDoc of assignmentsSnapshot.docs) {
      const assignment = assignmentDoc.data()
      const classDoc = await db.collection('classes').doc(assignment.classId).get()
      if (!classDoc.exists) continue

      const classData = classDoc.data()!
      const studentIds = classData.studentIds || []

      for (const studentId of studentIds) {
        // Check if already submitted
        const submissionSnapshot = await db.collection('submissions')
          .where('assignmentId', '==', assignmentDoc.id)
          .where('studentId', '==', studentId)
          .limit(1)
          .get()

        if (submissionSnapshot.empty) {
          await createNotificationRecord(
            studentId,
            assignment.collegeId,
            'assignment',
            'Assignment Due Soon',
            `${assignment.title} is due tomorrow.`,
            assignmentDoc.id
          )
          await sendNotificationToUser(studentId, 'Assignment Due Soon', `${assignment.title} is due tomorrow.`, { url: '/student/assignments' })
        }
      }
    }
  })

// Cleanup: Delete orphaned storage files (run weekly)
export const cleanupOrphanedFiles = functions.pubsub
  .schedule('0 2 * * 0')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    // This would require listing all storage files and checking against Firestore references
    // Implementation depends on storage structure and is optional
    console.log('Cleanup orphaned files job started')
  })