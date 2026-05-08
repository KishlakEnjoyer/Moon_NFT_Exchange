import {
  Button,
  DatePicker,
  Empty,
  Flex,
  FloatButton,
  Form,
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
  Typography,
  message,
} from "antd";
import {
  BarChartOutlined,
  CheckOutlined,
  CloseOutlined,
  DatabaseOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  TeamOutlined,
  UnlockOutlined,
  UpOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Content } from "antd/es/layout/layout";
import Title from "antd/es/typography/Title";

import useDocumentTitle from "../hooks/useDocumentTitle";
import {
  AdminAccess,
  AdminReport,
  AdminRole,
  AdminSummary,
  AdminSummaryParams,
  AdminUser,
  DictionaryItem,
  DictionaryItemPayload,
  DictionaryKind,
  ReportStatusFilter,
  createAdminRole,
  createDictionaryItem,
  decideAdminReport,
  deleteAdminRole,
  getAdminAccess,
  getAdminReports,
  getAdminRoles,
  getAdminSummary,
  getAdminUsers,
  getDictionaryItems,
  sendAdminReportWarning,
  setAdminUserActive,
  setAdminUserRole,
  setDictionaryItemArchived,
  updateAdminRole,
  updateDictionaryItem,
} from "../services/adminService";

const { Text } = Typography;
const { RangePicker } = DatePicker;

type MessageApi = ReturnType<typeof message.useMessage>[0];
type SalesRangePreset = "7" | "14" | "30" | "custom";
type DashboardSection = "overview" | "charts" | "tables";
type AccessSection = "users" | "roles";
type AnalyticsSection = "reports" | "roles" | "sales" | "collections";

const dictionaryKinds: DictionaryKind[] = ["collections", "models", "backgrounds", "symbols"];

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
  dayjs().subtract(6, "day"),
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

