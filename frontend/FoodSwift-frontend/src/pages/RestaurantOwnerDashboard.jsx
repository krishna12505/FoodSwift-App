import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RestaurantOwnerDashboard.css";

const API_URL = "http://127.0.0.1:8000/api";

const NAVIGATION = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "restaurant", label: "My Restaurant", icon: "⌂" },
  { id: "menu", label: "Menu Management", icon: "☷" },
  { id: "orders", label: "Orders", icon: "▤" },
];

const STATUS_LABELS = {
  placed: "Order Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for Delivery",
  picked_up: "Picked Up",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

async function fetchAPI(endpoint, token, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    throw new Error(
      "Your login session may have expired. Please log in again."
    );
  }

  if (!response.ok) {
    const detail = data?.detail || data?.message;
    const validationErrors =
      data && typeof data === "object" && !detail
        ? Object.values(data).flat().join(" ")
        : "";

    throw new Error(
      detail || validationErrors || `Request failed (${response.status}).`
    );
  }

  return data;
}

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatCurrency(amount) {
  const value = Number(amount || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatStatus(status) {
  if (!status) return "Pending";

  return (
    STATUS_LABELS[status] ||
    String(status)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitial(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "R";
}

function getOrderId(order) {
  return order.order_number || order.order_id || order.id || "—";
}

function getOrderTotal(order) {
  return order.total_amount ?? order.total_price ?? order.total ?? 0;
}

function getCustomerName(order) {
  return (
    order.customer_name ||
    order.customer?.name ||
    order.user?.name ||
    order.customer?.email ||
    "Customer"
  );
}

function getRestaurantName(restaurant) {
  return restaurant?.name || "My Restaurant";
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function getAssignedPartnerId(order) {
  const partner =
    order.delivery_partner ??
    order.delivery_partner_id ??
    order.assigned_delivery_partner ??
    null;

  if (partner && typeof partner === "object") {
    return partner.id ?? partner.pk ?? null;
  }

  return partner;
}

export default function RestaurantOwnerDashboard() {
  const navigate = useNavigate();
  const hasLoadedDashboard = useRef(false);

  const [user, setUser] = useState(getStoredUser);
  const [activeTab, setActiveTab] = useState("overview");

  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    const storedUser = getStoredUser();

    setUser(storedUser);
    setError("");

    if (!token || !storedUser) {
      setLoading(false);
      setError("Please log in to access your restaurant dashboard.");
      return;
    }

    if (storedUser.role !== "restaurant_owner") {
      setLoading(false);
      setError("This dashboard is available only to restaurant owners.");
      return;
    }

    // Only show the full-page loader on the initial load.
    // Subsequent refreshes keep the dashboard visible.
    if (!hasLoadedDashboard.current) {
      setLoading(true);
    }

    try {
      
      const restaurantData = await fetchAPI("/restaurants/my-restaurants/",token);
      const restaurantList = getList(restaurantData);

      setRestaurant(restaurantList[0] || null);

      try {
        const ordersData = await fetchAPI("/orders/restaurant/", token);
        setOrders(getList(ordersData));
      } catch (orderError) {
        setError(orderError.message || "Unable to load restaurant orders.");
      }
    } catch (err) {
      if (!hasLoadedDashboard.current) {
        setRestaurant(null);
      }
      setError(err.message || "Unable to load your restaurant dashboard.");
    } finally {
      hasLoadedDashboard.current = true;
      setLoading(false);
    }
  }, []);

  const loadMenuItems = useCallback(async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setMenuError("Please log in again to view your menu.");
      setMenuItems([]);
      return;
    }

    setMenuLoading(true);
    setMenuError("");

    try {
      const data = await fetchAPI("/menu/manage/", token);
      setMenuItems(getList(data));
    } catch (err) {
      setMenuItems([]);
      setMenuError(err.message || "Unable to load menu items.");
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === "menu") {
      loadMenuItems();
    }
  }, [activeTab, loadMenuItems]);

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    setUser(null);
    navigate("/");
  }

  function openTab(tab) {
    setActiveTab(tab);
    setSidebarOpen(false);
  }

  if (loading) {
    return (
      <div className="owner-dashboard-loading">
        <div className="owner-loader" />
        <h2>Loading your dashboard...</h2>
        <p>Please wait while we fetch your restaurant information.</p>
      </div>
    );
  }

  if (error && !restaurant) {
    return (
      <div className="owner-dashboard-loading">
        <div className="owner-error-icon">!</div>
        <h2>Unable to open dashboard</h2>
        <p>{error}</p>

        <div className="owner-error-actions">
          <button
            type="button"
            className="owner-primary"
            onClick={() => {
              if (!localStorage.getItem("accessToken")) {
                navigate("/");
              } else {
                loadDashboard();
              }
            }}
          >
            Try Again
          </button>

          <button
            type="button"
            className="owner-secondary"
            onClick={() => navigate("/")}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const completedOrders = orders.filter(
    (order) => order.status === "delivered"
  );

  const pendingOrders = orders.filter(
    (order) =>
      !["delivered", "cancelled"].includes(
        String(order.status || "").toLowerCase()
      )
  );

  const totalRevenue = completedOrders.reduce(
    (total, order) => total + Number(getOrderTotal(order) || 0),
    0
  );

  return (
    <div className="owner-dashboard">
      {sidebarOpen && (
        <button
          type="button"
          className="owner-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`owner-sidebar ${
          sidebarOpen ? "owner-sidebar-open" : ""
        }`}
      >
        <div className="owner-brand">
          <div className="owner-brand-icon">F</div>

          <div>
            <h2>FoodSwift</h2>
            <p>Restaurant Portal</p>
          </div>

          <button
            type="button"
            className="owner-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <div className="owner-sidebar-label">WORKSPACE</div>

        <nav className="owner-navigation">
          {NAVIGATION.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`owner-nav-item ${
                activeTab === item.id ? "active" : ""
              }`}
              onClick={() => openTab(item.id)}
            >
              <span className="owner-nav-icon">{item.icon}</span>
              <span>{item.label}</span>

              {item.id === "orders" && pendingOrders.length > 0 && (
                <span className="owner-nav-count">
                  {pendingOrders.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="owner-sidebar-bottom">
          <div className="owner-help-card">
            <div className="owner-help-icon">?</div>
            <strong>Need assistance?</strong>
            <p>Manage your restaurant operations from one place.</p>
          </div>

          <button
            type="button"
            className="owner-home-button"
            onClick={() => navigate("/")}
          >
            <span>⌂</span> FoodSwift Home
          </button>

          <button
            type="button"
            className="owner-logout-button"
            onClick={handleLogout}
          >
            <span>↪</span> Log Out
          </button>
        </div>
      </aside>

      <main className="owner-main">
        <header className="owner-topbar">
          <div className="owner-topbar-left">
            <button
              type="button"
              className="owner-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              ☰
            </button>

            <div>
              <p className="owner-breadcrumb">Restaurant / Dashboard</p>
              <h1>
                {NAVIGATION.find((item) => item.id === activeTab)?.label ||
                  "Dashboard"}
              </h1>
            </div>
          </div>

          <div className="owner-topbar-right">
            <button
              type="button"
              className="owner-refresh-button"
              onClick={() => {
                loadDashboard();
                if (activeTab === "menu") loadMenuItems();
              }}
              title="Refresh dashboard"
            >
              ↻ <span>Refresh</span>
            </button>

            <div className="owner-user-profile">
              <div className="owner-avatar">{getInitial(user?.name)}</div>

              <div className="owner-user-info">
                <strong>{user?.name || "Restaurant Owner"}</strong>
                <span>Restaurant Owner</span>
              </div>
            </div>
          </div>
        </header>

        <div className="owner-content">
          {error && restaurant && (
            <div className="owner-alert">
              <strong>Some information could not be loaded</strong>
              <p>{error}</p>
              <button type="button" onClick={loadDashboard}>
                Try again
              </button>
            </div>
          )}

          {activeTab === "overview" && (
            <OverviewTab
              restaurant={restaurant}
              orders={orders}
              pendingOrders={pendingOrders}
              completedOrders={completedOrders}
              totalRevenue={totalRevenue}
              onOpenTab={openTab}
            />
          )}

          {activeTab === "restaurant" && (
            <RestaurantTab restaurant={restaurant} />
          )}

          {activeTab === "menu" && (
            <MenuTab
              restaurant={restaurant}
              menuItems={menuItems}
              loading={menuLoading}
              error={menuError}
              onRefresh={loadMenuItems}
              onGoHome={() => navigate("/")}
            />
          )}

          {activeTab === "orders" && (
            <OrdersTab orders={orders} onRefresh={loadDashboard} />
          )}
        </div>
      </main>
    </div>
  );
}

function OverviewTab({
  restaurant,
  orders,
  pendingOrders,
  completedOrders,
  totalRevenue,
  onOpenTab,
}) {
  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.created_at || b.order_date || 0) -
        new Date(a.created_at || a.order_date || 0)
    )
    .slice(0, 5);

  return (
    <>
      <section className="owner-welcome">
        <div>
          <span className="owner-eyebrow">RESTAURANT OVERVIEW</span>
          <h2>
            Welcome back,{" "}
            {restaurant?.name ? restaurant.name : "Restaurant Owner"}!
          </h2>
          <p>Here is what is happening with your restaurant today.</p>
        </div>

        <div className="owner-welcome-icon">🍽</div>
      </section>

      <div className="owner-stat-grid">
        <StatCard
          icon="▤"
          color="orange"
          label="Total Orders"
          value={orders.length}
          description="All recorded orders"
        />

        <StatCard
          icon="◷"
          color="blue"
          label="Pending Orders"
          value={pendingOrders.length}
          description="Orders still in progress"
        />

        <StatCard
          icon="✓"
          color="green"
          label="Completed Orders"
          value={completedOrders.length}
          description="Successfully delivered"
        />

        <StatCard
          icon="₹"
          color="purple"
          label="Completed Revenue"
          value={formatCurrency(totalRevenue)}
          description="From delivered orders"
        />
      </div>

      <div className="owner-dashboard-grid">
        <section className="owner-panel">
          <div className="owner-panel-heading">
            <div>
              <h2>Recent Orders</h2>
              <p>Keep track of your latest customer orders.</p>
            </div>

            <button
              type="button"
              className="owner-text-button"
              onClick={() => onOpenTab("orders")}
            >
              View All →
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              message="Customer orders will appear here when they are placed."
            />
          ) : (
            <div className="owner-table-wrap">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>#{getOrderId(order)}</td>
                      <td>{getCustomerName(order)}</td>
                      <td>{formatCurrency(getOrderTotal(order))}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="owner-panel owner-restaurant-summary">
          <div className="owner-panel-heading">
            <div>
              <h2>Restaurant Details</h2>
              <p>Your registered restaurant information.</p>
            </div>
          </div>

          {restaurant ? (
            <>
              {restaurant.image ? (
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="owner-restaurant-image"
                />
              ) : (
                <div className="owner-restaurant-image owner-restaurant-image-empty">
                  🍽
                </div>
              )}

              <h3>{restaurant.name}</h3>
              <p className="owner-muted">
                {restaurant.cuisine || "Cuisine not specified"}
              </p>

              <div className="owner-detail-line">
                <span>City</span>
                <strong>{restaurant.city || "—"}</strong>
              </div>

              <div className="owner-detail-line">
                <span>Phone</span>
                <strong>{restaurant.phone || "—"}</strong>
              </div>

              <div className="owner-detail-line">
                <span>Status</span>
                <StatusBadge
                  status={restaurant.is_active ? "active" : "inactive"}
                />
              </div>

              <button
                type="button"
                className="owner-primary owner-full-button"
                onClick={() => onOpenTab("restaurant")}
              >
                View Restaurant Details
              </button>
            </>
          ) : (
            <EmptyState
              title="No restaurant found"
              message="No restaurant is currently linked to this account."
            />
          )}
        </section>
      </div>

      <section className="owner-panel owner-quick-actions">
        <div className="owner-panel-heading">
          <div>
            <h2>Quick Actions</h2>
            <p>Quickly access your restaurant tools.</p>
          </div>
        </div>

        <div className="owner-action-grid">
          <button
            type="button"
            className="owner-action-card"
            onClick={() => onOpenTab("menu")}
          >
            <span className="owner-action-icon orange">☷</span>
            <strong>Manage Menu</strong>
            <span>View your food items</span>
          </button>

          <button
            type="button"
            className="owner-action-card"
            onClick={() => onOpenTab("orders")}
          >
            <span className="owner-action-icon blue">▤</span>
            <strong>View Orders</strong>
            <span>Track customer orders</span>
          </button>

          <button
            type="button"
            className="owner-action-card"
            onClick={() => onOpenTab("restaurant")}
          >
            <span className="owner-action-icon green">⌂</span>
            <strong>Restaurant Details</strong>
            <span>Review your information</span>
          </button>
        </div>
      </section>
    </>
  );
}

function RestaurantTab({ restaurant }) {
  const [form, setForm] = useState({
    name: "",
    cuisine: "",
    address: "",
    city: "Hyderabad",
    phone: "",
    description: "",
    image: "",
    opening_time: "",
    closing_time: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    if (
      form.opening_time &&
      form.closing_time &&
      form.opening_time === form.closing_time
    ) {
      setError("Opening and closing times cannot be identical.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetchAPI(
        "/restaurants/registration-request/",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            cuisine: form.cuisine.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            phone: form.phone.trim(),
            description: form.description.trim(),
            image: form.image.trim(),
            opening_time: form.opening_time,
            closing_time: form.closing_time,
          }),
        }
      );

      setMessage(
        response?.message ||
          "Your restaurant details were sent to the admin."
      );

      setForm({
        name: "",
        cuisine: "",
        address: "",
        city: "Hyderabad",
        phone: "",
        description: "",
        image: "",
        opening_time: "",
        closing_time: "",
      });
    } catch (err) {
      setError(
        err.message || "Unable to send restaurant details to the admin."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #e1e5eb",
    borderRadius: "8px",
    font: "inherit",
    background: "#fff",
    color: "#252525",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "6px",
    color: "#454545",
  };

  if (!restaurant) {
    return (
      <section className="owner-panel">
        <div className="owner-panel-heading">
          <div>
            <h2>Register Your Restaurant</h2>
            <p>
              Submit your restaurant details to the FoodSwift admin
              team by email for registration and approval.
            </p>
          </div>
        </div>

        {error && (
          <div className="owner-alert" role="alert">
            <strong>Submission failed</strong>
            <p>{error}</p>
          </div>
        )}

        {message && (
          <div
            role="status"
            style={{
              marginBottom: "18px",
              padding: "14px",
              borderRadius: "8px",
              background: "#edf8ef",
              color: "#236b35",
            }}
          >
            <strong>Request submitted</strong>
            <p style={{ marginBottom: 0 }}>{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
            }}
          >
            <label>
              <span style={labelStyle}>Restaurant Name *</span>
              <input
                style={inputStyle}
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Hyderabad Spice House"
                maxLength={150}
                required
              />
            </label>

            <label>
              <span style={labelStyle}>Cuisine Type *</span>
              <input
                style={inputStyle}
                name="cuisine"
                value={form.cuisine}
                onChange={handleChange}
                placeholder="e.g. Indian, Chinese"
                maxLength={100}
                required
              />
            </label>

            <label>
              <span style={labelStyle}>Contact Phone *</span>
              <input
                style={inputStyle}
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="Restaurant contact number"
                maxLength={15}
                required
              />
            </label>

            <label>
              <span style={labelStyle}>City *</span>
              <input
                style={inputStyle}
                name="city"
                value={form.city}
                onChange={handleChange}
                maxLength={100}
                required
              />
            </label>

            <label>
              <span style={labelStyle}>Opening Time</span>
              <input
                style={inputStyle}
                name="opening_time"
                type="time"
                value={form.opening_time}
                onChange={handleChange}
              />
            </label>

            <label>
              <span style={labelStyle}>Closing Time</span>
              <input
                style={inputStyle}
                name="closing_time"
                type="time"
                value={form.closing_time}
                onChange={handleChange}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span style={labelStyle}>Restaurant Address *</span>
              <textarea
                style={{ ...inputStyle, minHeight: "80px" }}
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter the complete restaurant address"
                required
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span style={labelStyle}>Restaurant Description</span>
              <textarea
                style={{ ...inputStyle, minHeight: "80px" }}
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Tell the admin about your restaurant"
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span style={labelStyle}>Restaurant Image URL</span>
              <input
                style={inputStyle}
                name="image"
                type="url"
                value={form.image}
                onChange={handleChange}
                placeholder="https://example.com/restaurant.jpg"
              />
            </label>
          </div>

          <p className="owner-information-note">
            Your details will be emailed to the admin for review.
            Sending this request does not register or approve your
            restaurant automatically.
          </p>

          <button
            type="submit"
            className="owner-primary"
            disabled={submitting}
          >
            {submitting ? "Sending Details..." : "Submit Details to Admin"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="owner-panel">
      <div className="owner-panel-heading">
        <div>
          <h2>My Restaurant</h2>
          <p>Your restaurant has been registered in FoodSwift.</p>
        </div>

        <StatusBadge
          status={restaurant.is_active ? "active" : "inactive"}
        />
      </div>

      {restaurant.image ? (
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="owner-restaurant-cover"
        />
      ) : (
        <div className="owner-restaurant-cover owner-restaurant-cover-empty">
          Restaurant Image
        </div>
      )}

      <div className="owner-restaurant-title">
        <div className="owner-avatar owner-avatar-large">
          {getInitial(restaurant.name)}
        </div>

        <div>
          <h2>{restaurant.name}</h2>
          <p>{restaurant.cuisine || "Cuisine not specified"}</p>
        </div>
      </div>

      <div className="owner-details-grid">
        <DetailItem label="Restaurant Name" value={restaurant.name} />
        <DetailItem label="Cuisine" value={restaurant.cuisine} />
        <DetailItem label="Phone Number" value={restaurant.phone} />
        <DetailItem label="City" value={restaurant.city} />
        <DetailItem label="Opening Time" value={restaurant.opening_time} />
        <DetailItem label="Closing Time" value={restaurant.closing_time} />
        <DetailItem label="Address" value={restaurant.address} />
        <DetailItem
          label="Description"
          value={restaurant.description}
        />
      </div>

      <p className="owner-information-note">
        To request changes to your registered restaurant details,
        contact the FoodSwift admin team.
      </p>
    </section>
  );
}


function MenuTab({
  restaurant,
  menuItems,
  loading,
  error,
  onRefresh,
  onGoHome,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Main Course",
    price: "",
    image: "",
    food_type: "veg",
    is_available: true,
  });

  const availableItems = menuItems.filter((item) => item.is_available);
  const unavailableItems = menuItems.filter((item) => !item.is_available);

  function openAddForm() {
    setEditingItem(null);
    setForm({
      name: "",
      description: "",
      category: "Main Course",
      price: "",
      image: "",
      food_type: "veg",
      is_available: true,
    });
    setActionError("");
    setActionMessage("");
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "Main Course",
      price: String(item.price ?? ""),
      image: item.image || "",
      food_type: item.food_type || "veg",
      is_available: Boolean(item.is_available),
    });
    setActionError("");
    setActionMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingItem(null);
    setActionError("");
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveMenuItem(event) {
    event.preventDefault();
    setActionError("");
    setActionMessage("");

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setActionError("Your session has expired. Please log in again.");
      return;
    }

    if (!restaurant?.id) {
      setActionError(
        "No restaurant is linked to your account. Register a restaurant first."
      );
      return;
    }

    const price = Number(form.price);

    if (!form.name.trim()) {
      setActionError("Please enter the food item name.");
      return;
    }

    if (!form.category.trim()) {
      setActionError("Please enter a food category.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setActionError("Enter a valid price greater than zero.");
      return;
    }

    const payload = {
      restaurant: restaurant.id,
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      price: price.toFixed(2),
      image: form.image.trim(),
      food_type: form.food_type,
      is_available: form.is_available,
    };

    setSaving(true);

    try {
      const endpoint = editingItem
        ? `/menu/manage/${editingItem.id}/`
        : "/menu/manage/";

      await fetchAPI(endpoint, token, {
        method: editingItem ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      setShowForm(false);
      setEditingItem(null);
      setActionMessage(
        editingItem
          ? "Menu item updated successfully."
          : "Menu item added successfully."
      );

      await onRefresh();
    } catch (err) {
      setActionError(err.message || "Unable to save the menu item.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item) {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setActionError("Your session has expired. Please log in again.");
      return;
    }

    setActionError("");
    setActionMessage("");

    try {
      await fetchAPI(`/menu/manage/${item.id}/`, token, {
        method: "PATCH",
        body: JSON.stringify({
          is_available: !item.is_available,
        }),
      });

      setActionMessage(
        `${item.name} is now ${
          item.is_available ? "unavailable" : "available"
        }.`
      );

      await onRefresh();
    } catch (err) {
      setActionError(err.message || "Unable to update availability.");
    }
  }

  async function deleteMenuItem(item) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setActionError("Your session has expired. Please log in again.");
      return;
    }

    setActionError("");
    setActionMessage("");

    try {
      await fetchAPI(`/menu/manage/${item.id}/`, token, {
        method: "DELETE",
      });

      setActionMessage(`${item.name} was deleted successfully.`);
      await onRefresh();
    } catch (err) {
      setActionError(err.message || "Unable to delete the menu item.");
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #e1e5eb",
    borderRadius: "8px",
    font: "inherit",
    background: "#fff",
    color: "#252525",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "6px",
    color: "#454545",
  };

  return (
    <>
      <section className="owner-panel">
        <div className="owner-panel-heading">
          <div>
            <h2>Menu Management</h2>
            <p>
              Add, edit, and control the availability of your restaurant's
              food items.
            </p>
          </div>

          <button
            type="button"
            className="owner-primary"
            onClick={openAddForm}
            disabled={!restaurant?.id}
          >
            + Add Food Item
          </button>
        </div>

        {!restaurant?.id && (
          <div className="owner-alert">
            <p>
              A restaurant must be linked to your account before you can
              manage its menu.
            </p>
          </div>
        )}

        {actionError && (
          <div className="owner-alert" role="alert">
            <strong>Action failed</strong>
            <p>{actionError}</p>
          </div>
        )}

        {actionMessage && (
          <div
            role="status"
            style={{
              marginBottom: "16px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#edf8ef",
              color: "#236b35",
            }}
          >
            {actionMessage}
          </div>
        )}

        {error && (
          <div className="owner-alert">
            <strong>Unable to load menu items</strong>
            <p>{error}</p>
            <button type="button" onClick={onRefresh}>
              Try Again
            </button>
          </div>
        )}

        {loading && (
          <div className="owner-state">
            <div className="owner-loader" />
            <p>Loading your menu items...</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="owner-stat-grid">
              <StatCard
                icon="☷"
                color="orange"
                label="Total Items"
                value={menuItems.length}
                description="Items in your menu"
              />

              <StatCard
                icon="✓"
                color="green"
                label="Available"
                value={availableItems.length}
                description="Available to customers"
              />

              <StatCard
                icon="◷"
                color="blue"
                label="Unavailable"
                value={unavailableItems.length}
                description="Currently unavailable"
              />
            </div>

            {menuItems.length === 0 ? (
              <EmptyState
                title="No menu items found"
                message="Add your first food item to start building your restaurant menu."
              />
            ) : (
              <div className="owner-table-wrap">
                <table className="owner-table">
                  <thead>
                    <tr>
                      <th>Food Item</th>
                      <th>Category</th>
                      <th>Food Type</th>
                      <th>Price</th>
                      <th>Availability</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {menuItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="owner-menu-item">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="owner-menu-image"
                              />
                            ) : (
                              <div className="owner-menu-image owner-menu-image-empty">
                                Food
                              </div>
                            )}

                            <div>
                              <strong>{item.name}</strong>
                              <p>{item.description || "No description"}</p>
                            </div>
                          </div>
                        </td>

                        <td>{item.category || "—"}</td>

                        <td>
                          {item.food_type === "veg"
                            ? "Vegetarian"
                            : item.food_type === "non_veg"
                              ? "Non-vegetarian"
                              : item.food_type || "—"}
                        </td>

                        <td>{formatCurrency(item.price)}</td>

                        <td>
                          <StatusBadge
                            status={
                              item.is_available ? "available" : "unavailable"
                            }
                          />
                        </td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              className="owner-secondary"
                              onClick={() => openEditForm(item)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="owner-secondary"
                              onClick={() => toggleAvailability(item)}
                            >
                              {item.is_available ? "Disable" : "Enable"}
                            </button>

                            <button
                              type="button"
                              className="owner-secondary"
                              onClick={() => deleteMenuItem(item)}
                              style={{ color: "#c62828" }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {showForm && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(20, 24, 32, 0.62)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            overflowY: "auto",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-form-title"
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "16px",
              padding: "26px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.24)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
                marginBottom: "22px",
              }}
            >
              <div>
                <h2 id="menu-form-title" style={{ margin: "0 0 6px" }}>
                  {editingItem ? "Edit Food Item" : "Add Food Item"}
                </h2>
                <p style={{ margin: 0, color: "#707782", fontSize: "14px" }}>
                  Restaurant: {restaurant?.name || "My Restaurant"}
                </p>
              </div>

              <button
                type="button"
                className="owner-secondary"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="owner-alert" role="alert">
                <p>{actionError}</p>
              </div>
            )}

            <form onSubmit={saveMenuItem}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "18px",
                }}
              >
                <label>
                  <span style={labelStyle}>Food Item Name *</span>
                  <input
                    style={inputStyle}
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Chicken Dum Biryani"
                    maxLength={150}
                    required
                  />
                </label>

                <label>
                  <span style={labelStyle}>Category *</span>
                  <input
                    style={inputStyle}
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="e.g. Biryani, Starters"
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  <span style={labelStyle}>Price (₹) *</span>
                  <input
                    style={inputStyle}
                    name="price"
                    type="number"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="249.00"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </label>

                <label>
                  <span style={labelStyle}>Food Type *</span>
                  <select
                    style={inputStyle}
                    name="food_type"
                    value={form.food_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="non_veg">Non-vegetarian</option>
                  </select>
                </label>

                <label style={{ gridColumn: "1 / -1" }}>
                  <span style={labelStyle}>Image URL (optional)</span>
                  <input
                    style={inputStyle}
                    name="image"
                    type="url"
                    value={form.image}
                    onChange={handleChange}
                    placeholder="https://example.com/food-image.jpg"
                  />
                </label>

                <label style={{ gridColumn: "1 / -1" }}>
                  <span style={labelStyle}>Description (optional)</span>
                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: "90px",
                      resize: "vertical",
                    }}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the ingredients and preparation..."
                  />
                </label>

                <label
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    name="is_available"
                    checked={form.is_available}
                    onChange={handleChange}
                  />
                  Available for customers to order
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "26px",
                }}
              >
                <button
                  type="button"
                  className="owner-secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="owner-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingItem
                      ? "Save Changes"
                      : "Add Food Item"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <button
        type="button"
        className="owner-secondary"
        onClick={onGoHome}
        style={{ marginTop: "18px" }}
      >
        ← Return to FoodSwift Home
      </button>
    </>
  );
}

function OrdersTab({ orders, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [selectedPartners, setSelectedPartners] = useState({});
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState(null);

  // Tracks assignments locally if the order serializer does not yet
  // return delivery_partner in its response.
  const [locallyAssignedPartners, setLocallyAssignedPartners] = useState({});

  const RESTAURANT_ACTIONS = {
    placed: [
      { status: "confirmed", label: "Confirm Order", primary: true },
      { status: "cancelled", label: "Cancel Order", primary: false },
    ],
    confirmed: [
      { status: "preparing", label: "Start Preparing", primary: true },
      { status: "cancelled", label: "Cancel Order", primary: false },
    ],
    preparing: [
      { status: "ready", label: "Mark Ready", primary: true },
    ],
  };

  const loadDeliveryPartners = useCallback(async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setActionError("Please log in again to load delivery partners.");
      return;
    }

    setLoadingPartners(true);

    try {
      const data = await fetchAPI("/orders/delivery-partners/", token);
      setDeliveryPartners(getList(data));
    } catch (error) {
      setActionError(
        error.message || "Could not load delivery partners."
      );
    } finally {
      setLoadingPartners(false);
    }
  }, []);

  useEffect(() => {
    loadDeliveryPartners();
  }, [loadDeliveryPartners]);

  async function updateOrderStatus(order, newStatus) {
    if (updatingOrderId !== null || assigningOrderId !== null) return;

    if (newStatus === "cancelled") {
      const confirmed = window.confirm(
        `Are you sure you want to cancel order #${getOrderId(order)}?`
      );

      if (!confirmed) return;
    }

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setActionError("Your session has expired. Please log in again.");
      return;
    }

    setUpdatingOrderId(order.id);
    setActionError("");
    setActionMessage("");

    try {
      const updatedOrder = await fetchAPI(
        `/orders/${order.id}/status/`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        }
      );

      setActionMessage(
        `Order #${getOrderId(order)} updated to "${formatStatus(
          updatedOrder.status
        )}".`
      );

      await onRefresh();
    } catch (err) {
      setActionError(
        err.message || "Unable to update the order status."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function assignDeliveryPartner(order) {
    if (assigningOrderId !== null || updatingOrderId !== null) return;

    const partnerId = selectedPartners[order.id];

    if (!partnerId) {
      setActionError("Please select a delivery partner first.");
      return;
    }

    const partner = deliveryPartners.find(
      (item) => String(item.id) === String(partnerId)
    );

    if (!partner) {
      setActionError("The selected delivery partner was not found.");
      return;
    }

    const confirmed = window.confirm(
      `Assign order #${getOrderId(order)} to ${partner.name}?`
    );

    if (!confirmed) return;

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setActionError("Your session has expired. Please log in again.");
      return;
    }

    setAssigningOrderId(order.id);
    setActionError("");
    setActionMessage("");

    try {
      await fetchAPI(
        `/orders/${order.id}/assign-delivery/`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({
            delivery_partner_id: Number(partnerId),
          }),
        }
      );

      setLocallyAssignedPartners((previous) => ({
        ...previous,
        [order.id]: partner,
      }));

      setSelectedPartners((previous) => {
        const updated = { ...previous };
        delete updated[order.id];
        return updated;
      });

      setActionMessage(
        `Order #${getOrderId(order)} assigned to ${partner.name} successfully.`
      );

      await onRefresh();
    } catch (err) {
      setActionError(
        err.message || "Unable to assign delivery partner."
      );
    } finally {
      setAssigningOrderId(null);
    }
  }

  const filteredOrders = orders.filter((order) => {
    const searchableText = [
      getOrderId(order),
      getCustomerName(order),
      order.status,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(
      searchTerm.trim().toLowerCase()
    );

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <section className="owner-panel">
      <div className="owner-panel-heading">
        <div>
          <h2>Restaurant Orders</h2>
          <p>
            Review incoming orders, update preparation status, and assign
            delivery partners.
          </p>
        </div>

        <button
          type="button"
          className="owner-refresh-button"
          onClick={() => {
            onRefresh();
            loadDeliveryPartners();
          }}
          disabled={updatingOrderId !== null || assigningOrderId !== null}
        >
          ↻ Refresh
        </button>
      </div>

      {actionError && (
        <div className="owner-alert" role="alert">
          <strong>Action failed</strong>
          <p>{actionError}</p>
          <button type="button" onClick={() => setActionError("")}>
            Dismiss
          </button>
        </div>
      )}

      {actionMessage && (
        <div
          role="status"
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "8px",
            background: "#edf8ef",
            color: "#236b35",
          }}
        >
          {actionMessage}
        </div>
      )}

      <div className="owner-order-filters">
        <input
          type="search"
          placeholder="Search order or customer..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          aria-label="Search orders"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter orders by status"
        >
          <option value="all">All Statuses</option>

          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loadingPartners && (
        <p className="owner-muted">Loading delivery partners...</p>
      )}

      {!loadingPartners && deliveryPartners.length === 0 && (
        <div className="owner-information-note">
          No active delivery partners were found. Make sure at least one
          active account has the delivery_partner role.
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <EmptyState
          title={orders.length ? "No matching orders" : "No orders yet"}
          message={
            orders.length
              ? "Try changing your search or status filter."
              : "Orders placed for your restaurant will appear here."
          }
        />
      ) : (
        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Order Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Order Actions</th>
                <th>Delivery Partner</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => {
                const status = String(order.status || "").toLowerCase();
                const actions = RESTAURANT_ACTIONS[status] || [];
                const isUpdating = updatingOrderId === order.id;

                const serverPartnerId = getAssignedPartnerId(order);
                const localPartner = locallyAssignedPartners[order.id];

                const assignedPartnerId =
                  serverPartnerId ?? localPartner?.id ?? null;

                const serverPartner =
                  serverPartnerId !== null
                    ? deliveryPartners.find(
                        (partner) =>
                          String(partner.id) === String(serverPartnerId)
                      )
                    : null;

                const assignedPartner =
                  serverPartner || localPartner || null;

                const canAssign = [
                  "confirmed",
                  "preparing",
                  "ready",
                ].includes(status);

                return (
                  <tr key={order.id}>
                    <td>#{getOrderId(order)}</td>

                    <td>{getCustomerName(order)}</td>

                    <td>
                      {formatDate(order.created_at || order.order_date)}
                    </td>

                    <td>{formatCurrency(getOrderTotal(order))}</td>

                    <td>
                      <StatusBadge status={order.status} />
                    </td>

                    <td>
                      {actions.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "8px",
                            minWidth: "150px",
                          }}
                        >
                          {actions.map((action) => (
                            <button
                              key={action.status}
                              type="button"
                              className={
                                action.primary
                                  ? "owner-primary"
                                  : "owner-secondary"
                              }
                              disabled={
                                updatingOrderId !== null ||
                                assigningOrderId !== null
                              }
                              onClick={() =>
                                updateOrderStatus(order, action.status)
                              }
                              style={
                                action.status === "cancelled"
                                  ? { color: "#c62828" }
                                  : undefined
                              }
                            >
                              {isUpdating ? "Updating..." : action.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="owner-muted">
                          {status === "ready"
                            ? "Ready for delivery"
                            : status === "out_for_delivery" ||
                                status === "picked_up"
                              ? "With delivery"
                              : status === "delivered"
                                ? "Completed"
                                : status === "cancelled"
                                  ? "Cancelled"
                                  : "No actions available"}
                        </span>
                      )}
                    </td>

                    <td>
                      {assignedPartnerId !== null ? (
                        <div style={{ minWidth: "160px" }}>
                          <strong>
                            {assignedPartner?.name ||
                              `Partner #${assignedPartnerId}`}
                          </strong>
                          {assignedPartner?.email && (
                            <p
                              className="owner-muted"
                              style={{ margin: "4px 0 0", fontSize: "12px" }}
                            >
                              {assignedPartner.email}
                            </p>
                          )}
                          <p
                            style={{
                              margin: "5px 0 0",
                              color: "#236b35",
                              fontSize: "12px",
                            }}
                          >
                            Assigned
                          </p>
                        </div>
                      ) : !canAssign ? (
                        <span className="owner-muted">
                          {status === "placed"
                            ? "Confirm order first"
                            : "Not available for assignment"}
                        </span>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            minWidth: "190px",
                          }}
                        >
                          <select
                            aria-label={`Delivery partner for order ${order.id}`}
                            value={selectedPartners[order.id] || ""}
                            onChange={(event) => {
                              setSelectedPartners((previous) => ({
                                ...previous,
                                [order.id]: event.target.value,
                              }));
                              setActionError("");
                              setActionMessage("");
                            }}
                            disabled={
                              loadingPartners ||
                              assigningOrderId !== null ||
                              updatingOrderId !== null ||
                              deliveryPartners.length === 0
                            }
                          >
                            <option value="">
                              Select delivery partner
                            </option>

                            {deliveryPartners.map((partner) => (
                              <option
                                key={partner.id}
                                value={partner.id}
                              >
                                {partner.name} ({partner.email})
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className="owner-primary"
                            disabled={
                              !selectedPartners[order.id] ||
                              loadingPartners ||
                              assigningOrderId !== null ||
                              updatingOrderId !== null
                            }
                            onClick={() => assignDeliveryPartner(order)}
                          >
                            {assigningOrderId === order.id
                              ? "Assigning..."
                              : "Assign Partner"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="owner-information-note">
        Restaurant owners can assign delivery partners to confirmed,
        preparing, and ready orders. The backend validates every assignment
        and status change.
      </p>
    </section>
  );
}

function StatCard({ icon, color, label, value, description }) {
  return (
    <article className="owner-stat-card">
      <div className={`owner-stat-icon ${color}`}>{icon}</div>

      <div className="owner-stat-content">
        <p>{label}</p>
        <h3>{value}</h3>
        <span>{description}</span>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const normalizedStatus = String(status || "pending")
    .toLowerCase()
    .replaceAll(" ", "_");

  const label =
    STATUS_LABELS[normalizedStatus] ||
    ({
      active: "Active",
      inactive: "Inactive",
      available: "Available",
      unavailable: "Unavailable",
    }[normalizedStatus] || formatStatus(normalizedStatus));

  return (
    <span className={`owner-status owner-status-${normalizedStatus}`}>
      {label}
    </span>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="owner-detail-item">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="owner-empty-state">
      <div className="owner-empty-icon">☷</div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}
