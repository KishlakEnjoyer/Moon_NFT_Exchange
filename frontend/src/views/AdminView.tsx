import {
  Button,
  DatePicker,
  Empty,
  Flex,
  FloatButton,
  Form,
  Checkbox,
  Image,
  Input,
  InputNumber,
  Layout,
  Modal,
  Popconfirm,
  Result,
  Segmented,
  Select,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import {
  BarChartOutlined,
  CheckOutlined,
  CloseOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileSearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  TeamOutlined,
  TrophyOutlined,
  UnlockOutlined,
  UpOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Content } from "antd/es/layout/layout";
import Title from "antd/es/typography/Title";

import useDocumentTitle from "../hooks/useDocumentTitle";
import UserNameWithBadge from "../components/UserNameWithBadge";
import {
  AdminAccess,
  AdminAchievement,
  AuditLog,
  AdminReport,
  AdminRole,
  AdminSummary,
  AdminSummaryParams,
  AdminUser,
  DictionaryItem,
  DictionaryItemPayload,
  DictionaryKind,
  ModerationItem,
  ReportStatusFilter,
  AchievementPayload,
  backfillAchievements,
  createAdminRole,
  createAchievement,
  createDictionaryItem,
  decideAdminReport,
  decideModerationItem,
  deleteAdminRole,
  getAchievementRules,
  getAdminAccess,
  getAdminAchievements,
  getAuditLogs,
  getAdminReports,
  getAdminRoles,
  getAdminSummary,
  getAdminUsers,
  getDictionaryItems,
  getModerationQueue,
  getUserSanctions,
  publishCollection,
  sendAdminReportWarning,
  setAchievementActive,
  setAdminUserActive,
  setAdminUserRole,
  setDictionaryItemArchived,
  updateAdminRole,
  updateAchievement,
  updateDictionaryItem,
} from "../services/adminService";

const { Text } = Typography;
const { RangePicker } = DatePicker;

type MessageApi = ReturnType<typeof message.useMessage>[0];
type SalesRangePreset = "7" | "14" | "30" | "custom";
type DashboardSection = "overview" | "charts" | "tables";
type AccessSection = "users" | "roles";
type AnalyticsSection = "reports" | "roles" | "sales" | "collections";
type ModerationStatusFilter = "pending" | "approved" | "rejected" | "all";

const dictionaryKinds: DictionaryKind[] = ["collections", "models", "backgrounds", "symbols"];
const IMAGES_URL = process.env.REACT_APP_IMAGES_URL || "";
const ADMIN_TABLE_SCROLL_Y = 420;
const DASHBOARD_TABLE_SCROLL_Y = 320;

const getAdminTableScroll = (x?: number | string, y = ADMIN_TABLE_SCROLL_Y) => (
  x === undefined ? { y } : { x, y }
);

const dictionaryFolderByKind: Record<DictionaryKind, string> = {
  collections: "collections",
  models: "models",
  backgrounds: "bgs",
  symbols: "symbols",
};

const dictionaryDefaultExtensionByKind: Record<DictionaryKind, string> = {
  collections: "webp",
  models: "webp",
  backgrounds: "png",
  symbols: "webp",
};

const achievementImageUrl = (imageUrl: string | null | undefined) => (
  imageUrl ? `${IMAGES_URL}/achievements/${imageUrl}` : undefined
);

const hasFileExtension = (value: string) => /\.[a-z0-9]+(?:[?#].*)?$/i.test(value);
const withDefaultExtension = (value: string, extension: string) => (
  hasFileExtension(value) ? value : `${value}.${extension}`
);
const isAbsoluteAssetUrl = (value: string) => (
  /^(https?:)?\/\//i.test(value) || value.startsWith("/") || value.startsWith("data:")
);

const moderationImageUrl = (record: ModerationItem) => {
  const imageUrl = record.image_data_url;

  if (!imageUrl) return undefined;
  if (isAbsoluteAssetUrl(imageUrl)) return imageUrl;

  if (record.target_kind === "collections") {
    return `${IMAGES_URL}/collections/${withDefaultExtension(imageUrl, "webp")}`;
  }

  if (record.target_kind === "models") {
    return `${IMAGES_URL}/models/${withDefaultExtension(imageUrl, "webp")}`;
  }

  if (record.target_kind === "backgrounds") {
    return `${IMAGES_URL}/bgs/${withDefaultExtension(imageUrl, "png")}`;
  }

  if (record.target_kind === "symbols") {
    return `${IMAGES_URL}/symbols/${withDefaultExtension(imageUrl, "webp")}`;
  }

  if (record.item_type === "profile_photo") {
    return `${IMAGES_URL}/pfps/${imageUrl}`;
  }

  if (record.payload?.model_id !== undefined) {
    return `${IMAGES_URL}/models/${withDefaultExtension(imageUrl, "webp")}`;
  }

  if (record.payload?.background_id !== undefined) {
    return `${IMAGES_URL}/bgs/${withDefaultExtension(imageUrl, "png")}`;
  }

  if (record.payload?.symbol_id !== undefined) {
    return `${IMAGES_URL}/symbols/${withDefaultExtension(imageUrl, "webp")}`;
  }

  if (record.payload?.collection_id !== undefined) {
    return `${IMAGES_URL}/collections/${withDefaultExtension(imageUrl, "webp")}`;
  }

  return `${IMAGES_URL}/pfps/${imageUrl}`;
};

const dictionaryImageUrl = (kind: DictionaryKind, imageUrl: string | null | undefined) => {
  if (!imageUrl) return undefined;
  if (isAbsoluteAssetUrl(imageUrl)) return imageUrl;
  return `${IMAGES_URL}/${dictionaryFolderByKind[kind]}/${withDefaultExtension(imageUrl, dictionaryDefaultExtensionByKind[kind])}`;
};

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const statusColors: Record<string, string> = {
  pending: "blue",
  approved: "green",
  rejected: "red",
  new: "blue",
  open: "blue",
  "Awaiting review": "blue",
  "awaiting review": "blue",
};

const pendingReportStatusNames = new Set([
  "pending",
  "new",
  "open",
  "created",
  "awaiting review",
  "ожидает",
  "новая",
  "на рассмотрении",
]);

const getDefaultSalesRange = (): [Dayjs, Dayjs] => [
  dayjs().subtract(29, "day"),
  dayjs(),
];

const getAdminLocale = (language: string | undefined) => (
  language?.toLowerCase().startsWith("ru") ? "ru-RU" : "en-US"
);

const translate = (
  t: TFunction,
  key: string,
  fallback: string,
  options?: Record<string, unknown>,
) => String(t(key, { defaultValue: fallback, ...options }));

const getDictionaryLabel = (t: TFunction, kind: DictionaryKind) => (
  translate(t, `admin.dictionary.${kind}`, kind)
);

const getStatusLabel = (t: TFunction, value: string) => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  const key = normalized === "awaitingreview" ? "awaitingReview" : normalized;
  return translate(t, `admin.status.${key}`, value);
};

const getAchievementRuleLabel = (t: TFunction, ruleKey: string, fallback: string) => (
  translate(t, `admin.achievements.rules.${ruleKey}`, fallback)
);

const reportCanBeHandled = (report: AdminReport) => (
  !report.closed_at
  && (
    report.report_status_id === 1
    || pendingReportStatusNames.has(report.report_status_name.trim().toLowerCase())
  )
);

const formatTonNumber = (value: string | number, locale: string) => {
  const number = Number(value);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
};

const formatDate = (value: string | null | undefined, locale: string, emptyValue: string) => {
  if (!value) return emptyValue;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return emptyValue;

  return date.toLocaleString(locale);
};

const csvEscape = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadCsv = (filename: string, rows: Array<Array<string | number | null | undefined>>) => {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const renderSocialAdminCell = (
  t: TFunction,
  provider: "tg" | "vk",
  username: string | null,
  userId: number | null,
  visibility: number,
) => {
  const displayName = username
    ? provider === "tg" && !username.startsWith("@")
      ? `@${username}`
      : username
    : userId
    ? `ID ${userId}`
    : null;

  if (!displayName) {
    return <Tag>{t("admin.status.notConnected")}</Tag>;
  }

  return (
    <Flex vertical gap={4}>
      <Text className="whitespace-nowrap">{displayName}</Text>
      <Tag color={Number(visibility) === 1 ? "green" : "default"} className="w-fit">
        {Number(visibility) === 1 ? t("admin.status.visible") : t("admin.status.hidden")}
      </Tag>
    </Flex>
  );
};

const renderAdminUserNameWithBadge = (
  username: string | null,
  fallback: string,
  badgeId?: number | null,
  badgeImageUrl?: string | null,
  badgeTitle?: string | null,
) => (
  <UserNameWithBadge
    username={username}
    fallback={fallback}
    badgeId={badgeId}
    badgeImageUrl={badgeImageUrl}
    badgeTitle={badgeTitle}
    strong
  />
);

const PanelShell = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`moon-admin-panel min-w-0 overflow-hidden rounded-lg border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-3 sm:p-5 ${className}`.trim()}>
    {children}
  </div>
);

const VerticalBarChart = ({ data }: { data: AdminSummary["sales_by_day"] }) => {
  const { t, i18n } = useTranslation();
  const locale = getAdminLocale(i18n.language);
  const values = data.map((item) => Number(item.volume));
  const max = Math.max(1, ...values);
  const chartHeight = 132;

  return (
    <PanelShell className="h-full !p-3">
      <Title level={5} className="!mb-3">{t("admin.charts.salesByDay")}</Title>
      <div className="overflow-x-auto">
        <div
          className="grid h-44 min-w-[480px] gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(64px, 1fr))` }}
        >
          {data.map((item) => {
            const value = Number(item.volume);
            const height = Math.max(8, Math.round((value / max) * chartHeight));
            const day = new Date(item.day).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });

            return (
              <div key={item.day} className="grid grid-rows-[1fr_20px]">
                <div className="relative h-full">
                  <Text
                    className="absolute left-1/2 block -translate-x-1/2 whitespace-nowrap text-xs leading-4 tabular-nums"
                    style={{ bottom: height + 8 }}
                  >
                    {formatTonNumber(value, locale)}
                  </Text>
                  <div
                    className="absolute bottom-0 left-1/2 w-[78%] max-w-[220px] -translate-x-1/2 rounded-t-md"
                    style={{
                      height,
                      background: "linear-gradient(180deg, #22c55e 0%, #2b4acb 100%)",
                    }}
                  />
                </div>
                <Text type="secondary" className="block text-center text-xs leading-5 tabular-nums">{day}</Text>
              </div>
            );
          })}
        </div>
      </div>
    </PanelShell>
  );
};

