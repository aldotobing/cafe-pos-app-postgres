'use client';

/**
 * Utility to convert base64 VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const PushNotificationService = {
  /**
   * Check if push notifications are supported and permitted
   */
  async getSubscriptionStatus(): Promise<'default' | 'granted' | 'denied' | 'unsupported'> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  /**
   * Subscribe the user to push notifications
   */
  async subscribeUser(vapidPublicKey: string, userId: string, cafeId: number): Promise<boolean> {
    try {
      console.log('[PushService] Starting subscription process...');
      if (!('serviceWorker' in navigator)) {
        console.error('[PushService] SW not supported');
        return false;
      }

      console.log('[PushService] Current permission:', Notification.permission);
      if (Notification.permission !== 'granted') {
        console.log('[PushService] Requesting permission...');
        const permission = await Notification.requestPermission();
        console.log('[PushService] Permission result:', permission);
        if (permission !== 'granted') return false;
      }

      // Wait for registration with a timeout
      console.log('[PushService] Waiting for SW ready...');
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration>((_, reject) => 
          setTimeout(() => reject(new Error('Service Worker ready timeout (10s)')), 10000)
        )
      ]);
      
      console.log('[PushService] SW ready, scope:', registration.scope);
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      console.log('[PushService] Existing subscription:', !!subscription);
      
      if (!subscription) {
        console.log('[PushService] Creating new subscription...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        console.log('[PushService] New subscription created');
      }

      // Send subscription to backend
      console.log('[PushService] Sending to backend with userId:', userId);
      const response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId,
          cafeId,
        }),
      });

      console.log('[PushService] Backend response:', response.status);
      return response.ok;
    } catch (error) {
      console.error('[PushService] Subscription error:', error);
      return false;
    }
  },

  /**
   * Unsubscribe the user
   */
  async unsubscribeUser(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator)) return true;

      // Wait for registration with a timeout
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration>((_, reject) => 
          setTimeout(() => reject(new Error('Service Worker ready timeout')), 5000)
        )
      ]);

      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Notify backend first - don't let backend failure block local unsubscribe
        try {
          await fetch('/api/push-subscriptions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        } catch (e) {
          console.warn('Failed to notify backend of unsubscription:', e);
        }
        
        // Unsubscribe locally
        return await subscription.unsubscribe();
      }
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }
};
