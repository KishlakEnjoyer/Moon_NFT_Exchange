import { authFetch } from "./auth";

const API_URL = process.env.REACT_APP_API_URL;

export type ReportStatusFilter = "pending" | "approved" | "rejected" | "all";
export type ReportDecision = "approve" | "reject";
export type DictionaryKind = "collections" | "models" | "backgrounds" | "symbols";

export interface NotificationPayload {
  report_id?: number;
  reason?: string;
  reason_ru?: string;
  reason_en?: string;
  moderator_id?: number;
  moderator_username?: string | null;
}

export async function getAchievementRules(): Promise<AchievementRule[]> {
  const response = await authFetch(`${API_URL}/admin/achievements/rules`);
  return parseResponse<AchievementRule[]>(response, "Failed to load achievement rules");
}

export async function getAdminAchievements(): Promise<AdminAchievement[]> {
  const response = await authFetch(`${API_URL}/admin/achievements`);
  return parseResponse<AdminAchievement[]>(response, "Failed to load achievements");
}

export async function createAchievement(payload: AchievementPayload): Promise<AdminAchievement> {
  const response = await authFetch(`${API_URL}/admin/achievements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<AdminAchievement>(response, "Failed to create achievement");
}

export async function updateAchievement(achievementId: number, payload: AchievementPayload): Promise<AdminAchievement> {
  const response = await authFetch(`${API_URL}/admin/achievements/${achievementId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<AdminAchievement>(response, "Failed to update achievement");
}

export async function setAchievementActive(achievementId: number, isActive: number): Promise<{ ok: boolean; awarded_now: number }> {
  const response = await authFetch(`${API_URL}/admin/achievements/${achievementId}/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
  return parseResponse<{ ok: boolean; awarded_now: number }>(response, "Failed to update achievement");
}

export async function backfillAchievements(): Promise<{ ok: boolean; awarded: number }> {
  const response = await authFetch(`${API_URL}/admin/achievements/backfill`, { method: "POST" });
  return parseResponse<{ ok: boolean; awarded: number }>(response, "Failed to backfill achievements");
}

export async function getModerationQueue(status = "pending"): Promise<ModerationItem[]> {
  const response = await authFetch(`${API_URL}/admin/moderation?status=${status}`);
  return parseResponse<ModerationItem[]>(response, "Failed to load moderation queue");
}

export async function decideModerationItem(
  moderationId: number,
  decision: "approve" | "reject",
  reason?: string | null,
): Promise<{ ok: boolean; status?: string; vote_counts?: ModerationVoteCounts }> {
  const response = await authFetch(`${API_URL}/admin/moderation/${moderationId}/decision`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, reason }),
  });
  return parseResponse<{ ok: boolean; status?: string; vote_counts?: ModerationVoteCounts }>(response, "Failed to process moderation item");
}

export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  const response = await authFetch(`${API_URL}/admin/audit-logs?limit=${limit}`);
  return parseResponse<AuditLog[]>(response, "Failed to load audit log");
}

export async function getUserSanctions(userId: number): Promise<UserSanction[]> {
  const response = await authFetch(`${API_URL}/admin/users/${userId}/sanctions`);
  return parseResponse<UserSanction[]>(response, "Failed to load sanction history");
}

export interface AdminNotification {
  notification_id: number;
  type: string;
  description: string | null;
  entity_type: string | null;
  entity_id: number | null;
  payload?: NotificationPayload | null;
  is_read: number;
  created_at: string;
}

export interface AdminAccess {
  user_id: number;
  role_id: number;
  role_name: string | null;
  can_moderate: boolean;
  can_admin: boolean;
  permissions: string[];
  available_permissions: { key: string; label: string }[];
}

export interface AdminSummary {
  cards: {
    users_total: number;
    users_active: number;
    transactions_total: number;
    sales_volume: string;
    platform_fee: string;
    active_listings: number;
    pending_reports: number;
  };
  sales_by_day: { day: string; transactions: number; volume: string }[];
  collections: { id: number; name: string }[];
  comparison?: {
    enabled: boolean;
    current: { start_date: string; end_date: string; transactions: number; volume: string; platform_fee: string };
    previous: { start_date: string; end_date: string; transactions: number; volume: string; platform_fee: string };
    delta: { transactions: number; volume: string; volume_percent: number | null };
    sales_by_day: {
      day: string;
      transactions: number;
      volume: string;
      previous_day: string | null;
      previous_transactions: number;
      previous_volume: string;
    }[];
  };
  top_collections: { collection_id?: number; collection_name: string; transactions: number; volume: string }[];
  reports_by_status: { status: string; count: number }[];
  users_by_role: { role: string; count: number }[];
}

export interface AdminSummaryParams {
  days?: number;
  startDate?: string;
  endDate?: string;
  collectionId?: number | null;
  compare?: boolean;
}

export interface AdminReport {
  report_id: number;
  sender_id: number;
  sender_username: string | null;
  sender_profile_badge_achievement_id?: number | null;
  sender_profile_badge_image_url?: string | null;
  sender_profile_badge_title?: string | null;
  receiver_id: number;
  receiver_username: string | null;
  receiver_profile_badge_achievement_id?: number | null;
  receiver_profile_badge_image_url?: string | null;
  receiver_profile_badge_title?: string | null;
  receiver_is_active: number | null;
  report_type_id: number;
  report_type_title: string | null;
  report_status_id: number;
  report_status_name: string;
  moderator_id: number | null;
  moderator_username: string | null;
  moderator_profile_badge_achievement_id?: number | null;
  moderator_profile_badge_image_url?: string | null;
  moderator_profile_badge_title?: string | null;
  created_at: string | null;
  closed_at: string | null;
}

export interface DictionaryItem {
  id: number;
  name: string;
  image_url: string | null;
  collection_id?: number;
  collection_name?: string;
  collection_limit?: number;
  purchase_limit?: number | null;
  base_price?: string;
  is_active: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ModerationVote {
  user_id: number;
  role: "moderator" | "admin";
  decision: "approve" | "reject";
  reason?: string | null;
  created_at?: string | null;
}

export interface ModerationVoteCounts {
  moderator_approvals: number;
  admin_approvals: number;
  moderator_rejections: number;
  admin_rejections: number;
  total_approvals: number;
  total_rejections: number;
}

export interface DictionaryItemPayload {
  name: string;
  image_url?: string | null;
  image_data_url?: string | null;
  collection_id?: number | null;
  collection_limit?: number | null;
  purchase_limit?: number | null;
  base_price?: number | null;
}

export interface AdminRole {
  role_id: number;
  role_name: string;
  description: string | null;
  permissions: string[];
  users_count: number;
}

export interface AdminUser {
  user_id: number;
  username: string | null;
  user_tg_id: number | null;
  user_vk_id: number | null;
  tg_username: string | null;
  vk_username: string | null;
  tg_visibility: number;
  vk_visibility: number;
  role_id: number;
  role_name: string | null;
  is_active: number;
  created_at: string | null;
  sales_count: number;
  purchases_count: number;
  reports_sent: number;
  reports_received: number;
}

export interface AchievementRule {
  key: string;
  label: string;
}

export interface AdminAchievement {
  achievement_id: number;
  title: string;
  description: string;
  image_url: string | null;
  rule_key: string | null;
  rule_value: number | null;
  is_active: number;
  created_by: number | null;
  created_at: string | null;
  updated_at: string | null;
  awarded_count: number;
  users_percent: number;
  awarded_now?: number;
}

export interface AchievementPayload {
  title: string;
  description: string;
  image_url?: string | null;
  image_data_url?: string | null;
  rule_key?: string | null;
  rule_value?: number | null;
  is_active?: number;
  backfill_existing?: boolean;
}

export interface ModerationItem {
  moderation_id: number;
  item_type: string;
  action: string;
  target_kind: string | null;
  target_id: number | null;
  submitted_by: number | null;
  reviewed_by: number | null;
  status: string;
  image_data_url: string | null;
  payload: Record<string, any>;
  votes?: ModerationVote[];
  vote_counts?: ModerationVoteCounts;
  reason: string | null;
  created_at: string | null;
  reviewed_at: string | null;
}

export interface AuditLog {
  audit_id: number;
  actor_user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, any>;
  created_at: string | null;
}

export interface UserSanction {
  sanction_id: number;
  user_id: number;
  moderator_id: number | null;
  action: string;
  reason: string | null;
  report_id: number | null;
  created_at: string | null;
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    let detail = fallback;
    try {
      const data = await response.json();
      if (typeof data?.detail === "string" && data.detail.trim()) {
        detail = data.detail;
      }
    } catch {
      detail = fallback;
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export async function getAdminAccess(): Promise<AdminAccess> {
  const response = await authFetch(`${API_URL}/admin/me`);
  return parseResponse<AdminAccess>(response, "Нет доступа к админ-панели");
}

export async function getAdminSummary(params: AdminSummaryParams = {}): Promise<AdminSummary> {
  const searchParams = new URLSearchParams();
  if (params.days) searchParams.set("days", String(params.days));
  if (params.startDate) searchParams.set("start_date", params.startDate);
  if (params.endDate) searchParams.set("end_date", params.endDate);
  if (params.collectionId) searchParams.set("collection_id", String(params.collectionId));
  if (params.compare !== undefined) searchParams.set("compare", String(params.compare));

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const response = await authFetch(`${API_URL}/admin/summary${suffix}`);
  return parseResponse<AdminSummary>(response, "Не удалось загрузить статистику");
}

export async function getAdminReports(status: ReportStatusFilter): Promise<AdminReport[]> {
  const response = await authFetch(`${API_URL}/admin/reports?status=${status}`);
  return parseResponse<AdminReport[]>(response, "Не удалось загрузить жалобы");
}

export async function decideAdminReport(reportId: number, decision: ReportDecision): Promise<AdminReport> {
  const response = await authFetch(`${API_URL}/admin/reports/${reportId}/decision`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  return parseResponse<AdminReport>(response, "Не удалось обработать жалобу");
}

export async function sendAdminReportWarning(
  reportId: number,
  payload: { reason_ru?: string | null; reason_en?: string | null },
): Promise<{ ok: boolean; notification: AdminNotification }> {
  const response = await authFetch(`${API_URL}/admin/reports/${reportId}/warning`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<{ ok: boolean; notification: AdminNotification }>(response, "Не удалось отправить предупреждение");
}

export async function getDictionaryItems(kind: DictionaryKind): Promise<DictionaryItem[]> {
  const response = await authFetch(`${API_URL}/admin/dictionaries/${kind}`);
  return parseResponse<DictionaryItem[]>(response, "Не удалось загрузить справочник");
}

export async function createDictionaryItem(
  kind: DictionaryKind,
  payload: DictionaryItemPayload,
): Promise<{ ok: boolean; id: number | null }> {
  const response = await authFetch(`${API_URL}/admin/dictionaries/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<{ ok: boolean; id: number | null }>(response, "Не удалось создать запись");
}

export async function updateDictionaryItem(
  kind: DictionaryKind,
  itemId: number,
  payload: DictionaryItemPayload,
): Promise<{ ok: boolean }> {
  const response = await authFetch(`${API_URL}/admin/dictionaries/${kind}/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<{ ok: boolean }>(response, "Не удалось обновить запись");
}

export async function setDictionaryItemArchived(
  kind: DictionaryKind,
  itemId: number,
  archived: boolean,
): Promise<{ ok: boolean }> {
  const action = archived ? "archive" : "restore";
  const response = await authFetch(`${API_URL}/admin/dictionaries/${kind}/${itemId}/${action}`, {
    method: "PATCH",
  });
  return parseResponse<{ ok: boolean }>(response, "Не удалось изменить архивность");
}

export async function publishCollection(collectionId: number): Promise<{ ok: boolean }> {
  const response = await authFetch(`${API_URL}/admin/dictionaries/collections/${collectionId}/publish`, {
    method: "PATCH",
  });
  return parseResponse<{ ok: boolean }>(response, "Failed to publish collection");
}

export async function getAdminRoles(): Promise<AdminRole[]> {
  const response = await authFetch(`${API_URL}/admin/roles`);
  return parseResponse<AdminRole[]>(response, "Не удалось загрузить роли");
}

export async function createAdminRole(payload: { role_name: string; description?: string | null; permissions?: string[] }): Promise<AdminRole> {
  const response = await authFetch(`${API_URL}/admin/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<AdminRole>(response, "Не удалось создать роль");
}

export async function updateAdminRole(
  roleId: number,
  payload: { role_name: string; description?: string | null; permissions?: string[] },
): Promise<{ ok: boolean }> {
  const response = await authFetch(`${API_URL}/admin/roles/${roleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<{ ok: boolean }>(response, "Не удалось обновить роль");
}

export async function deleteAdminRole(roleId: number): Promise<{ ok: boolean }> {
  const response = await authFetch(`${API_URL}/admin/roles/${roleId}`, {
    method: "DELETE",
  });
  return parseResponse<{ ok: boolean }>(response, "Не удалось удалить роль");
}

export async function getAdminUsers(query = ""): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await authFetch(`${API_URL}/admin/users${suffix}`);
  return parseResponse<AdminUser[]>(response, "Не удалось загрузить пользователей");
}

export async function setAdminUserRole(userId: number, roleId: number): Promise<{ ok: boolean }> {
  const response = await authFetch(`${API_URL}/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role_id: roleId }),
  });
  return parseResponse<{ ok: boolean }>(response, "Не удалось изменить роль пользователя");
}

export async function setAdminUserActive(
  userId: number,
  isActive: number,
  reason?: string | null,
): Promise<{ ok: boolean; deactivated_listings?: number; approved_reports?: number }> {
  const response = await authFetch(`${API_URL}/admin/users/${userId}/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive, reason }),
  });
  return parseResponse<{ ok: boolean }>(response, "Не удалось изменить статус пользователя");
}
