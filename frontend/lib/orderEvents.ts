export const orderChannel = typeof window !== 'undefined' ? new BroadcastChannel('order-events') : null;

export function broadcastOrderUpdate(orderId: string) {
  orderChannel?.postMessage({ type: 'order-updated', orderId });
} 