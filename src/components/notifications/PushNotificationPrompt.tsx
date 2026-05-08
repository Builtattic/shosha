'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';

export function PushNotificationPrompt() {
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!user) return;

    // Check if notifications are supported and permission is not denied
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // We could prompt here, or wait for user interaction. 
        // For this requirement, we'll ask for permission if not granted/denied.
        const requestPermission = async () => {
          try {
            const supported = await isSupported();
            if (!supported) return;

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const messaging = getMessaging(app);
              const token = await getToken(messaging, {
                // VAPID key would typically be in an environment variable, using a dummy one or omitting 
                // depends on Firebase setup, but usually required for web push.
                // vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
              });

              if (token) {
                // Send token to backend
                await fetch('/api/notifications/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token })
                });
              }
            }
          } catch (error) {
            console.error('Failed to get FCM token', error);
          }
        };

        // Small delay to not overwhelm on load, or can be triggered by a button in settings.
        // For now, we do it passively on load since it's a "prompt" component.
        setTimeout(requestPermission, 3000);
      }
    }
  }, [user]);

  return null;
}
