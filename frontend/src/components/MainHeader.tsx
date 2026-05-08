import { Header } from "antd/es/layout/layout";
import {
  Avatar, Badge, Button, Drawer, Dropdown, Flex, Grid,
  MenuProps, Modal, Popover, Typography, message, theme,
} from "antd";
import Title from "antd/es/typography/Title";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  BellOutlined,
  CheckCircleOutlined,
  ControlOutlined,
  GiftOutlined,
  GlobalOutlined,
  InboxOutlined,
  LogoutOutlined,
  MoonOutlined,
  PlusOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  SunOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import TONIcon from "./icons/TONIcon";
import ModalCart from "./ModalCart";
import { useBalanceSocket } from "../hooks/useBalanceSocket";
import { type AppNotification, useNotifications } from "../hooks/useNotifications";
import PeopleSearchModal from "./PeopleSearchModal";
import QrModal from "./QrModal";
import { BLOCKED_ACCOUNT_MESSAGE, authFetch, clearAuthSession, getAccessToken, setAuthSession } from "../services/auth";
import { useTranslation } from "react-i18next";

const { Text } = Typography;
type AuthProvider = "tg" | "vk";

interface MainHeaderProps {
  darkMode: boolean;
  onThemeChange: (checked: boolean) => void;
  onAuthSuccess?: () => void;
  onAuthFail?: () => void;
  onLogout?: () => void;
  onWarningOpenChange?: (open: boolean) => void;
}

const getStoredCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
};

const normalizeNotificationType = (value?: string | null) => (
  value || ""
).trim().toLowerCase().replace(/[\s-]+/g, "_");

const isSameCalendarDay = (first: Date, second: Date) => (
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate()
);

const getRuPlural = (count: number, one: string, few: string, many: string) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const getUnreadLabel = (count: number, isRu: boolean) => {
  if (count <= 0) return isRu ? "Все прочитано" : "All caught up";
  if (!isRu) return `${count} new`;
  return `${count} ${getRuPlural(count, "новое", "новых", "новых")}`;
};

