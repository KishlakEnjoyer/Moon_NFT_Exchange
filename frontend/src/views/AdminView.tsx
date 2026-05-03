import {
  Button,
  DatePicker,
  Empty,
  Flex,
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
  Statistic,
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
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { Content } from "antd/es/layout/layout";
import Title from "antd/es/typography/Title";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  setAdminUserActive,
  setAdminUserRole,
  setDictionaryItemArchived,
  updateAdminRole,
  updateDictionaryItem,
} from "../services/adminService";

const { Text } = Typography;
const { RangePicker } = DatePicker;

type SalesRangePreset = "7" | "14" | "30" | "custom";

const getDefaultSalesRange = (): [Dayjs, Dayjs] => [
  dayjs().subtract(6, "day"),
  dayjs(),
];

const dictionaryLabels: Record<DictionaryKind, string> = {
  collections: "Коллекции",
  models: "Модели",
  backgrounds: "Фоны",
  symbols: "Символы",
};

const statusLabels: Record<string, string> = {
  pending: "Ожидает",
  approved: "Одобрена",
  rejected: "Отклонена",
  new: "Новая",
  open: "Открыта",
  "Awaiting review": "Ожидает",
  "awaiting review": "Ожидает",
};

const statusColors: Record<string, string> = {
  pending: "blue",
  approved: "green",
  rejected: "red",
  new: "blue",
  open: "blue",
  "Awaiting review": "blue",
  "awaiting review": "blue",
};

const formatTonNumber = (value: string | number) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0,00";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU");
};

