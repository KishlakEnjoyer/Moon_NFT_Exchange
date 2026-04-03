import { useEffect, useRef } from "react";

export const useBalanceSocket = (
  userId: number | null,
  onBalanceUpdate: (balance: number) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onBalanceUpdateRef = useRef(onBalanceUpdate);

  useEffect(() => {
    onBalanceUpdateRef.current = onBalanceUpdate;
  }, [onBalanceUpdate]);

  useEffect(() => {
    if (!userId) {
      wsRef.current?.close();
      wsRef.current = null;
      if (pingRef.current) clearInterval(pingRef.current);
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      const ws = new WebSocket(
        `${process.env.REACT_APP_WS_URL}/auth/ws/${userId}`
      );
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "balance_update") {
          onBalanceUpdateRef.current(data.balance); 
        }
      };

      if (pingRef.current) clearInterval(pingRef.current);
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 30000);

      ws.onclose = () => {
        if (pingRef.current) clearInterval(pingRef.current);
        if (!cancelled) setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      cancelled = true;
      if (pingRef.current) clearInterval(pingRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [userId]);
};
