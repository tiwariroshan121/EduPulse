// Firebase Cloud Messaging Service Worker for EduPulse
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: 'AIzaSyEduPulseDummyKeyForServiceWorker',
  projectId: 'edupulse-campus',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef',
}

try {
  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload)
    const notificationTitle = payload.notification ? payload.notification.title : 'EduPulse Campus Alert'
    const notificationOptions = {
      body: payload.notification ? payload.notification.body : 'New update in EduPulse.',
      icon: '/favicon.ico',
      data: payload.data || {},
    }

    self.registration.showNotification(notificationTitle, notificationOptions)
  })
} catch (err) {
  console.log('[firebase-messaging-sw.js] Running in offline or local mode:', err)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
