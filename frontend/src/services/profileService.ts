import { authFetch } from "./auth";

export interface UpdateProfilePayload {
  username: string;
  about_me: string | null;
  tg_visibility: number;
  vk_visibility: number;
  profile_pic_data_url?: string | null;
  remove_profile_pic?: boolean;
}

export interface UpdateProfileResponse {
  user_id: number;
  user_tg_id: number | null;
  user_vk_id: number | null;
  username: string;
  tg_username: string | null;
  vk_username: string | null;
  tg_visibility: number;
  vk_visibility: number;
  profile_pic_url: string | null;
  about_me: string | null;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "Profile request failed";

    try {
      const data = await response.json();
      if (typeof data?.detail === "string" && data.detail.trim()) {
        detail = data.detail;
      }
    } catch {
      // Ignore JSON parsing errors and fall back to the default message.
    }

    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export async function updateProfile(
  userId: number,
  payload: UpdateProfilePayload,
): Promise<UpdateProfileResponse> {
  const response = await authFetch(`${process.env.REACT_APP_API_URL}/user-info/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<UpdateProfileResponse>(response);
}
