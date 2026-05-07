const ACCESS_TOKEN_KEY = "access_token";
const TOKEN_TYPE_KEY = "token_type";
const BLOCKED_DETAIL = "User is inactive";

export const BLOCKED_ACCOUNT_MESSAGE = "Аккаунт заблокирован";

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getTokenType = (): string => {
  return localStorage.getItem(TOKEN_TYPE_KEY) || "Bearer";
};

export const setAuthSession = (accessToken: string, user?: unknown, tokenType: string = "Bearer") => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(TOKEN_TYPE_KEY, tokenType);
  localStorage.setItem("isAuth", "true");

  if (user !== undefined) {
    localStorage.setItem("currentUser", JSON.stringify(user));
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(TOKEN_TYPE_KEY);
  localStorage.removeItem("isAuth");
  localStorage.removeItem("currentUser");
};

const notifyAuthStorageChanged = () => {
  window.dispatchEvent(new Event("storage"));
};

const markStoredUserBlocked = () => {
  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (!currentUser.user_id || currentUser.is_active === 0) {
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify({ ...currentUser, is_active: 0, profile_pic_url: null }));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("accountBlocked"));
  } catch {
    window.dispatchEvent(new Event("accountBlocked"));
  }
};

export const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  const accessToken = getAccessToken();

  if (accessToken) {
    headers.set("Authorization", `${getTokenType()} ${accessToken}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401 && accessToken) {
    clearAuthSession();
    notifyAuthStorageChanged();
  }

  if (response.status === 403) {
    try {
      const data = await response.clone().json();
      if (data?.detail === BLOCKED_DETAIL) {
        markStoredUserBlocked();
      }
    } catch {
    }
  }

  return response;
};

export const appendAccessToken = (url: string): string => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(accessToken)}`;
};