const PanelShell = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-lg border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-3 sm:p-5 ${className}`.trim()}>
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

    if (access?.can_admin) {
      items.splice(
        2,
        0,
        {
          key: "dictionaries",
          label: t("admin.tabs.dictionaries"),
          icon: <DatabaseOutlined />,
          children: <DictionariesPanel messageApi={messageApi} />,
        },
        {
          key: "users",
          label: t("admin.tabs.usersRoles"),
          icon: <TeamOutlined />,
          children: <UsersAndRolesPanel messageApi={messageApi} />,
        },
      );
    }

    return items;
  }, [access?.can_admin, messageApi, t]);

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
  const [salesRangePreset, setSalesRangePreset] = useState<SalesRangePreset>("14");
  const [customSalesRange, setCustomSalesRange] = useState<[Dayjs, Dayjs]>(getDefaultSalesRange);
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>("overview");

  const summaryParams = useMemo<AdminSummaryParams>(() => {
    if (salesRangePreset === "custom") {
      return {
        startDate: customSalesRange[0].format("YYYY-MM-DD"),
        endDate: customSalesRange[1].format("YYYY-MM-DD"),
      };
    }

    return { days: Number(salesRangePreset) };
  }, [customSalesRange, salesRangePreset]);

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
            <Text type="secondary" className="text-xs">{salesRangeLabel}</Text>
          </Flex>
          <Flex gap={8} wrap="wrap" justify="flex-end">
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
            <Button icon={<ReloadOutlined />} onClick={loadSummary}>{t("admin.refresh")}</Button>
          </Flex>
        </Flex>
      </PanelShell>

      {dashboardSection === "overview" && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <StatusChart data={summary.reports_by_status} />
          <HorizontalBarChart data={summary.top_collections} />
        </div>
      )}

      {dashboardSection === "charts" && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <VerticalBarChart data={summary.sales_by_day} />
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
            scroll={{ x: 1040 }}
            columns={[
              { title: "ID", dataIndex: "report_id", width: 80 },
              {
                title: t("admin.reports.sender"),
                render: (_, record: AdminReport) => record.sender_username || `#${record.sender_id}`,
              },
              {
                title: t("admin.reports.receiver"),
                render: (_, record: AdminReport) => (
                  <Flex vertical gap={4}>
                    <Text>{record.receiver_username || `#${record.receiver_id}`}</Text>
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
                render: (_, record: AdminReport) => record.moderator_username || emptyValue,
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
                <Text strong>{selectedReport.sender_username || `#${selectedReport.sender_id}`}</Text>
              </Flex>
            </div>
            <div className="rounded-lg border border-[var(--black-transparent)] p-3">
              <Flex vertical gap={8}>
                <Text type="secondary">{t("admin.reports.target")}</Text>
                <Flex align="center" gap={8} wrap="wrap">
                  <Text strong>{selectedReport.receiver_username || `#${selectedReport.receiver_id}`}</Text>
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
    form.resetFields();
    form.setFieldsValue({
      collection_limit: 100,
      base_price: 100,
    });
    setModalOpen(true);
  };

  const openEdit = (item: DictionaryItem) => {
    setEditingItem(item);
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
    setSaving(true);
    try {
      if (editingItem) {
        await updateDictionaryItem(kind, editingItem.id, values);
        messageApi.success(t("admin.dictionaries.updated"));
      } else {
        await createDictionaryItem(kind, values);
        messageApi.success(t("admin.dictionaries.created"));
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
    } catch {
      messageApi.error(t("admin.dictionaries.archiveFailed"));
    }
  };

  return (
    <PanelShell>
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Segmented<DictionaryKind>
            value={kind}
            onChange={setKind}
            options={dictionaryKinds.map((value) => ({ value, label: getDictionaryLabel(t, value) }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("admin.dictionaries.add")}
          </Button>
        </Flex>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          scroll={{ x: 820 }}
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
                : <Tag>{t("admin.status.archive")}</Tag>,
            },
            {
              title: t("admin.dictionaries.actions"),
              fixed: "right",
              width: 230,
              render: (_, record: DictionaryItem) => (
                <Flex gap={8}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                    {t("admin.dictionaries.edit")}
                  </Button>
                  {record.is_active === 1 ? (
                    <Button size="small" danger onClick={() => handleArchive(record, true)}>
                      {t("admin.dictionaries.archive")}
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

          <Form.Item name="image_url" label={t("admin.dictionaries.imageNameOrUrl")}>
            <Input />
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

const UsersAndRolesPanel = ({ messageApi }: { messageApi: MessageApi }) => {
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
  const [roleForm] = Form.useForm<{ role_name: string; description: string | null }>();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedUsers, loadedRoles] = await Promise.all([
        getAdminUsers(search),
        getAdminRoles(),
      ]);
      setUsers(loadedUsers);
      setRoles(loadedRoles);
    } catch {
      messageApi.error(t("admin.users.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [messageApi, search, t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openRoleModal = (role: AdminRole | null) => {
    setEditingRole(role);
    roleForm.setFieldsValue({
      role_name: role?.role_name || "",
      description: role?.description || "",
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

  return (
    <Flex vertical gap={16}>
      <PanelShell className="!p-3">
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Segmented
            value={accessSection}
            options={[
              { label: t("admin.users.users"), value: "users" },
              { label: t("admin.users.roles"), value: "roles" },
            ]}
            onChange={(value) => setAccessSection(value as AccessSection)}
          />
          <Flex gap={8} wrap="wrap" justify="flex-end">
            {accessSection === "roles" && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openRoleModal(null)}>
                {t("admin.users.createRole")}
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={loadAll}>{t("admin.refresh")}</Button>
          </Flex>
        </Flex>
      </PanelShell>

      {accessSection === "users" && (
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
              scroll={{ x: 1370 }}
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
                    <Select
                      value={record.role_id}
                      className="w-full"
                      options={roles.map((role) => ({ value: role.role_id, label: role.role_name }))}
                      onChange={(roleId) => handleSetUserRole(record.user_id, roleId)}
                    />
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
                { title: t("admin.users.createdAt"), dataIndex: "created_at", render: (value: string | null) => formatDate(value, locale, emptyValue), width: 170 },
              ]}
            />
          </Flex>
        </PanelShell>
      )}

      {accessSection === "roles" && (
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
              columns={[
                { title: "ID", dataIndex: "role_id", width: 80 },
                { title: t("admin.users.roleName"), dataIndex: "role_name" },
                { title: t("admin.users.description"), dataIndex: "description" },
                { title: t("admin.users.userCount"), dataIndex: "users_count", width: 130 },
                {
                  title: t("admin.users.actions"),
                  width: 210,
                  render: (_, record: AdminRole) => (
                    <Flex gap={8}>
                      <Button size="small" icon={<EditOutlined />} onClick={() => openRoleModal(record)}>
                        {t("admin.users.edit")}
                      </Button>
                      <Popconfirm
                        title={t("admin.users.deleteRoleTitle")}
                        okText={t("admin.users.delete")}
                        cancelText={t("admin.cancel")}
                        onConfirm={() => handleDeleteRole(record.role_id)}
                      >
                        <Button size="small" danger disabled={record.users_count > 0}>
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
        </Form>
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

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await getAdminSummary());
    } catch {
      messageApi.error(t("admin.analytics.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [messageApi, t]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) return <Spin className="my-10" />;
  if (!summary) return <Empty description={t("admin.analytics.noData")} />;

  return (
    <Flex vertical gap={16}>
      <PanelShell className="!p-3">
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
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
          <Button icon={<ReloadOutlined />} onClick={loadSummary}>{t("admin.refresh")}</Button>
        </Flex>
      </PanelShell>

      {analyticsSection === "reports" && (
        <PanelShell className="!p-3">
          <Title level={5} className="!mb-3">{t("admin.analytics.complaintStatuses")}</Title>
          <Table
            rowKey="status"
            size="small"
            pagination={false}
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
            dataSource={summary.users_by_role}
            columns={[
              { title: t("admin.analytics.role"), dataIndex: "role" },
              { title: t("admin.analytics.count"), dataIndex: "count", width: 140 },
            ]}
          />
        </PanelShell>
      )}

      {analyticsSection === "sales" && (
        <PanelShell className="!p-3">
          <Title level={5} className="!mb-3">{t("admin.analytics.dailyDeals")}</Title>
          <Table
            rowKey="day"
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
            dataSource={summary.sales_by_day}
            columns={[
              { title: t("admin.dashboard.date"), dataIndex: "day" },
              { title: t("admin.analytics.deals"), dataIndex: "transactions", width: 100 },
              { title: t("admin.analytics.volume"), dataIndex: "volume", render: (value: string) => formatTonNumber(value, locale), width: 120 },
            ]}
          />
        </PanelShell>
      )}

      {analyticsSection === "collections" && (
        <PanelShell className="!p-3">
          <Title level={5} className="!mb-3">{t("admin.analytics.collectionsBySales")}</Title>
          <Table
            rowKey="collection_name"
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
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
