const API_URL = process.env.REACT_APP_API_URL;

export const createListing = async (presentId: number, userId: number, price: string) => {
  const res = await fetch(`${API_URL}/listings/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ present_id: presentId, seller_id: userId, price }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to create listing");
  }
  return res.json();
};

export const togglePresentVisibility = async (presentId: number, userId: number) => {
  const res = await fetch(`${API_URL}/presents/${presentId}/toggle-visibility?user_id=${userId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to toggle visibility");
  }
  return res.json();
};