const ComparisonVolumeChart = ({
  data,
}: {
  data: NonNullable<AdminSummary["comparison"]>["sales_by_day"];
}) => {
  const { t, i18n } = useTranslation();
  const locale = getAdminLocale(i18n.language);
  const values = data.flatMap((item) => [Number(item.volume), Number(item.previous_volume)]);
  const max = Math.max(1, ...values);
  const chartHeight = 132;

  return (
    <PanelShell className="h-full !p-3">
      <Flex justify="space-between" align="center" gap={12} wrap="wrap" className="!mb-3">
        <Title level={5} className="!mb-0">{t("admin.dashboard.compareVolumeChart")}</Title>
        <Flex gap={12} wrap="wrap">
          <Flex align="center" gap={6}>
            <span className="h-2.5 w-2.5 rounded-full bg-[#2b4acb]" />
            <Text type="secondary" className="text-xs">{t("admin.dashboard.currentPeriod")}</Text>
          </Flex>
          <Flex align="center" gap={6}>
            <span className="h-2.5 w-2.5 rounded-full bg-[#94a3b8]" />
            <Text type="secondary" className="text-xs">{t("admin.dashboard.previousPeriod")}</Text>
          </Flex>
        </Flex>
      </Flex>
      <div className="overflow-x-auto">
        <div
          className="grid h-44 min-w-[560px] gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(56px, 1fr))` }}
        >
          {data.map((item) => {
            const currentValue = Number(item.volume);
            const previousValue = Number(item.previous_volume);
            const currentHeight = Math.max(4, Math.round((currentValue / max) * chartHeight));
            const previousHeight = Math.max(4, Math.round((previousValue / max) * chartHeight));
            const day = new Date(item.day).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });

            return (
              <div key={item.day} className="grid grid-rows-[1fr_20px]">
                <div className="flex h-full items-end justify-center gap-1">
                  <div
                    title={`${t("admin.dashboard.previousPeriod")}: ${formatTonNumber(previousValue, locale)} TON`}
                    className="w-[30%] max-w-[34px] rounded-t-md bg-[#94a3b8]/80"
                    style={{ height: previousHeight }}
                  />
                  <div
                    title={`${t("admin.dashboard.currentPeriod")}: ${formatTonNumber(currentValue, locale)} TON`}
                    className="w-[30%] max-w-[34px] rounded-t-md"
                    style={{
                      height: currentHeight,
                      background: "linear-gradient(180deg, #22c55e 0%, #2b4acb 100%)",
                    }}
                  />
                </div>
                <Text type="secondary" className="block text-center text-xs leading-5 tabular-nums">{day}</Text>
              </div>
            );
          })}
        </div>
      </div>
    </PanelShell>
  );
};

const HorizontalBarChart = ({ data }: { data: AdminSummary["top_collections"] }) => {
  const { t, i18n } = useTranslation();
  const locale = getAdminLocale(i18n.language);
  const values = data.map((item) => Number(item.volume));
  const max = Math.max(1, ...values);

  return (
    <PanelShell className="h-full !p-3">
      <Title level={5} className="!mb-3">{t("admin.charts.collectionsByVolume")}</Title>
      <Flex vertical gap={10}>
        {data.length === 0 && <Empty description={t("admin.charts.noSalesYet")} />}
        {data.map((item) => {
          const value = Number(item.volume);
          const width = Math.max(4, Math.round((value / max) * 100));

          return (
            <div key={item.collection_name}>
              <div className="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-3">
                <Text className="truncate leading-5">{item.collection_name}</Text>
                <Text className="block whitespace-nowrap text-right leading-5 tabular-nums">{formatTonNumber(value, locale)} TON</Text>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${width}%`,
                    background: "linear-gradient(90deg, #2b4acb 0%, #06b6d4 100%)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </Flex>
    </PanelShell>
  );
};

const StatusChart = ({ data }: { data: AdminSummary["reports_by_status"] }) => {
  const { t } = useTranslation();
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <PanelShell className="!p-3">
      <Title level={5} className="!mb-3">{t("admin.charts.reportsByStatus")}</Title>
      <Flex vertical gap={8}>
        {data.length === 0 && <Empty description={t("admin.charts.noReportsYet")} />}
        {data.map((item) => {
          const percent = total ? Math.round((item.count / total) * 100) : 0;

          return (
            <div key={item.status}>
              <Flex justify="space-between">
                <Text>{getStatusLabel(t, item.status)}</Text>
                <Text>{item.count} / {percent}%</Text>
              </Flex>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, percent)}%`,
                    background: item.status === "approved" ? "#22c55e" : item.status === "rejected" ? "#ef4444" : "#06b6d4",
                  }}
                />
              </div>
            </div>
          );
        })}
      </Flex>
    </PanelShell>
  );
};

const AdminView = () => {
  const { t } = useTranslation();
  useDocumentTitle(t("admin.documentTitle"));

  const [messageApi, contextHolder] = message.useMessage();
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminAccess()
      .then(setAccess)
      .catch(() => setAccess(null))
      .finally(() => setLoading(false));
  }, []);

  const tabItems = useMemo(() => {
    const hasPermission = (permission: string) => Boolean(access?.permissions?.includes(permission));
    const items = [
      {
        key: "dashboard",
        label: t("admin.tabs.dashboard"),
        icon: <BarChartOutlined />,
        children: <DashboardPanel messageApi={messageApi} />,
      },
      {
        key: "reports",
        label: t("admin.tabs.reports"),
        icon: <SafetyCertificateOutlined />,
        children: <ReportsPanel messageApi={messageApi} canAdmin={Boolean(access?.can_admin)} />,
      },
      {
        key: "analytics",
        label: t("admin.tabs.analytics"),
        icon: <BarChartOutlined />,
        children: <AnalyticsPanel messageApi={messageApi} />,
      },
    ];

    const adminItems = [];
    if (hasPermission("achievements.manage")) {
      adminItems.push({
        key: "achievements",
        label: t("admin.tabs.achievements"),
        icon: <TrophyOutlined />,
        children: <AchievementsPanel messageApi={messageApi} />,
      });
    }
    if (hasPermission("dictionaries.manage")) {
      adminItems.push({
        key: "dictionaries",
        label: t("admin.tabs.dictionaries"),
        icon: <DatabaseOutlined />,
        children: <DictionariesPanel messageApi={messageApi} />,
      });
    }
    if (hasPermission("moderation.manage")) {
      adminItems.push({
        key: "moderation",
        label: t("admin.tabs.moderation"),
        icon: <FileSearchOutlined />,
        children: <ModerationPanel messageApi={messageApi} access={access} />,
      });
    }
    if (access && (hasPermission("users.manage") || hasPermission("roles.manage"))) {
      adminItems.push({
        key: "users",
        label: t("admin.tabs.usersRoles"),
        icon: <TeamOutlined />,
        children: <UsersAndRolesPanel messageApi={messageApi} access={access} />,
      });
    }
    if (hasPermission("audit.view")) {
      adminItems.push({
        key: "audit",
        label: t("admin.tabs.audit"),
        icon: <SafetyCertificateOutlined />,
        children: <AuditPanel messageApi={messageApi} />,
      });
    }

    if (adminItems.length) {
      items.splice(2, 0, ...adminItems);
    }

    return items;
  }, [access, messageApi, t]);

  if (loading) {
    return <Spin size="large" className="my-20" />;
  }

  if (!access?.can_moderate) {
    return (
      <Layout className="min-h-screen">
        <Content className="px-3 py-10 sm:px-4 lg:px-[var(--size-4xl)]">
          <Result
            status="403"
            title={t("admin.noAccessTitle")}
            subTitle={t("admin.noAccessSubtitle")}
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-screen">
      {contextHolder}
      <Content className="px-3 py-4 sm:px-4 lg:px-[var(--size-4xl)]">
        <Flex justify="space-between" align="center" className="mb-4" wrap="wrap" gap={12}>
          <div>
            <Title level={2} className="!mb-1">{t("admin.title")}</Title>
            <Text type="secondary">{t("admin.role")}: {access.role_name || `#${access.role_id}`}</Text>
          </div>
        </Flex>

        <Tabs items={tabItems} />
      </Content>
      <FloatButton.BackTop
        icon={<UpOutlined />}
        tooltip={t("admin.backTop")}
        className="!bg-[var(--liquid-glass-bg)] !right-[var(--size-s)] !bottom-[var(--size-s)]"
        shape="square"
      />
    </Layout>
  );
};

