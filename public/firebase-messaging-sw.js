// ─────────────────────────────────────────────────────────────────────────────
// DAWW CREATIONS — Firebase Messaging Service Worker
// This file MUST be placed in your project's PUBLIC folder (public/firebase-messaging-sw.js)
// It enables background push notifications on Android and iPhone
// ─────────────────────────────────────────────────────────────────────────────

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyAOC9-BF1Mox6Oks8AP7p8MY7bNNXO6yn8",
  authDomain:        "daww-creations.firebaseapp.com",
  databaseURL:       "https://daww-creations-default-rtdb.firebaseio.com",
  projectId:         "daww-creations",
  storageBucket:     "daww-creations.firebasestorage.app",
  messagingSenderId: "383758652383",
  appId:             "1:383758652383:web:52026fa0ffbf6e5d8aaa6a",
});

const messaging = firebase.messaging();

// Handle background messages — fires when app is closed or in background
messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);

  const { title, body, icon } = payload.notification || {};

  self.registration.showNotification(title || "DAWW CREATIONS", {
    body:    body    || "You have a new notification",
    icon:    icon    || "/favicon.ico",
    badge:   "/favicon.ico",
    vibrate: [200, 100, 200],
    data:    payload.data || {},
    actions: [{ action: "open", title: "Open App" }],
  });
});

// When user taps the notification — open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
