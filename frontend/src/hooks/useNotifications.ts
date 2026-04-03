import { useEffect, useState, useCallback } from "react";

export interface AppNotification {
  notification_id: number;
  type: string;
  description: string | null;
  entity_type: string | null;
  entity_id: number | null;
  is_read: number;
  created_at: string;
}

export function useNotifications(userId: number | null, onGiftReceived?: () => void) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!userId) return;
    fetch(`${process.env.REACT_APP_API_URL}/notifications/${userId}`)
      .then(r => r.json())
      .then(data => setNotifications(data))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const wsUrl = process.env.REACT_APP_API_URL!
      .replace("https://", "wss://")
      .replace("http://", "ws://");

    const ws = new WebSocket(`${wsUrl}/notifications/ws/${userId}`);

    ws.onmessage = (event) => {
      const notification: AppNotification = JSON.parse(event.data);
      setNotifications(prev => [notification, ...prev]);
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
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await fetch(`${process.env.REACT_APP_API_URL}/notifications/${userId}/read-all`, {
      method: "POST",
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  }, [userId]);

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return { notifications, unreadCount, markAllRead };
}