const renderSocialAdminCell = (
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
    return <Tag>Не подключён</Tag>;
  }

  return (
    <Flex vertical gap={4}>
      <Text className="whitespace-nowrap">{displayName}</Text>
      <Tag color={Number(visibility) === 1 ? "green" : "default"} className="w-fit">
        {Number(visibility) === 1 ? "Виден" : "Скрыт"}
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
  const values = data.map((item) => Number(item.volume));
  const max = Math.max(1, ...values);
  const chartHeight = 176;

  return (
    <PanelShell className="h-full">
      <Title level={4} className="!mb-4">Оборот по дням</Title>
      <div className="overflow-x-auto">
        <div
          className="grid h-56 min-w-[560px] gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(88px, 1fr))` }}
        >
          {data.map((item) => {
            const value = Number(item.volume);
            const height = Math.max(8, Math.round((value / max) * chartHeight));
            const day = new Date(item.day).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

            return (
              <div key={item.day} className="grid grid-rows-[1fr_20px]">
                <div className="relative h-full">
                  <Text
                    className="absolute left-1/2 block -translate-x-1/2 whitespace-nowrap text-xs leading-4 tabular-nums"
                    style={{ bottom: height + 8 }}
                  >
                    {formatTonNumber(value)}
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
  const values = data.map((item) => Number(item.volume));
  const max = Math.max(1, ...values);

  return (
    <PanelShell className="h-full">
      <Title level={4} className="!mb-4">Коллекции по обороту</Title>
      <Flex vertical gap={14}>
        {data.length === 0 && <Empty description="Пока нет продаж" />}
        {data.map((item) => {
          const value = Number(item.volume);
          const width = Math.max(4, Math.round((value / max) * 100));

          return (
            <div key={item.collection_name}>
              <div className="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-3">
                <Text className="truncate leading-5">{item.collection_name}</Text>
                <Text className="block whitespace-nowrap text-right leading-5 tabular-nums">{formatTonNumber(value)} TON</Text>
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
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <PanelShell>
      <Title level={4}>Жалобы по статусам</Title>
      <Flex vertical gap={10}>
        {data.length === 0 && <Empty description="Жалоб пока нет" />}
        {data.map((item) => {
          const percent = total ? Math.round((item.count / total) * 100) : 0;

          return (
            <div key={item.status}>
              <Flex justify="space-between">
                <Text>{statusLabels[item.status] || item.status}</Text>
                <Text>{item.count} · {percent}%</Text>
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
  useDocumentTitle("Moon Exchange - Admin");
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
        label: "Дашборд",
        icon: <BarChartOutlined />,
        children: <DashboardPanel messageApi={messageApi} />,
      },
      {
        key: "reports",
        label: "Жалобы",
        icon: <SafetyCertificateOutlined />,
        children: <ReportsPanel messageApi={messageApi} canAdmin={Boolean(access?.can_admin)} />,
      },
      {
        key: "analytics",
        label: "Аналитика",
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
          label: "Справочники",
          icon: <DatabaseOutlined />,
          children: <DictionariesPanel messageApi={messageApi} />,
        },
        {
          key: "users",
          label: "Роли и доступ",
          icon: <TeamOutlined />,
          children: <UsersAndRolesPanel messageApi={messageApi} />,
        },
      );
    }

    return items;
  }, [access?.can_admin, messageApi]);

  if (loading) {
    return <Spin size="large" className="my-20" />;
  }

  if (!access?.can_moderate) {
    return (
      <Layout className="min-h-screen">
        <Content className="px-3 py-10 sm:px-4 lg:px-[var(--size-4xl)]">
          <Result
            status="403"
            title="Нет доступа"
            subTitle="Админ-панель доступна только менеджеру или администратору."
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
            <Title level={2} className="!mb-1">Админ-панель</Title>
            <Text type="secondary">Роль: {access.role_name || `#${access.role_id}`}</Text>
          </div>
        </Flex>

        <Tabs items={tabItems} />
      </Content>
    </Layout>
  );
};

const DashboardPanel = ({ messageApi }: { messageApi: ReturnType<typeof message.useMessage>[0] }) => {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesRangePreset, setSalesRangePreset] = useState<SalesRangePreset>("14");
  const [customSalesRange, setCustomSalesRange] = useState<[Dayjs, Dayjs]>(getDefaultSalesRange);

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

    return `Последние ${salesRangePreset} дней`;
  }, [customSalesRange, salesRangePreset]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await getAdminSummary(summaryParams));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось загрузить статистику");
    } finally {
      setLoading(false);
    }
  }, [messageApi, summaryParams]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) return <Spin className="my-10" />;
  if (!summary) return <Empty description="Статистика пока недоступна" />;

  const stats = [
    ["Пользователи", summary.cards.users_total],
    ["Активные пользователи", summary.cards.users_active],
    ["Транзакции", summary.cards.transactions_total],
    ["Оборот TON", formatTonNumber(summary.cards.sales_volume)],
    ["Комиссия TON", formatTonNumber(summary.cards.platform_fee)],
    ["Активные лоты", summary.cards.active_listings],
    ["Жалобы в очереди", summary.cards.pending_reports],
  ];

  return (
    <Flex vertical gap={16}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <PanelShell key={label}>
            <Statistic title={label} value={value} />
          </PanelShell>
        ))}
      </div>

      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <Flex vertical gap={2}>
          <Text strong>Период оборота</Text>
          <Text type="secondary" className="text-xs">{salesRangeLabel}</Text>
        </Flex>
        <Flex gap={8} wrap="wrap" justify="flex-end">
          <Segmented
            value={salesRangePreset}
            options={[
              { label: "7 дней", value: "7" },
              { label: "14 дней", value: "14" },
              { label: "30 дней", value: "30" },
              { label: "Диапазон", value: "custom" },
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
                  messageApi.warning("Диапазон не должен быть больше 90 дней");
                  return;
                }

                setCustomSalesRange([dates[0], dates[1]]);
              }}
            />
          )}
          <Button icon={<ReloadOutlined />} onClick={loadSummary}>Обновить</Button>
        </Flex>
      </Flex>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <VerticalBarChart data={summary.sales_by_day} />
        </div>
        <HorizontalBarChart data={summary.top_collections} />
      </div>

      <StatusChart data={summary.reports_by_status} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PanelShell>
          <Title level={4}>Топ коллекций по обороту</Title>
          <Table
            rowKey="collection_name"
            size="small"
            pagination={false}
            dataSource={summary.top_collections}
            columns={[
              { title: "Коллекция", dataIndex: "collection_name" },
              { title: "Сделки", dataIndex: "transactions", width: 100 },
              { title: "Оборот", dataIndex: "volume", render: formatTonNumber, width: 120 },
            ]}
          />
        </PanelShell>

        <PanelShell>
          <Title level={4}>Продажи за период</Title>
          <Table
            rowKey="day"
            size="small"
            pagination={false}
            dataSource={summary.sales_by_day}
            columns={[
              { title: "Дата", dataIndex: "day" },
              { title: "Сделки", dataIndex: "transactions", width: 100 },
              { title: "Оборот", dataIndex: "volume", render: formatTonNumber, width: 120 },
            ]}
          />
        </PanelShell>
      </div>
    </Flex>
  );
};

