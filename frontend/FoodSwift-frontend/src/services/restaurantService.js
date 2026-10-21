const API_BASE_URL = "http://127.0.0.1:8000/api/restaurants/";

function getAccessToken() {
  return localStorage.getItem("accessToken");
}

async function request(url, options = {}) {
  const token = getAccessToken();

  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      "Restaurant API request failed.";

    throw new Error(message);
  }

  return data;
}

export const restaurantService = {
  // Get restaurants belonging to the logged-in owner.
  getMyRestaurants() {
    return request(`${API_BASE_URL}mine/`);
  },

  // Get one restaurant by ID.
  getRestaurant(id) {
    return request(`${API_BASE_URL}${id}/`);
  },

  // Create a restaurant.
  createRestaurant(restaurant) {
    return request(API_BASE_URL, {
      method: "POST",
      body: JSON.stringify(restaurant),
    });
  },

  // Update selected restaurant fields.
  updateRestaurant(id, updates) {
    return request(`${API_BASE_URL}${id}/`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  // Delete a restaurant.
  deleteRestaurant(id) {
    return request(`${API_BASE_URL}${id}/`, {
      method: "DELETE",
    });
  },
};
