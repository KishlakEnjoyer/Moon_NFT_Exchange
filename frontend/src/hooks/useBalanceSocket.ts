import { useEffect, useRef } from "react";

export const useBalanceSocket = (
  userId: number | null,
  onBalanceUpdate: (balance: number) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const onBalanceUpdateRef = useRef(onBalanceUpdate);

  useEffect(() => {
    onBalanceUpdateRef.current = onBalanceUpdate;
  }, [onBalanceUpdate]);

  useEffect(() => {
    if (!userId) {
      wsRef.current?.close();
      wsRef.current = null;
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

      ws.onclose = () => {
        if (!cancelled) setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [userId]);
};