const DashboardPanel = ({ messageApi }: { messageApi: MessageApi }) => {
  const { t, i18n } = useTranslation();
  const locale = getAdminLocale(i18n.language);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesRangePreset, setSalesRangePreset] = useState<SalesRangePreset>("30");
  const [customSalesRange, setCustomSalesRange] = useState<[Dayjs, Dayjs]>(getDefaultSalesRange);
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>("overview");
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  const summaryParams = useMemo<AdminSummaryParams>(() => {
    const baseParams = {
      collectionId: selectedCollectionId,
      compare: true,
    };

    if (salesRangePreset === "custom") {
      return {
        ...baseParams,
        startDate: customSalesRange[0].format("YYYY-MM-DD"),
        endDate: customSalesRange[1].format("YYYY-MM-DD"),
      };
    }

    return { ...baseParams, days: Number(salesRangePreset) };
  }, [customSalesRange, salesRangePreset, selectedCollectionId]);

  const salesRangeLabel = useMemo(() => {
    if (salesRangePreset === "custom") {
      return `${customSalesRange[0].format("DD.MM.YYYY")} - ${customSalesRange[1].format("DD.MM.YYYY")}`;
    }

    return t("admin.dashboard.lastDays", { count: Number(salesRangePreset) });
  }, [customSalesRange, salesRangePreset, t]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await getAdminSummary(summaryParams));
    } catch {
      messageApi.error(t("admin.dashboard.loadStatsFailed"));
    } finally {
      setLoading(false);
    }
  }, [messageApi, summaryParams, t]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) return <Spin className="my-10" />;
  if (!summary) return <Empty description={t("admin.dashboard.statsUnavailable")} />;

  const stats = [
    [t("admin.dashboard.users"), summary.cards.users_total],
    [t("admin.dashboard.activeUsers"), summary.cards.users_active],
    [t("admin.dashboard.transactions"), summary.cards.transactions_total],
    [t("admin.dashboard.salesVolume"), formatTonNumber(summary.cards.sales_volume, locale)],
    [t("admin.dashboard.platformFee"), formatTonNumber(summary.cards.platform_fee, locale)],
    [t("admin.dashboard.activeListings"), summary.cards.active_listings],
    [t("admin.dashboard.pendingReports"), summary.cards.pending_reports],
  ];
  const selectedCollection = summary.collections.find((item) => item.id === selectedCollectionId);
  const comparison = summary.comparison;
  const volumeDelta = Number(comparison?.delta.volume || 0);
  const volumeDeltaLabel = volumeDelta >= 0
    ? `+${formatTonNumber(volumeDelta, locale)}`
    : formatTonNumber(volumeDelta, locale);
  const volumeDeltaPercentLabel = comparison?.delta.volume_percent === null || comparison?.delta.volume_percent === undefined
    ? null
    : `${comparison.delta.volume_percent >= 0 ? "+" : ""}${comparison.delta.volume_percent.toFixed(1)}%`;

  const handleExportCsv = () => {
    const periodLabel = salesRangePreset === "custom"
      ? `${summaryParams.startDate}_${summaryParams.endDate}`
      : `${salesRangePreset}d`;
    const collectionLabel = selectedCollection
      ? selectedCollection.name.replace(/[^a-z0-9_-]+/gi, "_")
      : "all_collections";
    const comparisonRows = comparison?.sales_by_day || [];
    downloadCsv(`moon_admin_sales_${periodLabel}_${collectionLabel}.csv`, [
      [t("admin.dashboard.date"), t("admin.dashboard.deals"), t("admin.dashboard.volume"), t("admin.dashboard.previousDate"), t("admin.dashboard.previousDeals"), t("admin.dashboard.previousVolume")],
      ...summary.sales_by_day.map((item, index) => {
        const previous = comparisonRows[index];
        return [
          item.day,
          item.transactions,
          item.volume,
          previous?.previous_day || "",
          previous?.previous_transactions ?? "",
          previous?.previous_volume ?? "",
        ];
      }),
      [],
      [t("admin.dashboard.topCollectionsByVolume")],
      [t("admin.dashboard.collection"), t("admin.dashboard.deals"), t("admin.dashboard.volume")],
      ...summary.top_collections.map((item) => [item.collection_name, item.transactions, item.volume]),
    ]);
  };

  return (
    <Flex vertical gap={16}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] px-3 py-2"
          >
            <Text type="secondary" className="block truncate text-xs">{label}</Text>
            <Text strong className="block truncate text-lg leading-6">{value}</Text>
          </div>
        ))}
      </div>

      <PanelShell className="!p-3">
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Flex vertical gap={2}>
            <Text strong>{t("admin.dashboard.salesPeriod")}</Text>
            <Text type="secondary" className="text-xs">
              {selectedCollection ? `${salesRangeLabel} / ${selectedCollection.name}` : salesRangeLabel}
            </Text>
          </Flex>
          <Flex gap={8} wrap="wrap" justify="flex-end">
            <Select
              allowClear
              showSearch
              value={selectedCollectionId ?? undefined}
              placeholder={t("admin.dashboard.allCollections")}
              optionFilterProp="label"
              className="min-w-[220px]"
              options={summary.collections.map((collection) => ({ value: collection.id, label: collection.name }))}
              onChange={(value) => setSelectedCollectionId(value ?? null)}
            />
            <Segmented
              value={dashboardSection}
              options={[
                { label: t("admin.dashboard.overview"), value: "overview" },
                { label: t("admin.dashboard.charts"), value: "charts" },
                { label: t("admin.dashboard.tables"), value: "tables" },
              ]}
              onChange={(value) => setDashboardSection(value as DashboardSection)}
            />
            <Segmented
              value={salesRangePreset}
              options={[
                { label: t("admin.dashboard.days7"), value: "7" },
                { label: t("admin.dashboard.days14"), value: "14" },
                { label: t("admin.dashboard.days30"), value: "30" },
                { label: t("admin.dashboard.customRange"), value: "custom" },
              ]}
              onChange={(value) => setSalesRangePreset(value as SalesRangePreset)}
            />
            {salesRangePreset === "custom" && (
              <RangePicker
                allowClear={false}
                value={customSalesRange}
                disabledDate={(current) => Boolean(current?.isAfter(dayjs(), "day"))}
                onChange={(dates) => {
                  if (!dates?.[0] || !dates?.[1]) return;

                  if (dates[1].diff(dates[0], "day") > 89) {
                    messageApi.warning(t("admin.dashboard.rangeTooLong"));
                    return;
                  }

                  setCustomSalesRange([dates[0], dates[1]]);
                }}
              />
            )}
            <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
              {t("admin.dashboard.exportCsv")}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadSummary}>{t("admin.refresh")}</Button>
          </Flex>
        </Flex>
      </PanelShell>

      {dashboardSection === "overview" && (
        <Flex vertical gap={12}>
          {comparison && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <PanelShell className="!p-3">
                <Text type="secondary" className="block text-xs">{t("admin.dashboard.currentPeriod")}</Text>
                <Title level={4} className="!mb-0">{formatTonNumber(comparison.current.volume, locale)} TON</Title>
                <Text type="secondary" className="text-xs">{comparison.current.start_date} - {comparison.current.end_date}</Text>
              </PanelShell>
              <PanelShell className="!p-3">
                <Text type="secondary" className="block text-xs">{t("admin.dashboard.previousPeriod")}</Text>
                <Title level={4} className="!mb-0">{formatTonNumber(comparison.previous.volume, locale)} TON</Title>
                <Text type="secondary" className="text-xs">{comparison.previous.start_date} - {comparison.previous.end_date}</Text>
              </PanelShell>
              <PanelShell className="!p-3">
                <Text type="secondary" className="block text-xs">{t("admin.dashboard.periodChange")}</Text>
                <Title level={4} className={`!mb-0 ${volumeDelta >= 0 ? "!text-[var(--green-accept)]" : "!text-[var(--red-fail)]"}`}>
                  {volumeDeltaLabel} TON
                </Title>
                <Text type="secondary" className="text-xs">{volumeDeltaPercentLabel || t("admin.dashboard.noPreviousVolume")}</Text>
              </PanelShell>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <StatusChart data={summary.reports_by_status} />
            <HorizontalBarChart data={summary.top_collections} />
          </div>
        </Flex>
      )}

      {dashboardSection === "charts" && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="xl:col-span-2">
            {comparison ? (
              <ComparisonVolumeChart data={comparison.sales_by_day} />
            ) : (
              <VerticalBarChart data={summary.sales_by_day} />
            )}
          </div>
          <HorizontalBarChart data={summary.top_collections} />
        </div>
      )}

      {dashboardSection === "tables" && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <PanelShell className="!p-3">
            <Title level={5} className="!mb-3">{t("admin.dashboard.topCollectionsByVolume")}</Title>
            <Table
              rowKey="collection_name"
              size="small"
              pagination={false}
              sticky
              scroll={getAdminTableScroll(undefined, DASHBOARD_TABLE_SCROLL_Y)}
              dataSource={summary.top_collections}
              columns={[
                { title: t("admin.dashboard.collection"), dataIndex: "collection_name" },
                { title: t("admin.dashboard.deals"), dataIndex: "transactions", width: 100 },
                { title: t("admin.dashboard.volume"), dataIndex: "volume", render: (value: string) => formatTonNumber(value, locale), width: 120 },
              ]}
            />
          </PanelShell>

          <PanelShell className="!p-3">
            <Title level={5} className="!mb-3">{t("admin.dashboard.salesForPeriod")}</Title>
            <Table
              rowKey="day"
              size="small"
              pagination={false}
              sticky
              scroll={getAdminTableScroll(undefined, DASHBOARD_TABLE_SCROLL_Y)}
              dataSource={summary.sales_by_day}
              columns={[
                { title: t("admin.dashboard.date"), dataIndex: "day" },
                { title: t("admin.dashboard.deals"), dataIndex: "transactions", width: 100 },
                { title: t("admin.dashboard.volume"), dataIndex: "volume", render: (value: string) => formatTonNumber(value, locale), width: 120 },
              ]}
            />
          </PanelShell>
        </div>
      )}
    </Flex>
  );
};

