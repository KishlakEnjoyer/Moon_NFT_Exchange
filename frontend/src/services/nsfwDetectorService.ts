import { authFetch } from "./auth";

interface NSFWDetectionPayload {
  image_url?: string;
  image_data_url?: string;
}

async function parseDetectionResponse(response: Response): Promise<boolean> {
  if (!response.ok) {
    let detail = "Failed to check image";

    try {
      const data = await response.json();
      if (typeof data?.detail === "string" && data.detail.trim()) {
        detail = data.detail;
      }
    } catch {
    }

    throw new Error(detail);
  }

  return response.json() as Promise<boolean>;
}

export async function detectNsfwImage(
  payload: NSFWDetectionPayload,
  signal?: AbortSignal,
): Promise<boolean> {
  const response = await authFetch(`${process.env.REACT_APP_API_URL}/nsfw-detector/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  return parseDetectionResponse(response);
}
