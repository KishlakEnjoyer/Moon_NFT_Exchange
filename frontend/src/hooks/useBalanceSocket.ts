import { useEffect, useRef, useCallback } from "react";
import { appendAccessToken } from "../services/auth";

export const useBalanceSocket = (
  userId: number | null,
  onBalanceUpdate: (balance: number) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const balancePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onBalanceUpdateRef = useRef(onBalanceUpdate);

  useEffect(() => {
    onBalanceUpdateRef.current = onBalanceUpdate;
  }, [onBalanceUpdate]);

  const fetchBalance = useCallback(async () => {
    if (!userId) return;
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      if (!currentUser.wallet_address) return;
      
      const res = await fetch(`${process.env.REACT_APP_API_URL}/blockchain-debug/wallet-info/${currentUser.wallet_address}`);
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.token_balance === "string") {
        onBalanceUpdateRef.current(parseFloat(data.token_balance));
      }
    } catch (err) {
      console.error("Balance polling failed:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      wsRef.current?.close();
      wsRef.current = null;
      if (pingRef.current) clearInterval(pingRef.current);
      if (balancePollRef.current) clearInterval(balancePollRef.current);
      return;
    }

    let cancelled = false;

    fetchBalance();

    if (balancePollRef.current) clearInterval(balancePollRef.current);
    balancePollRef.current = setInterval(fetchBalance, 10000);

    const connect = () => {
      if (cancelled) return;

      const ws = new WebSocket(
        appendAccessToken(`${process.env.REACT_APP_WS_URL}/auth/ws/${userId}`)
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
      if (balancePollRef.current) clearInterval(balancePollRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [userId, fetchBalance]);
};
