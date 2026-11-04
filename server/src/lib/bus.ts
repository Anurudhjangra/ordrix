import { EventEmitter } from 'node:events';

/**
 * In-process event bus used to decouple order/notification writes from
 * real-time delivery. Socket.IO subscribes; if no subscriber exists the
 * emits are harmless no-ops and clients fall back to polling.
 */
export const bus = new EventEmitter();
bus.setMaxListeners(50);

export const EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  NOTIFICATION_CREATED: 'notification.created',
} as const;
