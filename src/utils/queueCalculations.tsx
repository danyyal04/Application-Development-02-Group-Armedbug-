// Queue management utilities for pickup time estimation

export interface Order {
  id: string;
  status: 'Pending' | 'Cooking' | 'Ready for Pickup' | 'Completed';
  items: { name: string; quantity: number }[];
  createdAt: Date;
  estimatedPrepTime?: number;
}

// Average preparation time per item in minutes
const AVERAGE_PREP_TIME_PER_ITEM = 5;

// Base preparation time in minutes
const BASE_PREP_TIME = 10;

// Multiplier for custom/bulk orders
const BULK_ORDER_MULTIPLIER = 1.5;
const BULK_ORDER_THRESHOLD = 5; // Orders with more than 5 items

/**
 * Calculate estimated pickup time for an order
 * @param order The order to calculate time for
 * @param currentQueueLength Number of orders currently in queue
 * @returns Estimated time in minutes
 */
export function calculateEstimatedPickupTime(
  order: Order,
  currentQueueLength: number = 0
): number {
  // Calculate total items in the order
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate base preparation time
  let prepTime = BASE_PREP_TIME + (totalItems * AVERAGE_PREP_TIME_PER_ITEM);
  
  // Apply bulk order multiplier if needed
  if (totalItems > BULK_ORDER_THRESHOLD) {
    prepTime = prepTime * BULK_ORDER_MULTIPLIER;
  }
  
  // Add queue wait time (each order in queue adds average 3 minutes)
  const queueWaitTime = currentQueueLength * 3;
  
  const totalEstimatedTime = Math.ceil(prepTime + queueWaitTime);
  
  return totalEstimatedTime;
}

/**
 * Get estimated pickup time as a formatted string
 * @param estimatedMinutes Estimated time in minutes
 * @returns Formatted time string
 */
export function formatEstimatedPickupTime(estimatedMinutes: number): string {
  if (estimatedMinutes <= 15) {
    return `Ready in approximately ${estimatedMinutes} minutes`;
  } else if (estimatedMinutes <= 60) {
    return `Ready in approximately ${estimatedMinutes} minutes`;
  } else {
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;
    return `Ready in approximately ${hours}h ${minutes}m`;
  }
}

/**
 * Calculate the current queue length from orders
 * @param orders All orders in the system
 * @returns Number of orders in queue (Pending + Cooking)
 */
export function getQueueLength(orders: Order[]): number {
  return orders.filter(
    order => order.status === 'Pending' || order.status === 'Cooking'
  ).length;
}

/**
 * Calculate average wait time across all active orders
 * @param orders All orders in the system
 * @returns Average wait time in minutes
 */
export function calculateAverageWaitTime(orders: Order[]): number {
  const activeOrders = orders.filter(
    order => order.status === 'Pending' || order.status === 'Cooking'
  );
  
  if (activeOrders.length === 0) {
    return 0;
  }
  
  const totalWaitTime = activeOrders.reduce((sum, order) => {
    return sum + (order.estimatedPrepTime || AVERAGE_PREP_TIME_PER_ITEM * 3);
  }, 0);
  
  return Math.ceil(totalWaitTime / activeOrders.length);
}

/**
 * Get order status breakdown
 * @param orders All orders
 * @returns Object with count for each status
 */
export function getOrderStatusBreakdown(orders: Order[]) {
  return {
    pending: orders.filter(o => o.status === 'Pending').length,
    cooking: orders.filter(o => o.status === 'Cooking').length,
    ready: orders.filter(o => o.status === 'Ready for Pickup').length,
    completed: orders.filter(o => o.status === 'Completed').length,
  };
}

/**
 * Check if an order is a bulk/custom order
 * @param order The order to check
 * @returns true if order is bulk/custom
 */
export function isBulkOrder(order: Order): boolean {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return totalItems > BULK_ORDER_THRESHOLD;
}

/**
 * Generate a formatted queue number
 * @param cafeteriaName Name of the cafeteria
 * @param dailyOrderCount Number of orders for the day so far
 * @returns Formatted queue number (e.g. A01, B12)
 */
export function generateQueueNumber(cafeteriaName: string, dailyOrderCount: number): string {
  // Get first letter of cafeteria name, default to 'A' if invalid
  const prefix = (cafeteriaName && cafeteriaName[0]) ? cafeteriaName[0].toUpperCase() : 'A';
  
  // Format number with leading zero (e.g. 1 -> 01, 10 -> 10)
  // We add 1 to count because this is the *new* order
  const number = (dailyOrderCount + 1).toString().padStart(2, '0');
  
  return `${prefix}${number}`;
}