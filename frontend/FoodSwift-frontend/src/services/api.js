
const API_BASE_URL = "http://127.0.0.1:8000/api";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("foodswift_user");

    if (window.location.pathname !== "/") {
      window.location.href = "/";
    }

    throw new Error("Your session has expired. Please log in again.");
  }

  const data =
    response.status === 204 ? null :
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail ||
      data.message ||
      "Unable to complete the request."
    );
  }

  return data;
}

export async function getProfile() {
  return apiRequest("/account/profile/");
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("foodswift_user");
  window.location.href = "/";
}