const formatNotificationTime = (value: string, language: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  const isRu = language.startsWith("ru");
  const locale = isRu ? "ru-RU" : "en-US";
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  if (isSameCalendarDay(date, now)) {
    return `${isRu ? "Сегодня" : "Today"}, ${time}`;
  }

  if (isSameCalendarDay(date, yesterday)) {
    return `${isRu ? "Вчера" : "Yesterday"}, ${time}`;
  }

  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const humanizeNotificationType = (value: string | null | undefined, isRu: boolean) => {
  if (!value) return isRu ? "Уведомление" : "Notification";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getReportWarningReason = (item: AppNotification | null, isRu: boolean) => {
  if (!item?.payload) return "";
  return (
    (isRu ? item.payload.reason_ru : item.payload.reason_en)
    || item.payload.reason
    || item.payload.reason_ru
    || item.payload.reason_en
    || ""
  ).trim();
};

const MainHeader: React.FC<MainHeaderProps> = ({
  darkMode,
  onThemeChange,
  onAuthSuccess,
  onAuthFail,
  onLogout,
  onWarningOpenChange,
}) => {
  const { t, i18n } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const pollingRef = useRef<number | null>(null);
  const initAbortRef = useRef<AbortController | null>(null);
  const authAttemptRef = useRef(0);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [currentUser, setCurrentUser] = useState(getStoredCurrentUser);
  const [cartOpen, setCartOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeWarning, setActiveWarning] = useState<AppNotification | null>(null);
  const [dismissedWarningIds, setDismissedWarningIds] = useState<Set<number>>(() => new Set());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasPendingAuth, setHasPendingAuth] = useState(false);
  const [balance, setBalance] = useState<number>(currentUser.balance ?? 0);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [authProvider, setAuthProvider] = useState<AuthProvider>("tg");
  const [authStateValue, setAuthStateValue] = useState<string>("");
  const [authLink, setAuthLink] = useState<string>("");
  const [authInstruction, setAuthInstruction] = useState<string>("");
  const [isQrLoading, setIsQrLoading] = useState(false);

  const navigate = useNavigate();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const currentUserBlocked = currentUser.is_active === 0;
  const useNotificationsDrawer = screens.sm === false;

  const { notifications, unreadCount, markAllRead, markRead, markingAllRead } = useNotifications(
    isAuthenticated && currentUser.is_active !== 0 ? (currentUser.user_id ?? null) : null
  );

  useEffect(() => {
    if (!isAuthenticated || currentUser.is_active === 0) {
      setActiveWarning(null);
      return;
    }

    if (activeWarning) return;

    const nextWarning = notifications.find((notification) => (
      normalizeNotificationType(notification.type) === "report_warning"
      && notification.is_read === 0
      && !dismissedWarningIds.has(notification.notification_id)
    ));

    if (nextWarning) {
      setActiveWarning(nextWarning);
    }
  }, [activeWarning, currentUser.is_active, dismissedWarningIds, isAuthenticated, notifications]);

  useEffect(() => {
    onWarningOpenChange?.(Boolean(activeWarning));
  }, [activeWarning, onWarningOpenChange]);

  useEffect(() => () => {
    onWarningOpenChange?.(false);
  }, [onWarningOpenChange]);

  const clearPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const clearQrTimeout = () => {
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }
  };

  const clearPendingAuth = () => {
    localStorage.removeItem("auth_state");
    localStorage.removeItem("auth_link");
    localStorage.removeItem("auth_provider");
    localStorage.removeItem("auth_instruction");
    localStorage.removeItem("auth_deep_link");
    setHasPendingAuth(false);
    setAuthStateValue("");
    setAuthLink("");
    setAuthInstruction("");
  };

  const startAuthPolling = (state: string) => {
    clearPolling();

    pollingRef.current = window.setInterval(async () => {
      try {
        const activeState = localStorage.getItem("auth_state");

        if (activeState !== state) {
          clearPolling();
          return;
        }

        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/auth/status/${state}`
        );

        if (!res.ok) return;

        const data = await res.json();

        if (data.status === "confirmed") {
          if (!data.access_token) {
            throw new Error(t("editProfile.missingToken"));
          }

          clearPolling();
          clearQrTimeout();
          setAuthSession(data.access_token, data.user, data.token_type || "Bearer");
          setCurrentUser(data.user);
          clearPendingAuth();
          setIsAuthenticated(true);
          setQrModalOpen(false);
          window.dispatchEvent(new Event("storage"));
          if (data.user?.is_active === 0) {
            messageApi.error(BLOCKED_ACCOUNT_MESSAGE);
            window.dispatchEvent(new Event("accountBlocked"));
            onAuthFail?.();
          } else {
            onAuthSuccess?.();
          }
          return;
        }

        if (
          data.status === "expired" ||
          data.status === "failed" ||
          data.status === "declined"
        ) {
          clearPolling();
          clearQrTimeout();
          clearPendingAuth();
          setQrModalOpen(false);
          onAuthFail?.();
        }
      } catch (err) {
        clearPolling();
        console.error("Polling failed:", err);
      }
    }, 2000);
  };

  const handleQrTimeout = () => {
    console.log("QR auth timeout reached");
  };

  const restorePendingAuth = () => {
    const savedState = localStorage.getItem("auth_state");
    const savedProvider = localStorage.getItem("auth_provider");
    const savedLink = localStorage.getItem("auth_link") || localStorage.getItem("auth_deep_link") || "";
    const savedInstruction = localStorage.getItem("auth_instruction") || "";

    if (!savedState || !savedLink) {
      return false;
    }

    const provider: AuthProvider = savedProvider === "vk" ? "vk" : "tg";
    setHasPendingAuth(true);
    setAuthProvider(provider);
    setAuthStateValue(savedState);
    setAuthLink(savedLink);
    setAuthInstruction(savedInstruction);
    return true;
  };

  const startProviderAuth = async (provider: AuthProvider) => {
    try {
      setAuthProvider(provider);
      setIsConnecting(true);
      setIsQrLoading(true);
      setQrModalOpen(true);

      authAttemptRef.current += 1;
      const currentAttempt = authAttemptRef.current;

      clearPolling();
      clearQrTimeout();

      if (initAbortRef.current) initAbortRef.current.abort();

      const controller = new AbortController();
      initAbortRef.current = controller;

      clearPendingAuth();

      const endpoint = provider === "tg" ? "init_tg" : "init_vk";
      const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();

      if (currentAttempt !== authAttemptRef.current) return;

      const state = data.state;
      const link = provider === "tg" ? data.deep_link : data.bot_link;
      const instruction = provider === "vk" ? data.instruction || "" : "";

      localStorage.setItem("auth_state", state);
      localStorage.setItem("auth_provider", provider);
      localStorage.setItem("auth_link", link);
      if (instruction) {
        localStorage.setItem("auth_instruction", instruction);
      } else {
        localStorage.removeItem("auth_instruction");
      }

      setHasPendingAuth(true);
      setAuthProvider(provider);
      setAuthStateValue(state);
      setAuthLink(link);
      setAuthInstruction(instruction);
      setIsQrLoading(false);

      startAuthPolling(state);
    } catch (err) {
      setIsQrLoading(false);
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Request failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (getAccessToken()) {
      setIsAuthenticated(true);
      setCurrentUser(getStoredCurrentUser());
      void authFetch(`${process.env.REACT_APP_API_URL}/auth/me`)
        .then((res) => (res.ok ? res.json() : null))
        .then((user) => {
          if (!user) return;
          const current = getStoredCurrentUser();
          const updated = { ...current, ...user, balance: user.balance ?? current.balance ?? 0 };
          localStorage.setItem("currentUser", JSON.stringify(updated));
          setCurrentUser(updated);
          setBalance(updated.balance ?? 0);
          window.dispatchEvent(new Event("storage"));
          if (updated.is_active === 0) {
            messageApi.error(BLOCKED_ACCOUNT_MESSAGE);
            window.dispatchEvent(new Event("accountBlocked"));
          }
        })
        .catch(() => undefined);
    } else if (localStorage.getItem("isAuth") === "true" || getStoredCurrentUser().user_id) {
      clearAuthSession();
      setCurrentUser({});
    }

    const savedState = localStorage.getItem("auth_state");
    if (savedState) {
      if (restorePendingAuth()) {
        startAuthPolling(savedState);
      }
    }

    return () => {
      clearPolling();
      clearQrTimeout();
      if (initAbortRef.current) {
        initAbortRef.current.abort();
        initAbortRef.current = null;
      }
    };
  }, [messageApi]);

  useEffect(() => {
    const syncCurrentUser = () => {
      const updatedUser = getStoredCurrentUser();
      setCurrentUser(updatedUser);
      setBalance(updatedUser.balance ?? 0);
      setIsAuthenticated(Boolean(getAccessToken()));
    };
    const handleAccountBlocked = () => {
      syncCurrentUser();
      messageApi.error(BLOCKED_ACCOUNT_MESSAGE);
    };

    window.addEventListener("storage", syncCurrentUser);
    window.addEventListener("accountBlocked", handleAccountBlocked);

    return () => {
      window.removeEventListener("storage", syncCurrentUser);
      window.removeEventListener("accountBlocked", handleAccountBlocked);
    };
  }, [messageApi]);

  useBalanceSocket(
    isAuthenticated && !currentUserBlocked ? currentUser.user_id : null,
    (newBalance) => {
      setBalance(newBalance);
      const updated = { ...getStoredCurrentUser(), balance: newBalance };
      localStorage.setItem("currentUser", JSON.stringify(updated));
      setCurrentUser(updated);
      window.dispatchEvent(new Event("storage"));
    }
  );

  useEffect(() => {
    if (isAuthenticated) {
      const user = getStoredCurrentUser();
      setCurrentUser(user);
      setBalance(user.balance ?? 0);
    } else {
      setCurrentUser({});
      setBalance(0);
    }
  }, [isAuthenticated]);

  const handleHomeClick = () => navigate("/");

  const handleLogIn = async () => {
    setQrModalOpen(true);

    if (restorePendingAuth()) {
      const existingState = localStorage.getItem("auth_state");
      if (existingState && !pollingRef.current) {
        startAuthPolling(existingState);
      }
      return;
    }

    await startProviderAuth("tg");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    clearPolling();
    clearQrTimeout();
    clearPendingAuth();
    clearAuthSession();
    setCurrentUser({});
    setQrModalOpen(false);
    setAuthProvider("tg");
    window.dispatchEvent(new Event("storage"));
    onLogout?.();
  };

  const handleToggleLanguage = () => {
    void i18n.changeLanguage(i18n.language.startsWith("ru") ? "en" : "ru");
  };

  const currentRoleName = String(currentUser.role_name || currentUser.role || "").toLowerCase();
  const canOpenAdmin =
    [2, 3].includes(Number(currentUser.role_id)) ||
    ["manager", "moderator", "admin", "administrator", "менеджер", "модератор", "администратор"].includes(currentRoleName);

  const dropdownItems: MenuProps["items"] = [
    {
      key: "profile",
      label: t("header.profile"),
      icon: <UserOutlined />,
      onClick: () => navigate(`/account/${currentUser.username}`),
    },
    ...(canOpenAdmin ? [{
      key: "admin",
      label: "Админ-панель",
      icon: <ControlOutlined />,
      onClick: () => navigate("/admin"),
    }] : []),
    {
      key: "language",
      label: i18n.language.startsWith("ru") ? t("common.english") : t("common.russian"),
      icon: <GlobalOutlined />,
      onClick: handleToggleLanguage,
    },
    {
      key: "logout",
      label: t("header.logout"),
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  const balanceLabel = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(balance) ? balance : 0);

  const liquidGlassPanelStyle = {
    background: darkMode ? "var(--liquid-glass-bg-accent)" : "var(--liquid-glass-bg-light-theme)",
    backdropFilter: "blur(var(--liquid-glass-blur))",
    WebkitBackdropFilter: "blur(var(--liquid-glass-blur))",
    border: "1px solid var(--black-transparent)",
    boxShadow: "0 18px 55px rgba(0, 0, 0, 0.35)",
  } satisfies CSSProperties;

  const isRuLanguage = i18n.language.startsWith("ru");

  const getNotificationMeta = (item: AppNotification) => {
    const key = normalizeNotificationType(item.type) || normalizeNotificationType(item.description);
    const fallbackTitle = humanizeNotificationType(item.description || item.type, isRuLanguage);

    switch (key) {
      case "purchase_confirmed":
        return {
          title: isRuLanguage ? "Покупка подтверждена" : "Purchase confirmed",
          description: isRuLanguage ? "Лот оплачен и уже добавлен в вашу коллекцию." : "The lot is paid and added to your collection.",
          icon: <CheckCircleOutlined />,
          color: "var(--green-accept)",
          background: "rgba(82, 196, 26, 0.14)",
        };
      case "listing_sold":
      case "sale_completed":
        return {
          title: isRuLanguage ? "Подарок продан" : "Gift sold",
          description: isRuLanguage ? "Покупатель оплатил лот, средства начислены на баланс." : "The buyer paid for the lot, funds were added to your balance.",
          icon: <ShoppingOutlined />,
          color: "#4f7cff",
          background: "rgba(79, 124, 255, 0.14)",
        };
      case "upgrade_completed":
      case "present_upgrade_completed":
        return {
          title: isRuLanguage ? "Апгрейд завершен" : "Upgrade completed",
          description: isRuLanguage ? "Подарок улучшен и готов к продаже или коллекции." : "The gift was upgraded and is ready for sale or collection.",
          icon: <ThunderboltOutlined />,
          color: "#faad14",
          background: "rgba(250, 173, 20, 0.16)",
        };
      case "gift_received":
        return {
          title: isRuLanguage ? "Получен подарок" : "Gift received",
          description: isRuLanguage ? "Новый подарок появился в вашей коллекции." : "A new gift appeared in your collection.",
          icon: <GiftOutlined />,
          color: "var(--accent-150)",
          background: "rgba(168, 185, 255, 0.16)",
        };
      case "listing_cancelled":
        return {
          title: isRuLanguage ? "Лот снят с продажи" : "Listing cancelled",
          description: isRuLanguage ? "Подарок больше не продается на маркетплейсе." : "The gift is no longer listed on the marketplace.",
          icon: <ShoppingCartOutlined />,
          color: "var(--white-60)",
          background: "rgba(158, 158, 158, 0.14)",
        };
      case "wallet_topup":
        return {
          title: isRuLanguage ? "Баланс пополнен" : "Balance topped up",
          description: isRuLanguage ? "Токены зачислены на ваш кошелек." : "Tokens were credited to your wallet.",
          icon: <CheckCircleOutlined />,
          color: "#13c2c2",
          background: "rgba(19, 194, 194, 0.14)",
        };
      case "burn_completed":
        return {
          title: isRuLanguage ? "Подарок сожжен" : "Gift burned",
          description: isRuLanguage ? "Возврат начислен на ваш баланс." : "The refund was added to your balance.",
          icon: <ThunderboltOutlined />,
          color: "var(--red-fail)",
          background: "rgba(181, 51, 51, 0.16)",
        };
      case "report_warning": {
        const reason = getReportWarningReason(item, isRuLanguage);
        return {
          title: isRuLanguage ? "Предупреждение по жалобе" : "Report warning",
          description: reason
            ? (isRuLanguage ? `Причина: ${reason}` : `Reason: ${reason}`)
            : (isRuLanguage ? "Администрация отправила вам предупреждение." : "Moderation sent you a warning."),
          icon: <WarningOutlined />,
          color: "var(--red-fail)",
          background: "rgba(181, 51, 51, 0.18)",
        };
      }
      default:
        return {
          title: fallbackTitle,
          description: isRuLanguage ? "Новое событие в аккаунте." : "New account event.",
          icon: <BellOutlined />,
          color: "var(--white-60)",
          background: "rgba(158, 158, 158, 0.12)",
        };
    }
  };

  const getNotificationEntityLabel = (item: AppNotification) => {
    if (!item.entity_id) return null;
    const entityType = normalizeNotificationType(item.entity_type);
    if (entityType === "present") return isRuLanguage ? `Подарок #${item.entity_id}` : `Gift #${item.entity_id}`;
    if (entityType === "listing") return isRuLanguage ? `Лот #${item.entity_id}` : `Listing #${item.entity_id}`;
    return `#${item.entity_id}`;
  };

  const handleNotificationClick = (item: AppNotification) => {
    if (normalizeNotificationType(item.type) === "report_warning") {
      setActiveWarning(item);
      return;
    }

    if (item.is_read === 0) {
      void markRead(item.notification_id);
    }
  };

  const handleCloseWarning = () => {
    if (!activeWarning) return;

    const notificationId = activeWarning.notification_id;
    setDismissedWarningIds((prev) => new Set(prev).add(notificationId));
    setActiveWarning(null);
    if (activeWarning.is_read === 0) {
      void markRead(notificationId);
    }
  };

  const notificationSummary = notifications.length === 0
    ? (isRuLanguage ? "Тут пока тихо" : "Nothing here yet")
    : getUnreadLabel(unreadCount, isRuLanguage);

  const markAllReadButton = unreadCount > 0 ? (
    <Button
      type="text"
      size="small"
      loading={markingAllRead}
      disabled={markingAllRead}
      onClick={(event) => {
        event.stopPropagation();
        void markAllRead().catch(() => undefined);
      }}
    >
      {t("header.markAllAsRead")}
    </Button>
  ) : null;

  const notificationsList = notifications.length === 0 ? (
    <Flex vertical align="center" className="py-10 gap-3 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--liquid-glass-bg-secondary)]">
        <InboxOutlined className="text-2xl text-gray-400" />
      </div>
      <Flex vertical gap={2}>
        <Text strong>{t("header.noNotifications")}</Text>
        <Text className="text-xs text-gray-400">
          {isRuLanguage ? "Когда что-то произойдет, покажем это здесь." : "When something happens, it will show up here."}
        </Text>
      </Flex>
    </Flex>
  ) : (
    <div
      className="moon-mobile-scroll moon-notifications-scroll flex flex-col gap-2 overflow-y-auto pr-1"
      style={{
        maxHeight: useNotificationsDrawer ? "calc(82vh - 132px)" : "min(480px, calc(100vh - 180px))",
      }}
    >
      {notifications.map((item) => {
        const meta = getNotificationMeta(item);
        const isUnread = item.is_read === 0;
        const entityLabel = getNotificationEntityLabel(item);
        const notificationCardBg = darkMode ? "rgba(26, 26, 26, 0.78)" : "rgba(255, 255, 255, 0.78)";
        const notificationCardAccentBg = darkMode ? "rgba(26, 26, 26, 0.92)" : "rgba(255, 255, 255, 0.92)";

        return (
          <button
            key={item.notification_id}
            type="button"
            className="grid w-full grid-cols-[40px_minmax(0,1fr)_8px] items-start gap-3 rounded-[var(--size-smm)] border border-solid px-3 py-3 text-left transition hover:-translate-y-px hover:bg-[var(--liquid-glass-bg-secondary)]"
            style={{
              borderColor: isUnread ? meta.color : "var(--black-transparent)",
              background: isUnread
                ? `linear-gradient(135deg, ${meta.background}, ${notificationCardAccentBg})`
                : notificationCardBg,
              backdropFilter: "blur(var(--liquid-glass-blur))",
              WebkitBackdropFilter: "blur(var(--liquid-glass-blur))",
              boxShadow: isUnread ? "0 10px 28px rgba(0, 0, 0, 0.22)" : "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
            }}
            onClick={() => handleNotificationClick(item)}
          >
            <span
              className="grid h-10 w-10 place-items-center rounded-[var(--size-xs)] text-lg"
              style={{
                color: meta.color,
                background: meta.background,
              }}
            >
              {meta.icon}
            </span>

            <span className="min-w-0">
              <Text strong={isUnread} className="block leading-5">
                {meta.title}
              </Text>
              <Text className="block text-xs leading-5 text-gray-400">
                {meta.description}
              </Text>
              <span className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                <Text className="text-[11px] text-gray-500">
                  {formatNotificationTime(item.created_at, i18n.language)}
                </Text>
                {entityLabel && (
                  <span className="max-w-full truncate rounded-full border border-solid border-[var(--black-transparent)] px-2 py-[1px] text-[11px] text-gray-400">
                    {entityLabel}
                  </span>
                )}
              </span>
            </span>

            <span
              className={`mt-2 h-2 w-2 rounded-full ${isUnread ? "opacity-100" : "opacity-0"}`}
              style={{ background: meta.color }}
            />
          </button>
        );
      })}
    </div>
  );

  const notificationsContent = (
    <div style={{ width: "min(420px, calc(100vw - 32px))", padding: 14 }}>
      <Flex justify="space-between" align="center" className="mb-3 gap-3">
        <Flex vertical gap={0} className="min-w-0">
          <Text strong>{t("header.notifications")}</Text>
          <Text className="text-xs text-gray-400">{notificationSummary}</Text>
        </Flex>
        {markAllReadButton}
      </Flex>

      {notificationsList}
    </div>
  );

  const activeWarningReason = getReportWarningReason(activeWarning, isRuLanguage);

  return (
    <Header className="w-full h-auto py-2 sm:py-[var(--size-base)] px-3 sm:px-4 lg:px-[var(--size-4xl)] flex flex-wrap justify-between items-center gap-2 bg-transparent">
      {contextHolder}
      <div
        className="flex min-w-0 items-center gap-2 sm:gap-[var(--size-base)] cursor-pointer"
        onClick={handleHomeClick}
      >
        <svg className="h-10 w-11 shrink-0 sm:h-16 sm:w-[69px]" width="69" height="64" viewBox="0 0 69 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M30.21 17.6309C30.3356 17.7786 30.4682 17.9233 30.6084 18.0635C31.1952 18.6503 31.8542 19.1106 32.542 19.4394L29.9326 18.7402L22.4316 20.75L29.9326 22.7598L35.2021 21.3476C35.5489 21.6264 35.9354 21.8711 36.3545 22.0742L31.8643 23.2773L39.3652 25.2871L46.8672 23.2773L42.377 22.0742C42.7961 21.8712 43.1826 21.6263 43.5293 21.3476L48.7988 22.7598L56.2998 20.75L48.7988 18.7402L47.2988 19.1416C47.786 18.8505 48.2522 18.4909 48.6797 18.0635C48.7812 17.9619 48.8778 17.8566 48.9717 17.751L58.3613 20.2676L58.7324 20.3672V29.1338L58.3613 29.2334L56.8662 29.6338V44.2392C56.535 44.3148 56.2017 44.3857 55.8662 44.4512V29.9014L48.9287 31.7607L48.3662 31.9111V45.0273C48.0318 45.014 47.6984 44.9963 47.3662 44.9726V32.1787L39.8662 34.1885V43.5215C39.5308 43.4137 39.1971 43.3021 38.8662 43.1836V34.1885L31.3662 32.1787V39.3262C31.028 39.0921 30.6953 38.8502 30.3662 38.6035V31.9111L29.8037 31.7607L22.8662 29.9014V30.7148C22.3829 29.9971 21.9262 29.2588 21.499 28.5L22.4951 28.7676L29.4326 30.626V23.6611L21 21.4014V27.583C20.6429 26.8981 20.3097 26.1976 20 25.4834V20.3672L20.3701 20.2676L29.8037 17.7402L30.21 17.6309ZM30.4326 30.8935L30.9951 31.0449L38.8662 33.1533V26.1885L30.4326 23.9287V30.8935ZM39.8662 26.1885V33.1533L47.7363 31.0449L48.2988 30.8935V23.9287L39.8662 26.1885ZM49.2988 23.6611V30.626L56.2363 28.7676L57.7324 28.3662V21.4014L49.2988 23.6611ZM39.3662 13.75C42.1276 13.75 44.3662 15.5409 44.3662 17.75C44.366 19.959 42.1275 21.75 39.3662 21.75C36.6051 21.7498 34.3664 19.9589 34.3662 17.75C34.3662 15.541 36.605 13.7502 39.3662 13.75ZM39.3662 14.75C36.9375 14.7502 35.3662 16.2899 35.3662 17.75C35.3664 19.21 36.9377 20.7498 39.3662 20.75C41.795 20.75 43.366 19.2101 43.3662 17.75C43.3662 16.2898 41.7951 14.75 39.3662 14.75ZM42.3164 11.6992C44.2688 9.74701 47.1176 9.43064 48.6797 10.9922C50.2418 12.5543 49.9253 15.4038 47.9727 17.3564C47.1515 18.1775 46.1711 18.7073 45.1953 18.9316C45.2962 18.5848 45.3532 18.2244 45.3623 17.8535C46.0085 17.6398 46.6667 17.2482 47.2656 16.6494C48.9831 14.9319 49.0051 12.7317 47.9727 11.6992C46.94 10.6672 44.7407 10.6893 43.0234 12.4062C42.7152 12.7145 42.4605 13.0383 42.2578 13.3682C41.9567 13.2299 41.6394 13.1126 41.3096 13.0185C41.5723 12.553 41.9091 12.1065 42.3164 11.6992ZM30.6094 10.9922C32.1715 9.43035 35.0211 9.74679 36.9736 11.6992C37.3456 12.0712 37.6576 12.4765 37.9092 12.8984C37.5644 12.9702 37.2314 13.0675 36.9131 13.1865C36.7324 12.9198 36.5178 12.6575 36.2666 12.4062C34.5492 10.689 32.349 10.667 31.3164 11.6992C30.284 12.7317 30.3061 14.932 32.0234 16.6494C32.4507 17.0767 32.9085 17.3987 33.3701 17.626C33.3689 17.6671 33.3672 17.7086 33.3672 17.75C33.3672 18.0935 33.4091 18.4289 33.4883 18.7529C32.719 18.4746 31.9673 18.0073 31.3164 17.3564C29.3639 15.4039 29.0474 12.5543 30.6094 10.9922Z" fill="currentColor" />
          <path d="M9.56367 0.736035C11.199 -1.11188 13.9581 0.815568 13.5378 3.25104L13.4328 3.89536C12.9325 7.12666 12.8422 10.4764 13.2132 13.8823C15.4865 34.7543 34.1904 49.8251 54.9894 47.5439C58.6104 47.1468 62.0555 46.2487 65.2649 44.9271C67.5437 43.9887 70.0148 46.2764 68.5695 48.2781L67.9918 49.0565C61.9198 57.0319 52.7312 62.5952 42.0036 63.7717C21.2047 66.0526 2.50063 50.9821 0.227433 30.1101C-0.94482 19.3463 2.48294 9.14309 8.92996 1.47138L9.56367 0.736035ZM11.0376 1.22946C10.8861 1.2424 10.6912 1.30943 10.4778 1.55042C3.84267 9.05095 0.271323 19.2246 1.44235 29.9772C3.64237 50.1757 21.7432 64.7599 41.8711 62.5526C52.5871 61.3772 61.7154 55.6806 67.5801 47.5583C67.7687 47.2972 67.7923 47.0915 67.7723 46.9403C67.7497 46.7707 67.6565 46.5685 67.462 46.3787C67.0608 45.9873 66.3832 45.7932 65.7291 46.0625C62.415 47.4271 58.8579 48.3533 55.1218 48.7631C33.652 51.1177 14.345 35.5604 11.9983 14.0153C11.5901 10.2671 11.7225 6.58279 12.3336 3.04146C12.4542 2.34237 12.1176 1.72004 11.6498 1.41149C11.4232 1.26222 11.2074 1.215 11.0376 1.22946Z" fill="currentColor" />
          <path d="M7.5 14.5C8.71445 14.5 9.5 15.2699 9.5 16C9.5 16.7301 8.71445 17.5 7.5 17.5C6.28555 17.5 5.5 16.7301 5.5 16C5.5 15.2699 6.28555 14.5 7.5 14.5Z" stroke="currentColor" />
          <path d="M17.5 46.5C18.7145 46.5 19.5 47.2699 19.5 48C19.5 48.7301 18.7145 49.5 17.5 49.5C16.2855 49.5 15.5 48.7301 15.5 48C15.5 47.2699 16.2855 46.5 17.5 46.5Z" stroke="currentColor" />
          <path d="M13.5 33.5C16.3073 33.5 18.5 35.5585 18.5 38C18.5 40.4415 16.3073 42.5 13.5 42.5C10.6927 42.5 8.5 40.4415 8.5 38C8.5 35.5585 10.6927 33.5 13.5 33.5Z" stroke="currentColor" />
          <path d="M27 47.5C28.9978 47.5 30.5 48.9038 30.5 50.5C30.5 52.0962 28.9978 53.5 27 53.5C25.0022 53.5 23.5 52.0962 23.5 50.5C23.5 48.9038 25.0022 47.5 27 47.5Z" stroke="currentColor" />
          <circle cx="7" cy="28" r="3.5" stroke="currentColor" />
          <path d="M48 52.5C48.7301 52.5 49.5 53.2855 49.5 54.5C49.5 55.7145 48.7301 56.5 48 56.5C47.2699 56.5 46.5 55.7145 46.5 54.5C46.5 53.2855 47.2699 52.5 48 52.5Z" stroke="currentColor" />
          <path d="M36.5 55.5C37.5231 55.5 38.5 56.5301 38.5 58C38.5 59.4699 37.5231 60.5 36.5 60.5C35.4769 60.5 34.5 59.4699 34.5 58C34.5 56.5301 35.4769 55.5 36.5 55.5Z" stroke="currentColor" />
        </svg>

        <Title
          level={1}
          className="!m-0 !font-[var(--font-regular)] !text-[30px] sm:!text-[38px] hover:opacity-[0.65]"
          style={{ color: token.colorPrimary }}
        >
          Moon
        </Title>
      </div>

      <div className="flex min-w-0 flex-row flex-wrap items-center justify-end gap-1.5 sm:gap-5">
        <Button type="text" onClick={() => onThemeChange(!darkMode)}>
          {darkMode ? <MoonOutlined /> : <SunOutlined />}
        </Button>

        {!isAuthenticated && (
          <div className="flex items-center gap-[var(--size-base)] text-[var(--size-smm)]">
            <Button
              color="default"
              variant="outlined"
              size="large"
              onClick={handleLogIn}
              className="bg-[var(--liquid-glass-bg)] max-w-[180px]"
              loading={isConnecting}
              disabled={isConnecting}
            >
              <span className="truncate">
                {isConnecting ? t("header.connecting") : hasPendingAuth ? t("header.continueLogin") : t("header.connect")}
              </span>
              {authProvider === "vk" ? (
                <Avatar src="/icons/vk-icon-png.png" alt="VK" />

              ) : (
                <Avatar src="/icons/tg-icon-png.png" alt="TG" />
              )}
            </Button>
          </div>
        )}

        {isAuthenticated && (
          <div className="flex items-center gap-[var(--size-base)] text-[var(--size-smm)]">
            <Dropdown menu={{ items: dropdownItems }} trigger={["hover"]}>
              <Avatar
                size="large"
                src={currentUserBlocked || !currentUser.profile_pic_url ? undefined : `${process.env.REACT_APP_IMAGES_URL}/pfps/${currentUser.profile_pic_url}`}
                icon={currentUserBlocked || !currentUser.profile_pic_url ? <UserOutlined /> : undefined}
                className="border-solid border-gray-500"
              />
            </Dropdown>

            {useNotificationsDrawer ? (
              <>
                <Badge count={unreadCount} size="small">
                  <Button
                    type="text"
                    icon={<BellOutlined />}
                    className="icon-antd"
                    size="large"
                    aria-label={t("header.notifications")}
                    onClick={() => setNotificationsOpen(true)}
                  />
                </Badge>
                <Drawer
                  open={notificationsOpen}
                  onClose={() => setNotificationsOpen(false)}
                  placement="bottom"
                  height="min(82vh, 640px)"
                  title={
                    <Flex vertical gap={0} className="min-w-0">
                      <Text strong>{t("header.notifications")}</Text>
                      <Text className="text-xs text-gray-400">{notificationSummary}</Text>
                    </Flex>
                  }
                  extra={markAllReadButton}
                  styles={{
                    mask: {
                      background: "rgba(0, 0, 0, 0.35)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    },
                    section: {
                      ...liquidGlassPanelStyle,
                      borderBottom: 0,
                      borderRadius: "18px 18px 0 0",
                      overflow: "hidden",
                    },
                    body: { padding: 12, background: "transparent" },
                    header: {
                      borderBottom: "1px solid var(--black-transparent)",
                      background: "transparent",
                    },
                  }}
                >
                  {notificationsList}
                </Drawer>
              </>
            ) : (
              <Popover
                content={notificationsContent}
                trigger="click"
                placement="bottomRight"
                arrow={false}
                open={notificationsOpen}
                onOpenChange={setNotificationsOpen}
                styles={{
                  container: {
                    ...liquidGlassPanelStyle,
                    borderRadius: "var(--size-smm)",
                    padding: 0,
                    overflow: "hidden",
                  },
                }}
              >
                <Badge count={unreadCount} size="small">
                  <Button
                    type="text"
                    icon={<BellOutlined />}
                    className="icon-antd"
                    size="large"
                    aria-label={t("header.notifications")}
                  />
                </Badge>
              </Popover>
            )}

            <Button
              type="text"
              icon={<TeamOutlined />}
              className="icon-antd"
              size="large"
              onClick={() => setPeopleOpen(true)}
            />

            <Button
              type="text"
              icon={<ShoppingCartOutlined />}
              className="icon-antd"
              size="large"
              onClick={() => setCartOpen(true)}
            />

            <Button
              type="primary"
              icon={<PlusOutlined />}
              iconPlacement={"end"}
              size="large"
              title={currentUserBlocked ? "Баланс заморожен" : `${balance} TON`}
              disabled={currentUserBlocked}
              onClick={() => {
                window.open(`https://t.me/moon_exchange_bot`, "_blank", "noopener,noreferrer");
              }}
            >
              <span className="hidden sm:inline">{currentUserBlocked ? "Заморожен" : balanceLabel}</span>
              <TONIcon />
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(activeWarning)}
        title={
          <Flex align="center" gap={8}>
            <WarningOutlined style={{ color: "var(--red-fail)" }} />
            <span>{t("reportWarning.title")}</span>
          </Flex>
        }
        onCancel={handleCloseWarning}
        maskClosable={false}
        keyboard={false}
        centered
        footer={[
          <Button key="ok" type="primary" danger onClick={handleCloseWarning}>
            {t("reportWarning.ok")}
          </Button>,
        ]}
      >
        <Flex vertical gap={12} className="mt-3">
          <Text>{t("reportWarning.description")}</Text>
          <div className="rounded-lg border border-solid border-[var(--red-fail)] bg-[rgba(181,51,51,0.12)] p-3">
            <Text type="secondary" className="block text-xs">
              {t("reportWarning.reason")}
            </Text>
            <Text strong className="block break-words">
              {activeWarningReason || t("reportWarning.reasonFallback")}
            </Text>
          </div>
        </Flex>
      </Modal>

      <QrModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        provider={authProvider}
        stateValue={authStateValue}
        authLink={authLink}
        instruction={authInstruction}
        isLoading={isQrLoading}
        onTimeout={handleQrTimeout}
        onSelectProvider={(provider) => {
          if (
            hasPendingAuth &&
            provider === authProvider &&
            authStateValue &&
            authLink
          ) {
            return;
          }

          void startProviderAuth(provider);
        }}
      />

      <ModalCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onOpen={() => setCartOpen(true)}
      />

      <PeopleSearchModal
        open={peopleOpen}
        onClose={() => setPeopleOpen(false)}
        currentUserId={currentUser.user_id}
      />
    </Header>
  );
};

export default MainHeader;
