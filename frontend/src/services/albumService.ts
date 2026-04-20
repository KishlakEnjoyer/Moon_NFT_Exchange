import { authFetch } from "./auth";

export interface AlbumServiceResponse {
  album_id: number;
  album_owner_id: number;
  album_title: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "Album request failed";

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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function createAlbum(userId: number, title: string): Promise<AlbumServiceResponse> {
  const response = await authFetch(`${process.env.REACT_APP_API_URL}/albums`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      title,
    }),
  });

  return parseResponse<AlbumServiceResponse>(response);
}

export async function renameAlbum(albumId: number, newTitle: string): Promise<AlbumServiceResponse> {
  const response = await authFetch(`${process.env.REACT_APP_API_URL}/albums/${albumId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      new_title: newTitle,
    }),
  });

  return parseResponse<AlbumServiceResponse>(response);
}

export async function deleteAlbum(albumId: number): Promise<void> {
  const response = await authFetch(`${process.env.REACT_APP_API_URL}/albums/${albumId}`, {
    method: "DELETE",
  });

  await parseResponse(response);
}

export interface Album {
  album_id: number;
  album_owner_id: number;
  album_title: string;
}

export async function getAlbums(userId: number): Promise<Album[]> {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/user-info/web/${userId}`);
  const data = await response.json();
  return data.albums || [];
}

export async function addPresentToAlbum(albumId: number, presentId: number): Promise<void> {
  const response = await authFetch(`${process.env.REACT_APP_API_URL}/albums/${albumId}/presents/${presentId}`, {
    method: "POST",
  });
  await parseResponse(response);
}

export async function removePresentFromAlbum(albumId: number, presentId: number): Promise<void> {
  const response = await authFetch(`${process.env.REACT_APP_API_URL}/albums/${albumId}/presents/${presentId}`, {
    method: "DELETE",
  });
  await parseResponse(response);
}
