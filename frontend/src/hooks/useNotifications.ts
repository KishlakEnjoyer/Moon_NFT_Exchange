import { useEffect, useState, useCallback } from "react";
import { appendAccessToken, authFetch } from "../services/auth";
import { API_BASE_URL, getWebSocketBaseUrl } from "../services/apiConfig";

export interface AppNotification {
  notification_id: number;
  type: string;
  description: string | null;
  entity_type: string | null;
  entity_id: number | null;
  payload?: {
    report_id?: number;
    reason?: string;
    reason_ru?: string;
    reason_en?: string;
    title?: string;
    description?: string;
    image_url?: string | null;
    moderator_id?: number;
    moderator_username?: string | null;
  } | null;
  is_read: number;
  created_at: string;
}

const NOTIFICATION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

const isRecentNotification = (notification: AppNotification) => {
  const createdAt = new Date(notification.created_at).getTime();
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt <= NOTIFICATION_PERIOD_MS;
};

export function useNotifications(userId: number | null, onGiftReceived?: () => void) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    if (!userId) return;
    authFetch(`${API_BASE_URL}/notifications/${userId}`)
      .then(r => r.json())
      .then(data => setNotifications(Array.isArray(data) ? data.filter(isRecentNotification) : []))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const wsUrl = getWebSocketBaseUrl();

    const ws = new WebSocket(appendAccessToken(`${wsUrl}/notifications/ws/${userId}`));

    ws.onmessage = (event) => {
      const notification: AppNotification = JSON.parse(event.data);
      setNotifications(prev => (
        isRecentNotification(notification)
          ? [notification, ...prev].filter(isRecentNotification)
          : prev.filter(isRecentNotification)
      ));
      if (notification.type === "gift_received" && onGiftReceived) {
        onGiftReceived();
      }
    };

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 30000);

    return () => {
      clearInterval(ping);
      ws.close();
    };
  }, [userId, onGiftReceived]);

  const markAllRead = useCallback(async () => {
    if (!userId || markingAllRead) return;

    const unreadIds = notifications
      .filter((notification) => notification.is_read === 0)
      .map((notification) => notification.notification_id);

    if (unreadIds.length === 0) return;

    const unreadIdSet = new Set(unreadIds);
    setMarkingAllRead(true);
    setNotifications(prev => prev.map(n => (
      unreadIdSet.has(n.notification_id) ? { ...n, is_read: 1 } : n
    )));

    try {
      const res = await authFetch(`${API_BASE_URL}/notifications/${userId}/read-all`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to mark notifications as read");
      }
    } catch (error) {
      setNotifications(prev => prev.map(n => (
        unreadIdSet.has(n.notification_id) ? { ...n, is_read: 0 } : n
      )));
      throw error;
    } finally {
      setMarkingAllRead(false);
    }
  }, [userId, notifications, markingAllRead]);

  const markRead = useCallback(async (notificationId: number) => {
    if (!userId) return;
    await authFetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: "POST",
    });
    setNotifications(prev => prev.map(n => (
      n.notification_id === notificationId ? { ...n, is_read: 1 } : n
    )));
  }, [userId]);

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return { notifications, unreadCount, markAllRead, markRead, markingAllRead };
}