const ReportsPanel = ({
  messageApi,
  canAdmin,
}: {
  messageApi: ReturnType<typeof message.useMessage>[0];
  canAdmin: boolean;
}) => {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [status, setStatus] = useState<ReportStatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [userProcessingId, setUserProcessingId] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await getAdminReports(status));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось загрузить жалобы");
    } finally {
      setLoading(false);
    }
  }, [messageApi, status]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDecision = async (reportId: number, decision: "approve" | "reject") => {
    setProcessingId(reportId);
    try {
      await decideAdminReport(reportId, decision);
      messageApi.success(decision === "approve" ? "Жалоба одобрена" : "Жалоба отклонена");
      await loadReports();
      setSelectedReport(null);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось обработать жалобу");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUserActive = async (userId: number, isActive: number) => {
    setUserProcessingId(userId);
    try {
      await setAdminUserActive(userId, isActive);
      messageApi.success(isActive ? "Пользователь разбанен" : "Пользователь забанен");
      await loadReports();
      setSelectedReport((current) => {
        if (!current || current.receiver_id !== userId) return current;
        return { ...current, receiver_is_active: isActive };
      });
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось изменить статус пользователя");
    } finally {
      setUserProcessingId(null);
    }
  };

  return (
    <>
    <PanelShell>
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Segmented<ReportStatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { label: "Ожидают", value: "pending" },
              { label: "Одобрены", value: "approved" },
              { label: "Отклонены", value: "rejected" },
              { label: "Все", value: "all" },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={loadReports}>Обновить</Button>
        </Flex>

        <Table
          rowKey="report_id"
          loading={loading}
          dataSource={reports}
          scroll={{ x: 1040 }}
          columns={[
            { title: "ID", dataIndex: "report_id", width: 80 },
            {
              title: "Отправитель",
              render: (_, record: AdminReport) => record.sender_username || `#${record.sender_id}`,
            },
            {
              title: "На кого",
              render: (_, record: AdminReport) => (
                <Flex vertical gap={4}>
                  <Text>{record.receiver_username || `#${record.receiver_id}`}</Text>
                  {record.receiver_is_active === 0 ? (
                    <Tag color="red" className="w-fit">Забанен</Tag>
                  ) : (
                    <Tag color="green" className="w-fit">Активен</Tag>
                  )}
                </Flex>
              ),
            },
            { title: "Причина", dataIndex: "report_type_title" },
            {
              title: "Статус",
              dataIndex: "report_status_name",
              width: 130,
              render: (value: string) => (
                <Tag color={statusColors[value] || "default"}>
                  {statusLabels[value] || value}
                </Tag>
              ),
            },
            { title: "Создана", dataIndex: "created_at", render: formatDate, width: 170 },
            {
              title: "Модератор",
              render: (_, record: AdminReport) => record.moderator_username || "—",
            },
            {
              title: "Решение",
              fixed: "right",
              width: 260,
              render: (_, record: AdminReport) => (
                <Flex gap={8} wrap="wrap">
                  <Button
                    size="small"
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => setSelectedReport(record)}
                  >
                    Рассмотреть
                  </Button>
                  {canAdmin && (
                    record.receiver_is_active === 0 ? (
                      <Button
                        size="small"
                        icon={<UnlockOutlined />}
                        loading={userProcessingId === record.receiver_id}
                        onClick={() => handleUserActive(record.receiver_id, 1)}
                      >
                        Разбан
                      </Button>
                    ) : (
                      <Popconfirm
                        title="Забанить пользователя?"
                        description="Пользователь не сможет пользоваться системой до разбана."
                        okText="Забанить"
                        cancelText="Отмена"
                        onConfirm={() => handleUserActive(record.receiver_id, 0)}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<StopOutlined />}
                          loading={userProcessingId === record.receiver_id}
                        >
                          Бан
                        </Button>
                      </Popconfirm>
                    )
                  )}
                </Flex>
              ),
            },
          ]}
        />
      </Flex>
    </PanelShell>

    <Modal
      open={Boolean(selectedReport)}
      title="Рассмотрение жалобы"
      onCancel={() => setSelectedReport(null)}
      footer={[
        <Button key="cancel" onClick={() => setSelectedReport(null)}>Закрыть</Button>,
        <Button
          key="reject"
          danger
          icon={<CloseOutlined />}
          loading={selectedReport ? processingId === selectedReport.report_id : false}
          onClick={() => selectedReport && handleDecision(selectedReport.report_id, "reject")}
        >
          Отклонить
        </Button>,
        <Button
          key="approve"
          type="primary"
          icon={<CheckOutlined />}
          loading={selectedReport ? processingId === selectedReport.report_id : false}
          onClick={() => selectedReport && handleDecision(selectedReport.report_id, "approve")}
        >
          Принять жалобу
        </Button>,
      ]}
    >
      {selectedReport && (
        <Flex vertical gap={14} className="mt-3">
          <div className="rounded-lg border border-[var(--black-transparent)] p-3">
            <Flex vertical gap={8}>
              <Text type="secondary">Кто пожаловался</Text>
              <Text strong>{selectedReport.sender_username || `#${selectedReport.sender_id}`}</Text>
            </Flex>
          </div>
          <div className="rounded-lg border border-[var(--black-transparent)] p-3">
            <Flex vertical gap={8}>
              <Text type="secondary">На кого жалоба</Text>
              <Flex align="center" gap={8} wrap="wrap">
                <Text strong>{selectedReport.receiver_username || `#${selectedReport.receiver_id}`}</Text>
                {selectedReport.receiver_is_active === 0 ? <Tag color="red">Забанен</Tag> : <Tag color="green">Активен</Tag>}
              </Flex>
            </Flex>
          </div>
          <div className="rounded-lg border border-[var(--black-transparent)] p-3">
            <Flex vertical gap={8}>
              <Text type="secondary">Причина</Text>
              <Text>{selectedReport.report_type_title || "Не указана"}</Text>
            </Flex>
          </div>
          {canAdmin && (
            <Flex justify="flex-end" gap={8} wrap="wrap">
              {selectedReport.receiver_is_active === 0 ? (
                <Button
                  icon={<UnlockOutlined />}
                  loading={userProcessingId === selectedReport.receiver_id}
                  onClick={() => handleUserActive(selectedReport.receiver_id, 1)}
                >
                  Разбанить пользователя
                </Button>
              ) : (
                <Popconfirm
                  title="Забанить пользователя?"
                  description="Пользователь не сможет пользоваться системой до разбана."
                  okText="Забанить"
                  cancelText="Отмена"
                  onConfirm={() => handleUserActive(selectedReport.receiver_id, 0)}
                >
                  <Button
                    danger
                    icon={<StopOutlined />}
                    loading={userProcessingId === selectedReport.receiver_id}
                  >
                    Забанить пользователя
                  </Button>
                </Popconfirm>
              )}
            </Flex>
          )}
        </Flex>
      )}
    </Modal>
    </>
  );
};

