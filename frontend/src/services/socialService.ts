import { authFetch } from "./auth";

const API_URL = process.env.REACT_APP_API_URL;

export interface FollowResponse {
  following: boolean;
  followers_count: number;
  following_count: number;
}

export interface SocialUser {
  user_id: number;
  username: string | null;
  profile_pic_url: string | null;
  profile_badge_achievement_id: number | null;
  profile_badge_image_url: string | null;
  profile_badge_title: string | null;
  is_following: boolean;
}

export const followUser = async (userId: number): Promise<FollowResponse> => {
  const res = await authFetch(`${API_URL}/social/users/${userId}/follow`, { method: "POST" });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.detail || "Failed to follow user");
  }
  return res.json();
};

export const unfollowUser = async (userId: number): Promise<FollowResponse> => {
  const res = await authFetch(`${API_URL}/social/users/${userId}/follow`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.detail || "Failed to unfollow user");
  }
  return res.json();
};

export const getFollowers = async (userId: number): Promise<SocialUser[]> => {
  const res = await authFetch(`${API_URL}/social/users/${userId}/followers`);
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.detail || "Failed to load followers");
  }
  return res.json();
};

export const getFollowing = async (userId: number): Promise<SocialUser[]> => {
  const res = await authFetch(`${API_URL}/social/users/${userId}/following`);
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.detail || "Failed to load following");
  }
  return res.json();
};

export const setAchievementVisibility = async (
  achievementId: number,
  isVisible: number,
): Promise<{ achievement_id: number; is_visible: number }> => {
  const res = await authFetch(`${API_URL}/social/achievements/${achievementId}/visibility`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_visible: isVisible }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.detail || "Failed to update achievement visibility");
  }
  return res.json();
};

export const setProfileBadge = async (
  achievementId: number | null,
): Promise<{ profile_badge_achievement_id: number | null }> => {
  const res = await authFetch(`${API_URL}/social/profile-badge`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ achievement_id: achievementId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.detail || "Failed to update profile badge");
  }
  return res.json();
};