const ReportsPanel = ({
  messageApi,
  canAdmin,
}: {
  messageApi: MessageApi;
  canAdmin: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const locale = getAdminLocale(i18n.language);
  const emptyValue = t("admin.empty");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [status, setStatus] = useState<ReportStatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [userProcessingId, setUserProcessingId] = useState<number | null>(null);
  const [warningProcessingId, setWarningProcessingId] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [warningReport, setWarningReport] = useState<AdminReport | null>(null);
  const [warningForm] = Form.useForm<{ reason_ru: string; reason_en: string }>();

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await getAdminReports(status));
    } catch {
      messageApi.error(t("admin.reports.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [messageApi, status, t]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDecision = async (reportId: number, decision: "approve" | "reject") => {
    const currentReport = selectedReport?.report_id === reportId
      ? selectedReport
      : reports.find((report) => report.report_id === reportId);

    if (currentReport && !reportCanBeHandled(currentReport)) {
      messageApi.warning(t("admin.reports.alreadyClosed"));
      return;
    }

    setProcessingId(reportId);
    try {
      await decideAdminReport(reportId, decision);
      messageApi.success(decision === "approve" ? t("admin.reports.reportApproved") : t("admin.reports.reportRejected"));
      await loadReports();
      setSelectedReport(null);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("already closed")) {
        messageApi.warning(t("admin.reports.alreadyClosed"));
      } else {
        messageApi.error(t("admin.reports.processFailed"));
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleUserActive = async (userId: number, isActive: number) => {
    setUserProcessingId(userId);
    try {
      await setAdminUserActive(userId, isActive);
      messageApi.success(isActive ? t("admin.reports.userUnbanned") : t("admin.reports.userBanned"));
      await loadReports();
      if (isActive === 0) {
        setSelectedReport(null);
        return;
      }
      setSelectedReport((current) => {
        if (!current || current.receiver_id !== userId) return current;
        return { ...current, receiver_is_active: isActive };
      });
    } catch {
      messageApi.error(t("admin.reports.userStatusFailed"));
    } finally {
      setUserProcessingId(null);
    }
  };

  const openWarningModal = (report: AdminReport) => {
    const reason = report.report_type_title || t("admin.reports.notSpecified");
    setWarningReport(report);
    warningForm.setFieldsValue({
      reason_ru: reason,
      reason_en: reason,
    });
  };

  const handleSendWarning = async () => {
    if (!warningReport) return;

    const values = await warningForm.validateFields();
    setWarningProcessingId(warningReport.report_id);

    try {
      await sendAdminReportWarning(warningReport.report_id, values);
      messageApi.success(t("admin.reports.warningSent"));
      setWarningReport(null);
      warningForm.resetFields();
    } catch {
      messageApi.error(t("admin.reports.warningFailed"));
    } finally {
      setWarningProcessingId(null);
    }
  };

  const renderUserStatus = (active: number | null) => (
    active === 0 ? (
      <Tag color="red" className="w-fit">{t("admin.status.banned")}</Tag>
    ) : (
      <Tag color="green" className="w-fit">{t("admin.status.active")}</Tag>
    )
  );
  const selectedReportCanBeHandled = selectedReport ? reportCanBeHandled(selectedReport) : false;

  return (
    <>
      <PanelShell>
        <Flex vertical gap={16}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            <Segmented<ReportStatusFilter>
              value={status}
              onChange={setStatus}
              options={[
                { label: t("admin.reports.waiting"), value: "pending" },
                { label: t("admin.reports.approvedTab"), value: "approved" },
                { label: t("admin.reports.rejectedTab"), value: "rejected" },
                { label: t("admin.reports.all"), value: "all" },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={loadReports}>{t("admin.refresh")}</Button>
          </Flex>

          <Table
            rowKey="report_id"
            loading={loading}
            dataSource={reports}
            sticky
            scroll={getAdminTableScroll(1040)}
            columns={[
              { title: "ID", dataIndex: "report_id", width: 80 },
              {
                title: t("admin.reports.sender"),
                render: (_, record: AdminReport) => renderAdminUserNameWithBadge(
                  record.sender_username,
                  `#${record.sender_id}`,
                  record.sender_profile_badge_achievement_id,
                  record.sender_profile_badge_image_url,
                  record.sender_profile_badge_title,
                ),
              },
              {
                title: t("admin.reports.receiver"),
                render: (_, record: AdminReport) => (
                  <Flex vertical gap={4}>
                    {renderAdminUserNameWithBadge(
                      record.receiver_username,
                      `#${record.receiver_id}`,
                      record.receiver_profile_badge_achievement_id,
                      record.receiver_profile_badge_image_url,
                      record.receiver_profile_badge_title,
                    )}
                    {renderUserStatus(record.receiver_is_active)}
                  </Flex>
                ),
              },
              { title: t("admin.reports.reason"), dataIndex: "report_type_title" },
              {
                title: t("admin.reports.status"),
                dataIndex: "report_status_name",
                width: 130,
                render: (value: string) => (
                  <Tag color={statusColors[value] || "default"}>
                    {getStatusLabel(t, value)}
                  </Tag>
                ),
              },
              { title: t("admin.reports.createdAt"), dataIndex: "created_at", render: (value: string | null) => formatDate(value, locale, emptyValue), width: 170 },
              {
                title: t("admin.reports.moderator"),
                render: (_, record: AdminReport) => renderAdminUserNameWithBadge(
                  record.moderator_username,
                  emptyValue,
                  record.moderator_profile_badge_achievement_id,
                  record.moderator_profile_badge_image_url,
                  record.moderator_profile_badge_title,
                ),
              },
              {
                title: t("admin.reports.decision"),
                fixed: "right",
                width: 390,
                render: (_, record: AdminReport) => {
                  const canHandleReport = reportCanBeHandled(record);

                  return (
                    <Flex gap={8} wrap="wrap">
                      <Button
                        size="small"
                        type="primary"
                        icon={<EyeOutlined />}
                        onClick={() => setSelectedReport(record)}
                      >
                        {t("admin.reports.view")}
                      </Button>
                      {canHandleReport && (
                        <Button
                          size="small"
                          icon={<WarningOutlined />}
                          loading={warningProcessingId === record.report_id}
                          disabled={record.receiver_is_active === 0}
                          onClick={() => openWarningModal(record)}
                        >
                          {t("admin.reports.warn")}
                        </Button>
                      )}
                      {canAdmin && canHandleReport && (
                        record.receiver_is_active === 0 ? (
                          <Button
                            size="small"
                            icon={<UnlockOutlined />}
                            loading={userProcessingId === record.receiver_id}
                            onClick={() => handleUserActive(record.receiver_id, 1)}
                          >
                            {t("admin.reports.unban")}
                          </Button>
                        ) : (
                          <Popconfirm
                            title={t("admin.reports.banUserTitle")}
                            description={t("admin.reports.banUserDescription")}
                            okText={t("admin.reports.ban")}
                            cancelText={t("admin.cancel")}
                            onConfirm={() => handleUserActive(record.receiver_id, 0)}
                          >
                            <Button
                              size="small"
                              danger
                              icon={<StopOutlined />}
                              loading={userProcessingId === record.receiver_id}
                            >
                              {t("admin.reports.ban")}
                            </Button>
                          </Popconfirm>
                        )
                      )}
                    </Flex>
                  );
                },
              },
            ]}
          />
        </Flex>
      </PanelShell>

      <Modal
        open={Boolean(selectedReport)}
        title={t("admin.reports.reviewTitle")}
        onCancel={() => setSelectedReport(null)}
        footer={[
          <Button key="cancel" onClick={() => setSelectedReport(null)}>{t("admin.reports.close")}</Button>,
          ...(selectedReportCanBeHandled ? [
            <Button
              key="warn"
              icon={<WarningOutlined />}
              loading={selectedReport ? warningProcessingId === selectedReport.report_id : false}
              disabled={selectedReport?.receiver_is_active === 0}
              onClick={() => selectedReport && openWarningModal(selectedReport)}
            >
              {t("admin.reports.warn")}
            </Button>,
            <Button
              key="reject"
              danger
              icon={<CloseOutlined />}
              loading={selectedReport ? processingId === selectedReport.report_id : false}
              onClick={() => selectedReport && handleDecision(selectedReport.report_id, "reject")}
            >
              {t("admin.reports.reject")}
            </Button>,
            <Button
              key="approve"
              type="primary"
              icon={<CheckOutlined />}
              loading={selectedReport ? processingId === selectedReport.report_id : false}
              onClick={() => selectedReport && handleDecision(selectedReport.report_id, "approve")}
            >
              {t("admin.reports.approve")}
            </Button>,
          ] : []),
        ]}
      >
        {selectedReport && (
          <Flex vertical gap={14} className="mt-3">
            <div className="rounded-lg border border-[var(--black-transparent)] p-3">
              <Flex vertical gap={8}>
                <Text type="secondary">{t("admin.reports.complainant")}</Text>
                {renderAdminUserNameWithBadge(
                  selectedReport.sender_username,
                  `#${selectedReport.sender_id}`,
                  selectedReport.sender_profile_badge_achievement_id,
                  selectedReport.sender_profile_badge_image_url,
                  selectedReport.sender_profile_badge_title,
                )}
              </Flex>
            </div>
            <div className="rounded-lg border border-[var(--black-transparent)] p-3">
              <Flex vertical gap={8}>
                <Text type="secondary">{t("admin.reports.target")}</Text>
                <Flex align="center" gap={8} wrap="wrap">
                  {renderAdminUserNameWithBadge(
                    selectedReport.receiver_username,
                    `#${selectedReport.receiver_id}`,
                    selectedReport.receiver_profile_badge_achievement_id,
                    selectedReport.receiver_profile_badge_image_url,
                    selectedReport.receiver_profile_badge_title,
                  )}
                  {renderUserStatus(selectedReport.receiver_is_active)}
                </Flex>
              </Flex>
            </div>
            <div className="rounded-lg border border-[var(--black-transparent)] p-3">
              <Flex vertical gap={8}>
                <Text type="secondary">{t("admin.reports.reportReason")}</Text>
                <Text>{selectedReport.report_type_title || t("admin.reports.notSpecified")}</Text>
              </Flex>
            </div>
            {canAdmin && selectedReportCanBeHandled && (
              <Flex justify="flex-end" gap={8} wrap="wrap">
                {selectedReport.receiver_is_active === 0 ? (
                  <Button
                    icon={<UnlockOutlined />}
                    loading={userProcessingId === selectedReport.receiver_id}
                    onClick={() => handleUserActive(selectedReport.receiver_id, 1)}
                  >
                    {t("admin.reports.unbanUser")}
                  </Button>
                ) : (
                  <Popconfirm
                    title={t("admin.reports.banUserTitle")}
                    description={t("admin.reports.banUserDescription")}
                    okText={t("admin.reports.banUser")}
                    cancelText={t("admin.cancel")}
                    onConfirm={() => handleUserActive(selectedReport.receiver_id, 0)}
                  >
                    <Button
                      danger
                      icon={<StopOutlined />}
                      loading={userProcessingId === selectedReport.receiver_id}
                    >
                      {t("admin.reports.banUser")}
                    </Button>
                  </Popconfirm>
                )}
              </Flex>
            )}
          </Flex>
        )}
      </Modal>

      <Modal
        open={Boolean(warningReport)}
        title={t("admin.reports.warningTitle")}
        onCancel={() => {
          setWarningReport(null);
          warningForm.resetFields();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setWarningReport(null);
              warningForm.resetFields();
            }}
          >
            {t("admin.cancel")}
          </Button>,
          <Button
            key="send"
            type="primary"
            danger
            icon={<WarningOutlined />}
            loading={warningReport ? warningProcessingId === warningReport.report_id : false}
            onClick={handleSendWarning}
          >
            {t("admin.reports.sendWarning")}
          </Button>,
        ]}
      >
        {warningReport && (
          <Flex vertical gap={12} className="mt-3">
            <Text type="secondary">
              {t("admin.reports.warningDescription", {
                user: warningReport.receiver_username || `#${warningReport.receiver_id}`,
              })}
            </Text>
            <Form form={warningForm} layout="vertical">
              <Form.Item
                name="reason_ru"
                label={t("admin.reports.warningReasonRu")}
                rules={[{ required: true, message: t("admin.reports.enterWarningReasonRu") }]}
              >
                <Input maxLength={255} />
              </Form.Item>
              <Form.Item
                name="reason_en"
                label={t("admin.reports.warningReasonEn")}
                rules={[{ required: true, message: t("admin.reports.enterWarningReasonEn") }]}
              >
                <Input maxLength={255} />
              </Form.Item>
            </Form>
          </Flex>
        )}
      </Modal>
    </>
  );
};

const ImageUploadPreview = ({
  value,
  onChange,
  existingSrc,
  label,
}: {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  existingSrc?: string;
  label?: string;
}) => {
  const { t } = useTranslation();
  const beforeUpload: UploadProps["beforeUpload"] = async (file) => {
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      return Upload.LIST_IGNORE;
    }
    const dataUrl = await readFileAsDataUrl(file as File);
    onChange(dataUrl);
    return false;
  };

  const src = value || existingSrc;
  return (
    <Flex vertical gap={8}>
      {src && (
        <Image
          src={src}
          width={112}
          height={112}
          preview
          style={{ objectFit: "cover", borderRadius: 8 }}
        />
      )}
      <Upload accept="image/png,image/jpeg,image/webp" showUploadList={false} beforeUpload={beforeUpload}>
        <Button>{label || t("admin.imageUpload.uploadImage")}</Button>
      </Upload>
      {value && <Button size="small" onClick={() => onChange(null)}>{t("admin.imageUpload.removeNewFile")}</Button>}
    </Flex>
  );
};

const AchievementsPanel = ({ messageApi }: { messageApi: MessageApi }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<AdminAchievement[]>([]);
  const [rules, setRules] = useState<{ key: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminAchievement | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<AchievementPayload>();

  const getRuleLabel = useCallback((ruleKey: string | null | undefined) => {
    if (!ruleKey) return t("admin.empty");
    const rule = rules.find((item) => item.key === ruleKey);
    return getAchievementRuleLabel(t, ruleKey, rule?.label || ruleKey);
  }, [rules, t]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedItems, loadedRules] = await Promise.all([
        getAdminAchievements(),
        getAchievementRules(),
      ]);
      setItems(loadedItems);
      setRules(loadedRules);
    } catch {
      messageApi.error(t("admin.achievements.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [messageApi, t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openModal = (item: AdminAchievement | null) => {
    setEditingItem(item);
    setImageDataUrl(null);
    form.setFieldsValue({
      title: item?.title || "",
      description: item?.description || "",
      rule_key: item?.rule_key || "manual",
      rule_value: item?.rule_value || undefined,
      is_active: item?.is_active ?? 1,
      backfill_existing: true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (!editingItem && !imageDataUrl) {
      messageApi.error(t("admin.achievements.imageRequired"));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...values, image_url: editingItem?.image_url ?? values.image_url, image_data_url: imageDataUrl };
      const result = editingItem
        ? await updateAchievement(editingItem.achievement_id, payload)
        : await createAchievement(payload);
      messageApi.success(t("admin.achievements.savedWithAwarded", { count: result.awarded_now || 0 }));
      setModalOpen(false);
      await loadAll();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : t("admin.achievements.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleBackfill = async () => {
    try {
      const result = await backfillAchievements();
      messageApi.success(t("admin.achievements.backfillDone", { count: result.awarded }));
      await loadAll();
    } catch {
      messageApi.error(t("admin.achievements.backfillFailed"));
    }
  };

  return (
    <PanelShell>
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Text type="secondary">{t("admin.achievements.description")}</Text>
          <Flex gap={8} wrap="wrap">
            <Button icon={<ReloadOutlined />} onClick={handleBackfill}>{t("admin.achievements.backfillAll")}</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>{t("admin.achievements.new")}</Button>
          </Flex>
        </Flex>
        <Table
          rowKey="achievement_id"
          loading={loading}
          dataSource={items}
          sticky
          scroll={getAdminTableScroll(980)}
          columns={[
            {
              title: t("admin.achievements.image"),
              width: 96,
              render: (_, record) => record.image_url ? <Image width={56} height={56} src={achievementImageUrl(record.image_url)} style={{ objectFit: "cover", borderRadius: 8 }} /> : <TrophyOutlined />,
            },
            { title: t("admin.achievements.title"), dataIndex: "title" },
            { title: t("admin.achievements.details"), dataIndex: "description", ellipsis: true },
            { title: t("admin.achievements.rule"), dataIndex: "rule_key", render: getRuleLabel, width: 220 },
            { title: t("admin.achievements.awarded"), dataIndex: "awarded_count", width: 100 },
            {
              title: t("admin.achievements.usersPercent"),
              dataIndex: "users_percent",
              width: 150,
              render: (value: number) => `${value}%`,
            },
            {
              title: t("admin.achievements.status"),
              dataIndex: "is_active",
              width: 120,
              render: (value: number) => value ? <Tag color="green">{t("admin.status.active")}</Tag> : <Tag>{t("admin.status.hidden")}</Tag>,
            },
            {
              title: t("admin.achievements.actions"),
              fixed: "right",
              width: 220,
              render: (_, record) => (
                <Flex gap={8}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>{t("admin.achievements.edit")}</Button>
                  <Button size="small" onClick={async () => {
                    await setAchievementActive(record.achievement_id, record.is_active ? 0 : 1);
                    await loadAll();
                  }}>
                    {record.is_active ? t("admin.achievements.disable") : t("admin.achievements.enable")}
                  </Button>
                </Flex>
              ),
            },
          ]}
        />
      </Flex>

      <Modal
        open={modalOpen}
        title={editingItem ? t("admin.achievements.editTitle") : t("admin.achievements.newTitle")}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>{t("admin.cancel")}</Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSave}>{t("admin.save")}</Button>,
        ]}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="title" label={t("admin.achievements.title")} rules={[{ required: true, message: t("admin.achievements.enterTitle") }]}>
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item name="description" label={t("admin.achievements.details")} rules={[{ required: true, message: t("admin.achievements.enterDescription") }]}>
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Form.Item label={t("admin.achievements.image")}>
            <ImageUploadPreview
              value={imageDataUrl}
              existingSrc={achievementImageUrl(editingItem?.image_url)}
              onChange={setImageDataUrl}
            />
          </Form.Item>
          <Form.Item name="rule_key" label={t("admin.achievements.rule")}>
            <Select options={rules.map((rule) => ({ value: rule.key, label: getRuleLabel(rule.key) }))} />
          </Form.Item>
          <Form.Item name="rule_value" label={t("admin.achievements.ruleValue")}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="is_active" label={t("admin.status.active")} valuePropName="checked" getValueFromEvent={(checked) => checked ? 1 : 0}>
            <Switch />
          </Form.Item>
          <Form.Item name="backfill_existing" label={t("admin.achievements.backfillExisting")} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PanelShell>
  );
};

const ModerationPanel = ({ messageApi, access }: { messageApi: MessageApi; access: AdminAccess | null }) => {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [status, setStatus] = useState<ModerationStatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const isRuLanguage = i18n.language.startsWith("ru");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getModerationQueue(status));
    } catch {
      messageApi.error(t("admin.moderation.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [messageApi, status, t]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDecision = async (id: number, decision: "approve" | "reject") => {
    try {
      const result = await decideModerationItem(id, decision);
      if (result.status === "pending") {
        messageApi.success(isRuLanguage ? "Голос учтен, заявка ждет кворум" : "Vote saved; waiting for quorum");
      } else {
        messageApi.success(decision === "approve" ? t("admin.moderation.approved") : t("admin.moderation.rejected"));
      }
      await loadItems();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : t("admin.moderation.processFailed"));
    }
  };

  const renderVoteProgress = (record: ModerationItem) => {
    if (record.item_type !== "dictionary_image" || !record.vote_counts) {
      return null;
    }

    const counts = record.vote_counts;
    return (
      <Flex vertical gap={2}>
        <Text className="text-xs">
          {isRuLanguage ? "Одобрения админов" : "Admin approvals"}: {counts.admin_approvals}/2
        </Text>
        <Text className="text-xs" type="secondary">
          {isRuLanguage ? "Отказы админов" : "Admin rejections"}: {counts.admin_rejections}/1
        </Text>
      </Flex>
    );
  };

  return (
    <PanelShell>
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Segmented<ModerationStatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { label: t("admin.status.pending"), value: "pending" },
              { label: t("admin.status.approved"), value: "approved" },
              { label: t("admin.status.rejected"), value: "rejected" },
              { label: t("admin.reports.all"), value: "all" },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={loadItems}>{t("admin.refresh")}</Button>
        </Flex>
        <Table
          rowKey="moderation_id"
          loading={loading}
          dataSource={items}
          sticky
          scroll={getAdminTableScroll(1160)}
          columns={[
            { title: "ID", dataIndex: "moderation_id", width: 80 },
            { title: t("admin.moderation.type"), dataIndex: "item_type", width: 150 },
            { title: t("admin.moderation.action"), dataIndex: "action", width: 120 },
            { title: t("admin.moderation.target"), render: (_, record) => `${record.target_kind || "-"} ${record.target_id || ""}`, width: 150 },
            { title: isRuLanguage ? "Автор" : "Author", dataIndex: "submitted_by", width: 100 },
            {
              title: t("admin.moderation.preview"),
              width: 120,
              render: (_, record) => {
                const src = moderationImageUrl(record);

                return src ? (
                  <Image
                    src={src}
                    width={72}
                    height={72}
                    style={{ objectFit: "cover", borderRadius: 8 }}
                  />
                ) : null;
              },
            },
            { title: "Payload", render: (_, record) => <Text className="text-xs">{JSON.stringify(record.payload)}</Text> },
            {
              title: isRuLanguage ? "Голоса" : "Votes",
              width: 190,
              render: (_, record) => renderVoteProgress(record),
            },
            {
              title: t("admin.moderation.status"),
              dataIndex: "status",
              width: 110,
              render: (value: string) => <Tag color={value === "approved" ? "green" : value === "rejected" ? "red" : "blue"}>{value}</Tag>,
            },
            {
              title: t("admin.moderation.actions"),
              fixed: "right",
              width: 180,
              render: (_, record) => {
                if (record.status !== "pending") return null;

                const isOwnDictionaryRequest = record.item_type === "dictionary_image" && record.submitted_by === access?.user_id;
                const hasVoted = Boolean(record.votes?.some((vote) => vote.user_id === access?.user_id));
                const disabledReason = isOwnDictionaryRequest
                  ? (isRuLanguage ? "Нельзя голосовать за свою заявку" : "You cannot vote on your own request")
                  : hasVoted
                    ? (isRuLanguage ? "Вы уже проголосовали" : "You have already voted")
                    : "";

                return (
                  <Tooltip title={disabledReason}>
                    <Flex gap={8}>
                      <Button
                        size="small"
                        type="primary"
                        disabled={isOwnDictionaryRequest || hasVoted}
                        onClick={() => handleDecision(record.moderation_id, "approve")}
                      >
                        OK
                      </Button>
                      <Button
                        size="small"
                        danger
                        disabled={isOwnDictionaryRequest || hasVoted}
                        onClick={() => handleDecision(record.moderation_id, "reject")}
                      >
                        {t("admin.reports.reject")}
                      </Button>
                    </Flex>
                  </Tooltip>
                );
              },
            },
          ]}
        />
      </Flex>
    </PanelShell>
  );
};

const AuditPanel = ({ messageApi }: { messageApi: MessageApi }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getAuditLogs(150));
    } catch {
      messageApi.error(t("admin.audit.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [messageApi, t]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <PanelShell>
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center">
          <Text type="secondary">{t("admin.whoandwhat")}</Text>
          <Button icon={<ReloadOutlined />} onClick={loadItems}>{t("admin.refresh")}</Button>
        </Flex>
        <Table
          rowKey="audit_id"
          loading={loading}
          dataSource={items}
          sticky
          scroll={getAdminTableScroll(900)}
          columns={[
            { title: "ID", dataIndex: "audit_id", width: 80 },
            { title: t("admin.audit.actor"), dataIndex: "actor_user_id", width: 100 },
            { title: t("admin.audit.action"), dataIndex: "action", width: 180 },
            { title: t("admin.audit.entity"), render: (_, record) => `${record.entity_type || "-"} ${record.entity_id || ""}`, width: 180 },
            { title: "Payload", render: (_, record) => <Text className="text-xs">{JSON.stringify(record.payload)}</Text> },
            { title: t("admin.audit.date"), dataIndex: "created_at", width: 180 },
          ]}
        />
      </Flex>
    </PanelShell>
  );
};

const DictionariesPanel = ({ messageApi }: { messageApi: MessageApi }) => {
  const { t, i18n } = useTranslation();
  const locale = getAdminLocale(i18n.language);
  const [kind, setKind] = useState<DictionaryKind>("collections");
  const [items, setItems] = useState<DictionaryItem[]>([]);
  const [collections, setCollections] = useState<DictionaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [dictionarySearch, setDictionarySearch] = useState("");
  const [form] = Form.useForm<DictionaryItemPayload>();

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getDictionaryItems(kind));
    } catch {
      messageApi.error(t("admin.dictionaries.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [kind, messageApi, t]);

  const filteredItems = useMemo(() => {
  const query = dictionarySearch.trim().toLowerCase();

  if (!query) {
    return items;
  }

  return items.filter((item) => {
      const values = [
        item.name,
        item.collection_name,
        item.image_url,
        item.base_price,
        String(item.collection_limit ?? ""),
        String(item.purchase_limit ?? ""),
      ];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(query),
      );
    });
  }, [items, dictionarySearch]);

  const loadCollections = useCallback(async () => {
    try {
      setCollections(await getDictionaryItems("collections"));
    } catch {
      setCollections([]);
    }
  }, []);

  useEffect(() => {
    loadItems();
    if (kind === "models") {
      loadCollections();
    }
  }, [kind, loadCollections, loadItems]);

  const openCreate = () => {
    setEditingItem(null);
    setImageDataUrl(null);
    form.resetFields();
    form.setFieldsValue({
      collection_limit: 100,
      base_price: 100,
    });
    setModalOpen(true);
  };

  const openEdit = (item: DictionaryItem) => {
    setEditingItem(item);
    setImageDataUrl(null);
    form.setFieldsValue({
      name: item.name,
      image_url: item.image_url,
      collection_id: item.collection_id,
      collection_limit: item.collection_limit,
      purchase_limit: item.purchase_limit,
      base_price: item.base_price ? Number(item.base_price) : undefined,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (!editingItem && !imageDataUrl) {
      messageApi.error(t("admin.dictionaries.uploadRequired"));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...values, image_url: editingItem?.image_url ?? values.image_url, image_data_url: imageDataUrl };
      if (editingItem) {
        const result = await updateDictionaryItem(kind, editingItem.id, payload);
        messageApi.success((result as any).status === "pending" ? t("admin.dictionaries.sentToModeration") : t("admin.dictionaries.updated"));
      } else {
        const result = await createDictionaryItem(kind, payload);
        messageApi.success((result as any).status === "pending" ? t("admin.dictionaries.sentToModeration") : t("admin.dictionaries.created"));
      }
      setModalOpen(false);
      await loadItems();
    } catch {
      messageApi.error(t("admin.dictionaries.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (item: DictionaryItem, archived: boolean) => {
    try {
      await setDictionaryItemArchived(kind, item.id, archived);
      messageApi.success(archived ? t("admin.dictionaries.archived") : t("admin.dictionaries.restored"));
      await loadItems();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : t("admin.dictionaries.archiveFailed"));
    }
  };

  const handlePublish = async (item: DictionaryItem) => {
    try {
      await publishCollection(item.id);
      messageApi.success(i18n.language.startsWith("ru") ? "Коллекция выпущена" : "Collection published");
      await loadItems();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : t("admin.dictionaries.archiveFailed"));
    }
  };

  return (
    <PanelShell>
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Segmented<DictionaryKind>
            value={kind}
            onChange={(value) => {
              setKind(value);
              setDictionarySearch("");
            }}
            options={dictionaryKinds.map((value) => ({
              value,
              label: getDictionaryLabel(t, value),
            }))}
          />

          <Flex gap={8} wrap="wrap" justify="flex-end" className="flex-1">
            <Input.Search
              allowClear
              value={dictionarySearch}
              placeholder={t("common.search")}
              onChange={(event) => setDictionarySearch(event.target.value)}
              className="max-w-[320px]"
            />

            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {t("admin.dictionaries.add")}
            </Button>
          </Flex>
        </Flex>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredItems}
          sticky
          scroll={getAdminTableScroll(820)}
          columns={[
            { title: t("admin.dictionaries.name"), dataIndex: "name" },
            ...(kind === "models" ? [{ title: t("admin.dictionaries.collection"), dataIndex: "collection_name" }] : []),
            ...(kind === "collections" ? [
              { title: t("admin.dictionaries.limit"), dataIndex: "collection_limit", width: 100 },
              { title: t("admin.dictionaries.price"), dataIndex: "base_price", render: (value: string) => formatTonNumber(value, locale), width: 120 },
            ] : []),
            {
              title: t("admin.dictionaries.status"),
              dataIndex: "is_active",
              width: 120,
              render: (value: number) => value === 1
                ? <Tag color="green">{t("admin.status.active")}</Tag>
                : <Tag>{kind === "collections" ? (i18n.language.startsWith("ru") ? "Черновик" : "Draft") : t("admin.status.archive")}</Tag>,
            },
            {
              title: t("admin.dictionaries.actions"),
              fixed: "right",
              width: 250,
              render: (_, record: DictionaryItem) => (
                <Flex gap={8}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                    {t("admin.dictionaries.edit")}
                  </Button>
                  {record.is_active === 1 ? (
                    <Button size="small" danger onClick={() => handleArchive(record, true)}>
                      {t("admin.dictionaries.archive")}
                    </Button>
                  ) : kind === "collections" ? (
                    <Button size="small" type="primary" icon={<UnlockOutlined />} onClick={() => handlePublish(record)}>
                      {i18n.language.startsWith("ru") ? "Выпустить" : "Publish"}
                    </Button>
                  ) : (
                    <Button size="small" onClick={() => handleArchive(record, false)}>
                      {t("admin.dictionaries.restore")}
                    </Button>
                  )}
                </Flex>
              ),
            },
          ]}
        />
      </Flex>

      <Modal
        open={modalOpen}
        title={editingItem ? t("admin.dictionaries.editTitle") : t("admin.dictionaries.createTitle")}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>{t("admin.cancel")}</Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSave}>{t("admin.save")}</Button>,
        ]}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label={t("admin.dictionaries.name")} rules={[{ required: true, message: t("admin.dictionaries.enterName") }]}>
            <Input />
          </Form.Item>

          <Form.Item label={t("admin.dictionaries.uploadImage")}>
            <ImageUploadPreview
              value={imageDataUrl}
              existingSrc={dictionaryImageUrl(kind, editingItem?.image_url)}
              onChange={setImageDataUrl}
              label={t("admin.dictionaries.chooseFile")}
            />
            <Text type="secondary" className="mt-2 block text-xs">
              {t("admin.dictionaries.moderationHint")}
            </Text>
          </Form.Item>

          {kind === "models" && (
            <Form.Item name="collection_id" label={t("admin.dictionaries.collection")} rules={[{ required: true, message: t("admin.dictionaries.chooseCollectionMsg") }]}>
              <Select
                options={collections.map((collection) => ({ value: collection.id, label: collection.name }))}
                placeholder={t("admin.dictionaries.chooseCollection")}
              />
            </Form.Item>
          )}

          {kind === "collections" && (
            <>
              <Form.Item name="collection_limit" label={t("admin.dictionaries.releaseLimit")} rules={[{ required: true, message: t("admin.dictionaries.enterLimit") }]}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
              <Form.Item name="purchase_limit" label={t("admin.dictionaries.purchaseLimit")}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
              <Form.Item name="base_price" label={t("admin.dictionaries.basePrice")} rules={[{ required: true, message: t("admin.dictionaries.enterPrice") }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </PanelShell>
  );
};

const UsersAndRolesPanel = ({ messageApi, access }: { messageApi: MessageApi; access: AdminAccess }) => {
  const { t, i18n } = useTranslation();
  const locale = getAdminLocale(i18n.language);
  const emptyValue = t("admin.empty");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessSection, setAccessSection] = useState<AccessSection>("users");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<{ key: string; label: string }[]>([]);
  const [sanctionUser, setSanctionUser] = useState<AdminUser | null>(null);
  const [sanctions, setSanctions] = useState<any[]>([]);
  const [sanctionsLoading, setSanctionsLoading] = useState(false);
  const [roleForm] = Form.useForm<{ role_name: string; description: string | null; permissions: string[] }>();
  const canManageUsers = access.permissions.includes("users.manage");
  const canManageRoles = access.permissions.includes("roles.manage");
  const masterRoleNames = ["master_admin", "owner", "super_admin", "главный админ", "мастер админ"];
  const isMasterRole = (roleId: number, roleName?: string | null) => (
    roleId === 4 || masterRoleNames.includes((roleName || "").toLowerCase())
  );
  const currentUserIsMaster = isMasterRole(access.role_id, access.role_name);
  const canChangeUserRole = (record: AdminUser) => (
    record.user_id !== access.user_id && (currentUserIsMaster || !isMasterRole(record.role_id, record.role_name))
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedUsers, loadedRoles] = await Promise.all([
        canManageUsers ? getAdminUsers(search) : Promise.resolve([]),
        (canManageUsers || canManageRoles) ? getAdminRoles() : Promise.resolve([]),
      ]);
      setUsers(loadedUsers);
      setRoles(loadedRoles);
      setAvailablePermissions(access.available_permissions || []);
    } catch {
      messageApi.error(t("admin.users.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [access.available_permissions, canManageRoles, canManageUsers, messageApi, search, t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!canManageUsers && canManageRoles) {
      setAccessSection("roles");
    }
  }, [canManageRoles, canManageUsers]);

  const openRoleModal = (role: AdminRole | null) => {
    setEditingRole(role);
    roleForm.setFieldsValue({
      role_name: role?.role_name || "",
      description: role?.description || "",
      permissions: role?.permissions || [],
    });
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    const values = await roleForm.validateFields();
    try {
      if (editingRole) {
        await updateAdminRole(editingRole.role_id, values);
        messageApi.success(t("admin.users.roleUpdated"));
      } else {
        await createAdminRole(values);
        messageApi.success(t("admin.users.roleCreated"));
      }
      setRoleModalOpen(false);
      await loadAll();
    } catch {
      messageApi.error(t("admin.users.roleSaveFailed"));
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    try {
      await deleteAdminRole(roleId);
      messageApi.success(t("admin.users.roleDeleted"));
      await loadAll();
    } catch {
      messageApi.error(t("admin.users.roleDeleteFailed"));
    }
  };

  const handleSetUserRole = async (userId: number, roleId: number) => {
    try {
      await setAdminUserRole(userId, roleId);
      messageApi.success(t("admin.users.userRoleChanged"));
      await loadAll();
    } catch {
      messageApi.error(t("admin.users.userRoleFailed"));
    }
  };

  const handleSetActive = async (userId: number, checked: boolean) => {
    try {
      await setAdminUserActive(userId, checked ? 1 : 0);
      messageApi.success(t("admin.users.userStatusChanged"));
      await loadAll();
    } catch {
      messageApi.error(t("admin.users.userStatusFailed"));
    }
  };

  const openSanctions = async (user: AdminUser) => {
    setSanctionUser(user);
    setSanctionsLoading(true);
    try {
      setSanctions(await getUserSanctions(user.user_id));
    } catch {
      setSanctions([]);
      messageApi.error(t("admin.users.loadSanctionsFailed"));
    } finally {
      setSanctionsLoading(false);
    }
  };

  return (
    <Flex vertical gap={16}>
      <PanelShell className="!p-3">
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Segmented
            value={accessSection}
            options={[
              ...(canManageUsers ? [{ label: t("admin.users.users"), value: "users" }] : []),
              ...(canManageRoles ? [{ label: t("admin.users.roles"), value: "roles" }] : []),
            ]}
            onChange={(value) => setAccessSection(value as AccessSection)}
          />
          <Flex gap={8} wrap="wrap" justify="flex-end">
            {canManageRoles && accessSection === "roles" && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openRoleModal(null)}>
                {t("admin.users.createRole")}
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={loadAll}>{t("admin.refresh")}</Button>
          </Flex>
        </Flex>
      </PanelShell>

      {canManageUsers && accessSection === "users" && (
        <PanelShell className="!p-3">
          <Flex vertical gap={12}>
            <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
              <Input.Search
                allowClear
                placeholder={t("admin.users.searchPlaceholder")}
                className="max-w-[420px]"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onSearch={loadAll}
              />
            </Flex>

            <Table
              rowKey="user_id"
              size="small"
              loading={loading}
              dataSource={users}
              sticky
              scroll={getAdminTableScroll(1370)}
              pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
              columns={[
                { title: "ID", dataIndex: "user_id", width: 90 },
                {
                  title: t("admin.users.user"),
                  width: 220,
                  render: (_, record: AdminUser) => record.username || record.tg_username || record.vk_username || `#${record.user_id}`,
                },
                {
                  title: "Telegram",
                  width: 160,
                  render: (_, record: AdminUser) => renderSocialAdminCell(
                    t,
                    "tg",
                    record.tg_username,
                    record.user_tg_id,
                    record.tg_visibility,
                  ),
                },
                {
                  title: "VK",
                  width: 160,
                  render: (_, record: AdminUser) => renderSocialAdminCell(
                    t,
                    "vk",
                    record.vk_username,
                    record.user_vk_id,
                    record.vk_visibility,
                  ),
                },
                {
                  title: t("admin.users.role"),
                  width: 190,
                  render: (_, record: AdminUser) => (
                    <Tooltip title={!canChangeUserRole(record) ? t("admin.users.roleChangeBlocked") : undefined}>
                      <Select
                        value={record.role_id}
                        className="w-full"
                        disabled={!canChangeUserRole(record)}
                        options={roles.map((role) => ({
                          value: role.role_id,
                          label: role.role_name,
                          disabled: !currentUserIsMaster && isMasterRole(role.role_id, role.role_name),
                        }))}
                        onChange={(roleId) => handleSetUserRole(record.user_id, roleId)}
                      />
                    </Tooltip>
                  ),
                },
                {
                  title: t("admin.users.active"),
                  width: 100,
                  render: (_, record: AdminUser) => (
                    <Switch checked={record.is_active === 1} onChange={(checked) => handleSetActive(record.user_id, checked)} />
                  ),
                },
                {
                  title: t("admin.users.access"),
                  width: 130,
                  render: (_, record: AdminUser) => (
                    record.is_active === 1 ? (
                      <Popconfirm
                        title={t("admin.reports.banUserTitle")}
                        okText={t("admin.users.ban")}
                        cancelText={t("admin.cancel")}
                        onConfirm={() => handleSetActive(record.user_id, false)}
                      >
                        <Button size="small" danger icon={<StopOutlined />}>{t("admin.users.ban")}</Button>
                      </Popconfirm>
                    ) : (
                      <Button size="small" icon={<UnlockOutlined />} onClick={() => handleSetActive(record.user_id, true)}>
                        {t("admin.users.unban")}
                      </Button>
                    )
                  ),
                },
                { title: t("admin.users.purchases"), dataIndex: "purchases_count", width: 100 },
                { title: t("admin.users.sales"), dataIndex: "sales_count", width: 100 },
                { title: t("admin.users.reportsReceived"), dataIndex: "reports_received", width: 130 },
                {
                  title: t("admin.users.sanctions"),
                  width: 120,
                  render: (_, record: AdminUser) => (
                    <Button size="small" onClick={() => openSanctions(record)}>{t("admin.users.history")}</Button>
                  ),
                },
                { title: t("admin.users.createdAt"), dataIndex: "created_at", render: (value: string | null) => formatDate(value, locale, emptyValue), width: 170 },
              ]}
            />
          </Flex>
        </PanelShell>
      )}

      {canManageRoles && accessSection === "roles" && (
        <PanelShell className="!p-3">
          <Flex vertical gap={12}>
            <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
              <Title level={5} className="!mb-0">{t("admin.users.rolesTitle")}</Title>
              <Text type="secondary" className="text-xs">{t("admin.users.records", { count: roles.length })}</Text>
            </Flex>

            <Table
              rowKey="role_id"
              size="small"
              dataSource={roles}
              pagination={false}
              sticky
              scroll={getAdminTableScroll(760, 280)}
              columns={[
                { title: "ID", dataIndex: "role_id", width: 80 },
                { title: t("admin.users.roleName"), dataIndex: "role_name" },
                { title: t("admin.users.description"), dataIndex: "description" },
                {
                  title: t("admin.users.permissions"),
                  dataIndex: "permissions",
                  render: (value: string[]) => <Text>{value?.length || 0}</Text>,
                  width: 120,
                },
                { title: t("admin.users.userCount"), dataIndex: "users_count", width: 130 },
                {
                  title: t("admin.users.actions"),
                  width: 210,
                  render: (_, record: AdminRole) => (
                    <Flex gap={8}>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        disabled={!currentUserIsMaster && isMasterRole(record.role_id, record.role_name)}
                        onClick={() => openRoleModal(record)}
                      >
                        {t("admin.users.edit")}
                      </Button>
                      <Popconfirm
                        title={t("admin.users.deleteRoleTitle")}
                        okText={t("admin.users.delete")}
                        cancelText={t("admin.cancel")}
                        onConfirm={() => handleDeleteRole(record.role_id)}
                      >
                        <Button
                          size="small"
                          danger
                          disabled={record.users_count > 0 || (!currentUserIsMaster && isMasterRole(record.role_id, record.role_name))}
                        >
                          {t("admin.users.delete")}
                        </Button>
                      </Popconfirm>
                    </Flex>
                  ),
                },
              ]}
            />
          </Flex>
        </PanelShell>
      )}

      <Modal
        open={roleModalOpen}
        title={editingRole ? t("admin.users.editRoleTitle") : t("admin.users.newRoleTitle")}
        onCancel={() => setRoleModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setRoleModalOpen(false)}>{t("admin.cancel")}</Button>,
          <Button key="save" type="primary" onClick={handleSaveRole}>{t("admin.save")}</Button>,
        ]}
      >
        <Form form={roleForm} layout="vertical" className="mt-4">
          <Form.Item name="role_name" label={t("admin.users.roleName")} rules={[{ required: true, message: t("admin.users.enterRoleName") }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t("admin.users.description")}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="permissions" label={t("admin.users.permissions")}>
            <Checkbox.Group
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              options={availablePermissions.map((permission) => ({
                value: permission.key,
                label: permission.label,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(sanctionUser)}
        title={sanctionUser ? t("admin.users.sanctionsHistoryFor", { user: sanctionUser.username || sanctionUser.user_id }) : t("admin.users.sanctionsHistory")}
        onCancel={() => setSanctionUser(null)}
        footer={[<Button key="close" onClick={() => setSanctionUser(null)}>{t("admin.reports.close")}</Button>]}
      >
        <Table
          rowKey="sanction_id"
          size="small"
          loading={sanctionsLoading}
          dataSource={sanctions}
          pagination={false}
          columns={[
            { title: t("admin.users.sanctionAction"), dataIndex: "action" },
            { title: t("admin.users.sanctionReason"), dataIndex: "reason" },
            { title: t("admin.users.sanctionModerator"), dataIndex: "moderator_id" },
            { title: t("admin.users.sanctionDate"), dataIndex: "created_at" },
          ]}
        />
      </Modal>
    </Flex>
  );
};

const AnalyticsPanel = ({ messageApi }: { messageApi: MessageApi }) => {
  const { t, i18n } = useTranslation();
  const locale = getAdminLocale(i18n.language);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsSection, setAnalyticsSection] = useState<AnalyticsSection>("reports");
  const [salesRangePreset, setSalesRangePreset] = useState<SalesRangePreset>("30");
  const [customSalesRange, setCustomSalesRange] = useState<[Dayjs, Dayjs]>(getDefaultSalesRange);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  const summaryParams = useMemo<AdminSummaryParams>(() => {
    const baseParams = {
      collectionId: selectedCollectionId,
      compare: true,
    };

    if (salesRangePreset === "custom") {
      return {
        ...baseParams,
        startDate: customSalesRange[0].format("YYYY-MM-DD"),
        endDate: customSalesRange[1].format("YYYY-MM-DD"),
      };
    }

    return { ...baseParams, days: Number(salesRangePreset) };
  }, [customSalesRange, salesRangePreset, selectedCollectionId]);

  const salesRangeLabel = useMemo(() => {
    if (salesRangePreset === "custom") {
      return `${customSalesRange[0].format("DD.MM.YYYY")} - ${customSalesRange[1].format("DD.MM.YYYY")}`;
    }

    return t("admin.dashboard.lastDays", { count: Number(salesRangePreset) });
  }, [customSalesRange, salesRangePreset, t]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await getAdminSummary(summaryParams));
    } catch {
      messageApi.error(t("admin.analytics.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [messageApi, summaryParams, t]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) return <Spin className="my-10" />;
  if (!summary) return <Empty description={t("admin.analytics.noData")} />;

  const selectedCollection = summary.collections.find((item) => item.id === selectedCollectionId);
  const comparison = summary.comparison;
  const volumeDelta = Number(comparison?.delta.volume || 0);
  const volumeDeltaLabel = volumeDelta >= 0
    ? `+${formatTonNumber(volumeDelta, locale)}`
    : formatTonNumber(volumeDelta, locale);
  const volumeDeltaPercentLabel = comparison?.delta.volume_percent === null || comparison?.delta.volume_percent === undefined
    ? null
    : `${comparison.delta.volume_percent >= 0 ? "+" : ""}${comparison.delta.volume_percent.toFixed(1)}%`;

  const handleExportCsv = () => {
    const periodLabel = salesRangePreset === "custom"
      ? `${summaryParams.startDate}_${summaryParams.endDate}`
      : `${salesRangePreset}d`;
    const collectionLabel = selectedCollection
      ? selectedCollection.name.replace(/[^a-z0-9_-]+/gi, "_")
      : "all_collections";
    const comparisonRows = comparison?.sales_by_day || [];
    downloadCsv(`moon_admin_analytics_${periodLabel}_${collectionLabel}.csv`, [
      [t("admin.dashboard.date"), t("admin.dashboard.deals"), t("admin.dashboard.volume"), t("admin.dashboard.previousDate"), t("admin.dashboard.previousDeals"), t("admin.dashboard.previousVolume")],
      ...summary.sales_by_day.map((item, index) => {
        const previous = comparisonRows[index];
        return [
          item.day,
          item.transactions,
          item.volume,
          previous?.previous_day || "",
          previous?.previous_transactions ?? "",
          previous?.previous_volume ?? "",
        ];
      }),
      [],
      [t("admin.dashboard.topCollectionsByVolume")],
      [t("admin.dashboard.collection"), t("admin.dashboard.deals"), t("admin.dashboard.volume")],
      ...summary.top_collections.map((item) => [item.collection_name, item.transactions, item.volume]),
    ]);
  };

  return (
    <Flex vertical gap={16}>
      <PanelShell className="!p-3">
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Flex vertical gap={2}>
            <Segmented
              value={analyticsSection}
              options={[
                { label: t("admin.analytics.reports"), value: "reports" },
                { label: t("admin.analytics.roles"), value: "roles" },
                { label: t("admin.analytics.sales"), value: "sales" },
                { label: t("admin.analytics.collections"), value: "collections" },
              ]}
              onChange={(value) => setAnalyticsSection(value as AnalyticsSection)}
            />
            <Text type="secondary" className="text-xs">
              {selectedCollection ? `${salesRangeLabel} / ${selectedCollection.name}` : salesRangeLabel}
            </Text>
          </Flex>
          <Flex gap={8} wrap="wrap" justify="flex-end">
            <Select
              allowClear
              showSearch
              value={selectedCollectionId ?? undefined}
              placeholder={t("admin.dashboard.allCollections")}
              optionFilterProp="label"
              className="min-w-[220px]"
              options={summary.collections.map((collection) => ({ value: collection.id, label: collection.name }))}
              onChange={(value) => setSelectedCollectionId(value ?? null)}
            />
            <Segmented
              value={salesRangePreset}
              options={[
                { label: t("admin.dashboard.days7"), value: "7" },
                { label: t("admin.dashboard.days14"), value: "14" },
                { label: t("admin.dashboard.days30"), value: "30" },
                { label: t("admin.dashboard.customRange"), value: "custom" },
              ]}
              onChange={(value) => setSalesRangePreset(value as SalesRangePreset)}
            />
            {salesRangePreset === "custom" && (
              <RangePicker
                allowClear={false}
                value={customSalesRange}
                disabledDate={(current) => Boolean(current?.isAfter(dayjs(), "day"))}
                onChange={(dates) => {
                  if (!dates?.[0] || !dates?.[1]) return;

                  if (dates[1].diff(dates[0], "day") > 89) {
                    messageApi.warning(t("admin.dashboard.rangeTooLong"));
                    return;
                  }

                  setCustomSalesRange([dates[0], dates[1]]);
                }}
              />
            )}
            <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
              {t("admin.dashboard.exportCsv")}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadSummary}>{t("admin.refresh")}</Button>
          </Flex>
        </Flex>
      </PanelShell>

      {analyticsSection === "reports" && (
        <PanelShell className="!p-3">
          <Title level={5} className="!mb-3">{t("admin.analytics.complaintStatuses")}</Title>
          <Table
            rowKey="status"
            size="small"
            pagination={false}
            sticky
            scroll={getAdminTableScroll(undefined, 280)}
            dataSource={summary.reports_by_status}
            columns={[
              {
                title: t("admin.analytics.status"),
                dataIndex: "status",
                render: (value: string) => getStatusLabel(t, value),
              },
              { title: t("admin.analytics.count"), dataIndex: "count", width: 140 },
            ]}
          />
        </PanelShell>
      )}

      {analyticsSection === "roles" && (
        <PanelShell className="!p-3">
          <Title level={5} className="!mb-3">{t("admin.analytics.usersByRole")}</Title>
          <Table
            rowKey="role"
            size="small"
            pagination={false}
            sticky
            scroll={getAdminTableScroll(undefined, 280)}
            dataSource={summary.users_by_role}
            columns={[
              { title: t("admin.analytics.role"), dataIndex: "role" },
              { title: t("admin.analytics.count"), dataIndex: "count", width: 140 },
            ]}
          />
        </PanelShell>
      )}

      {analyticsSection === "sales" && (
        <Flex vertical gap={12}>
          {comparison && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <PanelShell className="!p-3">
                <Text type="secondary" className="block text-xs">{t("admin.dashboard.currentPeriod")}</Text>
                <Title level={4} className="!mb-0">{formatTonNumber(comparison.current.volume, locale)} TON</Title>
                <Text type="secondary" className="text-xs">{comparison.current.start_date} - {comparison.current.end_date}</Text>
              </PanelShell>
              <PanelShell className="!p-3">
                <Text type="secondary" className="block text-xs">{t("admin.dashboard.previousPeriod")}</Text>
                <Title level={4} className="!mb-0">{formatTonNumber(comparison.previous.volume, locale)} TON</Title>
                <Text type="secondary" className="text-xs">{comparison.previous.start_date} - {comparison.previous.end_date}</Text>
              </PanelShell>
              <PanelShell className="!p-3">
                <Text type="secondary" className="block text-xs">{t("admin.dashboard.periodChange")}</Text>
                <Title level={4} className={`!mb-0 ${volumeDelta >= 0 ? "!text-[var(--green-accept)]" : "!text-[var(--red-fail)]"}`}>
                  {volumeDeltaLabel} TON
                </Title>
                <Text type="secondary" className="text-xs">{volumeDeltaPercentLabel || t("admin.dashboard.noPreviousVolume")}</Text>
              </PanelShell>
            </div>
          )}
          {comparison ? (
            <ComparisonVolumeChart data={comparison.sales_by_day} />
          ) : (
            <VerticalBarChart data={summary.sales_by_day} />
          )}
          <PanelShell className="!p-3">
            <Title level={5} className="!mb-3">{t("admin.analytics.dailyDeals")}</Title>
            <Table
              rowKey="day"
              size="small"
              pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
              sticky
              scroll={getAdminTableScroll(undefined, 360)}
              dataSource={summary.sales_by_day}
              columns={[
                { title: t("admin.dashboard.date"), dataIndex: "day" },
                { title: t("admin.analytics.deals"), dataIndex: "transactions", width: 100 },
                { title: t("admin.analytics.volume"), dataIndex: "volume", render: (value: string) => formatTonNumber(value, locale), width: 120 },
              ]}
            />
          </PanelShell>
        </Flex>
      )}

      {analyticsSection === "collections" && (
        <PanelShell className="!p-3">
          <Title level={5} className="!mb-3">{t("admin.analytics.collectionsBySales")}</Title>
          <Table
            rowKey="collection_name"
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
            sticky
            scroll={getAdminTableScroll(undefined, 360)}
            dataSource={summary.top_collections}
            columns={[
              { title: t("admin.analytics.collection"), dataIndex: "collection_name" },
              { title: t("admin.analytics.deals"), dataIndex: "transactions", width: 100 },
              { title: t("admin.analytics.volume"), dataIndex: "volume", render: (value: string) => formatTonNumber(value, locale), width: 120 },
            ]}
          />
        </PanelShell>
      )}
    </Flex>
  );
};

export default AdminView;
