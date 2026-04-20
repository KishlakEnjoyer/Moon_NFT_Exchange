const ACCESS_TOKEN_KEY = "access_token";
const TOKEN_TYPE_KEY = "token_type";

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

export const authFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  const accessToken = getAccessToken();

  if (accessToken) {
    headers.set("Authorization", `${getTokenType()} ${accessToken}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
};

export const appendAccessToken = (url: string): string => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(accessToken)}`;
};
