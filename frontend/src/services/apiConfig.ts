export const API_BASE_URL = (process.env.REACT_APP_API_URL || "/api").replace(/\/$/, "");
export const IMAGE_BASE_URL = (process.env.REACT_APP_IMAGES_URL || "/images").replace(/\/$/, "");

export const getWebSocketBaseUrl = (): string => {
  const configuredUrl = (process.env.REACT_APP_WS_URL || API_BASE_URL).replace(/\/$/, "");

  if (configuredUrl.startsWith("ws://") || configuredUrl.startsWith("wss://")) {
    return configuredUrl;
  }

  if (configuredUrl.startsWith("https://")) {
    return configuredUrl.replace("https://", "wss://");
  }

  if (configuredUrl.startsWith("http://")) {
    return configuredUrl.replace("http://", "ws://");
  }

  const path = configuredUrl.startsWith("/") ? configuredUrl : `/${configuredUrl}`;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
};