const DictionariesPanel = ({ messageApi }: { messageApi: ReturnType<typeof message.useMessage>[0] }) => {
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
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось загрузить справочник");
    } finally {
      setLoading(false);
    }
  }, [kind, messageApi]);

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
        messageApi.success("Запись обновлена");
      } else {
        await createDictionaryItem(kind, values);
        messageApi.success("Запись создана");
      }
      setModalOpen(false);
      await loadItems();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось сохранить запись");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (item: DictionaryItem, archived: boolean) => {
    try {
      await setDictionaryItemArchived(kind, item.id, archived);
      messageApi.success(archived ? "Запись архивирована" : "Запись восстановлена");
      await loadItems();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось изменить архивность");
    }
  };

  return (
    <PanelShell>
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Segmented<DictionaryKind>
            value={kind}
            onChange={setKind}
            options={Object.entries(dictionaryLabels).map(([value, label]) => ({ value: value as DictionaryKind, label }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Добавить
          </Button>
        </Flex>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          scroll={{ x: 820 }}
          columns={[
            { title: "Название", dataIndex: "name" },
            ...(kind === "models" ? [{ title: "Коллекция", dataIndex: "collection_name" }] : []),
            ...(kind === "collections" ? [
              { title: "Лимит", dataIndex: "collection_limit", width: 100 },
              { title: "Цена", dataIndex: "base_price", width: 100 },
            ] : []),
            {
              title: "Статус",
              dataIndex: "is_active",
              width: 120,
              render: (value: number) => value === 1 ? <Tag color="green">Активно</Tag> : <Tag>Архив</Tag>,
            },
            {
              title: "Действия",
              fixed: "right",
              width: 230,
              render: (_, record: DictionaryItem) => (
                <Flex gap={8}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                    Изменить
                  </Button>
                  {record.is_active === 1 ? (
                    <Button size="small" danger onClick={() => handleArchive(record, true)}>
                      Архив
                    </Button>
                  ) : (
                    <Button size="small" onClick={() => handleArchive(record, false)}>
                      Вернуть
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
        title={editingItem ? "Редактирование записи" : "Новая запись"}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Отмена</Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSave}>Сохранить</Button>,
        ]}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Название" rules={[{ required: true, message: "Введите название" }]}>
            <Input />
          </Form.Item>

          <Form.Item name="image_url" label="Имя файла изображения или ссылка">
            <Input />
          </Form.Item>

          {kind === "models" && (
            <Form.Item name="collection_id" label="Коллекция" rules={[{ required: true, message: "Выберите коллекцию" }]}>
              <Select
                options={collections.map((collection) => ({ value: collection.id, label: collection.name }))}
              />
            </Form.Item>
          )}

          {kind === "collections" && (
            <>
              <Form.Item name="collection_limit" label="Лимит выпуска" rules={[{ required: true, message: "Введите лимит" }]}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
              <Form.Item name="purchase_limit" label="Лимит покупок на пользователя">
                <InputNumber min={1} className="w-full" />
              </Form.Item>
              <Form.Item name="base_price" label="Базовая цена TON" rules={[{ required: true, message: "Введите цену" }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </PanelShell>
  );
};

const UsersAndRolesPanel = ({ messageApi }: { messageApi: ReturnType<typeof message.useMessage>[0] }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
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
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось загрузить доступы");
    } finally {
      setLoading(false);
    }
  }, [messageApi, search]);

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
        messageApi.success("Роль обновлена");
      } else {
        await createAdminRole(values);
        messageApi.success("Роль создана");
      }
      setRoleModalOpen(false);
      await loadAll();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось сохранить роль");
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    try {
      await deleteAdminRole(roleId);
      messageApi.success("Роль удалена");
      await loadAll();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось удалить роль");
    }
  };

  const handleSetUserRole = async (userId: number, roleId: number) => {
    try {
      await setAdminUserRole(userId, roleId);
      messageApi.success("Роль пользователя изменена");
      await loadAll();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось изменить роль");
    }
  };

  const handleSetActive = async (userId: number, checked: boolean) => {
    try {
      await setAdminUserActive(userId, checked ? 1 : 0);
      messageApi.success("Статус пользователя изменен");
      await loadAll();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось изменить статус");
    }
  };

  return (
    <Flex vertical gap={16}>
      <PanelShell>
        <Flex vertical gap={16}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            <Input.Search
              allowClear
              placeholder="Поиск по username, Telegram или VK"
              className="max-w-[420px]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onSearch={loadAll}
            />
            <Button icon={<ReloadOutlined />} onClick={loadAll}>Обновить</Button>
          </Flex>

          <Table
            rowKey="user_id"
            loading={loading}
            dataSource={users}
            scroll={{ x: 1370 }}
            columns={[
              { title: "ID", dataIndex: "user_id", width: 90 },
              {
                title: "Пользователь",
                width: 220,
                render: (_, record: AdminUser) => record.username || record.tg_username || record.vk_username || `#${record.user_id}`,
              },
              {
                title: "Telegram",
                width: 160,
                render: (_, record: AdminUser) => renderSocialAdminCell(
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
                  "vk",
                  record.vk_username,
                  record.user_vk_id,
                  record.vk_visibility,
                ),
              },
              {
                title: "Роль",
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
                title: "Активен",
                width: 100,
                render: (_, record: AdminUser) => (
                  <Switch checked={record.is_active === 1} onChange={(checked) => handleSetActive(record.user_id, checked)} />
                ),
              },
              {
                title: "Доступ",
                width: 130,
                render: (_, record: AdminUser) => (
                  record.is_active === 1 ? (
                    <Popconfirm
                      title="Забанить пользователя?"
                      okText="Забанить"
                      cancelText="Отмена"
                      onConfirm={() => handleSetActive(record.user_id, false)}
                    >
                      <Button size="small" danger icon={<StopOutlined />}>Бан</Button>
                    </Popconfirm>
                  ) : (
                    <Button size="small" icon={<UnlockOutlined />} onClick={() => handleSetActive(record.user_id, true)}>
                      Разбан
                    </Button>
                  )
                ),
              },
              { title: "Покупки", dataIndex: "purchases_count", width: 100 },
              { title: "Продажи", dataIndex: "sales_count", width: 100 },
              { title: "Жалоб получил", dataIndex: "reports_received", width: 130 },
              { title: "Создан", dataIndex: "created_at", render: formatDate, width: 170 },
            ]}
          />
        </Flex>
      </PanelShell>

      <PanelShell>
        <Flex vertical gap={16}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            <Title level={4} className="!mb-0">Роли</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openRoleModal(null)}>
              Создать роль
            </Button>
          </Flex>

          <Table
            rowKey="role_id"
            size="small"
            dataSource={roles}
            pagination={false}
            columns={[
              { title: "ID", dataIndex: "role_id", width: 80 },
              { title: "Название", dataIndex: "role_name" },
              { title: "Описание", dataIndex: "description" },
              { title: "Пользователей", dataIndex: "users_count", width: 130 },
              {
                title: "Действия",
                width: 210,
                render: (_, record: AdminRole) => (
                  <Flex gap={8}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openRoleModal(record)}>
                      Изменить
                    </Button>
                    <Popconfirm
                      title="Удалить роль?"
                      okText="Удалить"
                      cancelText="Отмена"
                      onConfirm={() => handleDeleteRole(record.role_id)}
                    >
                      <Button size="small" danger disabled={record.users_count > 0}>
                        Удалить
                      </Button>
                    </Popconfirm>
                  </Flex>
                ),
              },
            ]}
          />
        </Flex>
      </PanelShell>

      <Modal
        open={roleModalOpen}
        title={editingRole ? "Редактирование роли" : "Новая роль"}
        onCancel={() => setRoleModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setRoleModalOpen(false)}>Отмена</Button>,
          <Button key="save" type="primary" onClick={handleSaveRole}>Сохранить</Button>,
        ]}
      >
        <Form form={roleForm} layout="vertical" className="mt-4">
          <Form.Item name="role_name" label="Название роли" rules={[{ required: true, message: "Введите название роли" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
};

const AnalyticsPanel = ({ messageApi }: { messageApi: ReturnType<typeof message.useMessage>[0] }) => {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await getAdminSummary());
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Не удалось загрузить аналитику");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) return <Spin className="my-10" />;
  if (!summary) return <Empty description="Нет данных для аналитики" />;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <PanelShell>
        <Title level={4}>Статусы жалоб</Title>
        <Table
          rowKey="status"
          pagination={false}
          dataSource={summary.reports_by_status}
          columns={[
            {
              title: "Статус",
              dataIndex: "status",
              render: (value: string) => statusLabels[value] || value,
            },
            { title: "Количество", dataIndex: "count", width: 140 },
          ]}
        />
      </PanelShell>

      <PanelShell>
        <Title level={4}>Пользователи по ролям</Title>
        <Table
          rowKey="role"
          pagination={false}
          dataSource={summary.users_by_role}
          columns={[
            { title: "Роль", dataIndex: "role" },
            { title: "Количество", dataIndex: "count", width: 140 },
          ]}
        />
      </PanelShell>

      <PanelShell>
        <Title level={4}>Дневная активность сделок</Title>
        <Table
          rowKey="day"
          pagination={false}
          dataSource={summary.sales_by_day}
          columns={[
            { title: "Дата", dataIndex: "day" },
            { title: "Сделки", dataIndex: "transactions", width: 100 },
            { title: "Оборот", dataIndex: "volume", render: formatTonNumber, width: 120 },
          ]}
        />
      </PanelShell>

      <PanelShell>
        <Title level={4}>Коллекции по продажам</Title>
        <Table
          rowKey="collection_name"
          pagination={false}
          dataSource={summary.top_collections}
          columns={[
            { title: "Коллекция", dataIndex: "collection_name" },
            { title: "Сделки", dataIndex: "transactions", width: 100 },
            { title: "Оборот", dataIndex: "volume", render: formatTonNumber, width: 120 },
          ]}
        />
      </PanelShell>
    </div>
  );
};

export default AdminView;
