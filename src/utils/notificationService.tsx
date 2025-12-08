import { toast } from 'sonner';

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
}

export interface OrderNotification {
  orderId: string;
  customerName: string;
  customerEmail?: string;
  orderDetails: string;
  pickupLocation: string;
  queueNumber: string;
}

/**
 * Send notification when order is ready for pickup
 * @param notification Order notification details
 * @param preferences Customer notification preferences
 * @returns Promise<boolean> Success status
 */
export async function notifyOrderReady(
  notification: OrderNotification,
  preferences: NotificationPreferences = { inApp: true, email: false }
): Promise<boolean> {
  try {
    // In-app notification
    if (preferences.inApp) {
      sendInAppNotification(notification);
    }

    // Email notification (simulated)
    if (preferences.email && notification.customerEmail) {
      await sendEmailNotification(notification);
    }

    // Log notification for analytics
    logNotification(notification, 'success');
    
    return true;
  } catch (error) {
    console.error('Notification failed:', error);
    logNotification(notification, 'failed');
    return false;
  }
}

/**
 * Send in-app notification
 */
function sendInAppNotification(notification: OrderNotification) {
  toast.success(
    `🎉 Order ${notification.orderId} is Ready!`,
    {
      description: `Your order at ${notification.pickupLocation} is ready for pickup. Queue #${notification.queueNumber}`,
      duration: 8000,
    }
  );
}

/**
 * Simulate email notification
 */
async function sendEmailNotification(notification: OrderNotification): Promise<void> {
  // Simulate API call to email service
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate 95% success rate
      if (Math.random() > 0.05) {
        console.log('Email sent to:', notification.customerEmail);
        resolve();
      } else {
        reject(new Error('Email service unavailable'));
      }
    }, 500);
  });
}

/**
 * Log notification attempt
 */
function logNotification(
  notification: OrderNotification,
  status: 'success' | 'failed' | 'pending'
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    orderId: notification.orderId,
    status,
    type: 'order_ready',
  };
  
  console.log('Notification log:', logEntry);
  // In a real app, this would be sent to analytics/logging service
}

/**
 * Retry failed notification after delay
 */
export async function retryNotification(
  notification: OrderNotification,
  preferences: NotificationPreferences,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<boolean> {
  if (retryCount >= maxRetries) {
    console.error('Max retries reached for notification');
    return false;
  }

  // Wait 2 minutes before retry
  await new Promise(resolve => setTimeout(resolve, 120000));

  const success = await notifyOrderReady(notification, preferences);
  
  if (!success) {
    return retryNotification(notification, preferences, retryCount + 1, maxRetries);
  }

  return true;
}

/**
 * Send order status update notification
 */
export function notifyOrderStatusUpdate(
  orderId: string,
  oldStatus: string,
  newStatus: string
) {
  const statusMessages: Record<string, string> = {
    'Pending': '⏳ Order received and queued',
    'Cooking': '👨‍🍳 Your order is being prepared',
    'Ready for Pickup': '✅ Order ready for pickup!',
    'Completed': '🎉 Order completed',
  };

  const message = statusMessages[newStatus] || 'Order status updated';

  toast.info(message, {
    description: `Order ${orderId} status: ${newStatus}`,
    duration: 4000,
  });
}

/**
 * Check if notification preferences are enabled
 */
export function checkNotificationPreferences(userId: string): NotificationPreferences {
  // In a real app, this would fetch from user settings
  // For now, return default preferences
  return {
    inApp: true,
    email: false, // Email disabled by default for demo
  };
}