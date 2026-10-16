import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DeliveryPartnerDashboard.css";

const API_URL = "http://127.0.0.1:8000/api";

const STATUS_LABELS = {
  placed: "Order Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for Pickup",
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
    throw new Error("Your session has expired. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error("You are not authorized to perform this action.");
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

function getStatus(order) {
  return String(order.status || "unknown").toLowerCase();
}

function formatStatus(status) {
  return (
    STATUS_LABELS[status] ||
    String(status)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function getOrderTotal(order) {
  return order.total_amount ?? order.total_price ?? order.total ?? 0;
}

function getRestaurantName(order) {
  return order.restaurant?.name || order.restaurant_name || "Restaurant";
}

function getCustomerName(order) {
  return (
    order.customer?.name ||
    order.customer_name ||
    order.user?.name ||
    "Customer"
  );
}

function getOrderItems(order) {
  if (!Array.isArray(order.items)) return [];

  return order.items.map((item) => {
    const name =
      item.food_name ||
      item.menu_item_name ||
      item.menu_item?.name ||
      item.name ||
      "Food item";

    return `${name} × ${item.quantity || 1}`;
  });
}

function getStatusAction(order) {
  const status = getStatus(order);

  // The backend's supported transition is ready -> out_for_delivery.
  if (status === "ready") {
    return {
      nextStatus: "out_for_delivery",
      label: "Pick Up Order",
    };
  }

  // Some implementations may store the pickup status explicitly.
  if (status === "picked_up") {
    return {
      nextStatus: "out_for_delivery",
      label: "Start Delivery",
    };
  }

  if (status === "out_for_delivery") {
    return {
      nextStatus: "delivered",
      label: "Mark as Delivered",
    };
  }

  return null;
}

function DeliveryPartnerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadOrders = useCallback(async (showLoader = true) => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setError("Please log in to view your deliveries.");
      setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);
    setError("");

    try {
      const data = await fetchAPI("/orders/delivery/", token);
      setOrders(getList(data));
      setUser(() => {
        try {
          return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
          return null;
        }
      });
    } catch (err) {
      setError(err.message || "Unable to load deliveries.");
    } finally {
      setLoading(false);
    }
  }, []);


    useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
        setError("No login token found. Please log in as a delivery partner.");
        setLoading(false);
        return;
    }

    if (!user) {
        setError("Your saved user information is missing. Please log in again.");
        setLoading(false);
        return;
    }

    const role = String(user.role || "").trim().toLowerCase();

    if (role !== "delivery_partner") {
        setError(
        `Wrong account role: "${role || "missing"}". Please log in using a delivery partner account.`
        );
        setLoading(false);
        return;
    }

    loadOrders();
    }, [user?.role, loadOrders]);


  async function updateOrderStatus(order, nextStatus) {
    if (updatingOrderId !== null) return;

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setActionError("Please log in again.");
      return;
    }

    const confirmMessage =
      nextStatus === "out_for_delivery"
        ? `Confirm that you have collected order #${order.id} from the restaurant and are starting delivery?`
        : `Confirm that order #${order.id} has been delivered to the customer?`;

    if (!window.confirm(confirmMessage)) return;

    setUpdatingOrderId(order.id);
    setActionError("");
    setActionMessage("");

    try {
      const updatedOrder = await fetchAPI(
        `/orders/${order.id}/status/`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      setActionMessage(
        `Order #${order.id} updated to "${formatStatus(
          updatedOrder?.status || nextStatus
        )}".`
      );

      await loadOrders(false);
    } catch (err) {
      setActionError(
        err.message || "Unable to update this delivery."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    navigate("/");
  }

  const activeOrders = orders.filter((order) =>
    [
      "assigned",
      "confirmed",
      "preparing",
      "ready",
      "picked_up",
      "out_for_delivery",
    ].includes(getStatus(order))
  );

  const completedOrders = orders.filter(
    (order) => getStatus(order) === "delivered"
  );

  const visibleOrders =
    activeTab === "active"
      ? activeOrders
      : activeTab === "completed"
        ? completedOrders
        : orders;

  return (
    <main className="delivery-dashboard">
      <header className="delivery-header">
        <div className="delivery-brand">
          <div className="delivery-brand-icon">F</div>
          <div>
            <h1>FoodSwift</h1>
            <p>Delivery Partner Portal</p>
          </div>
        </div>

        <div className="delivery-account">
          <div className="delivery-avatar">
            {(user?.name || "D").charAt(0).toUpperCase()}
          </div>

          <div className="delivery-account-info">
            <strong>{user?.name || "Delivery Partner"}</strong>
            <span>Delivery Partner</span>
          </div>

          <button
            type="button"
            className="delivery-logout"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </header>

      <section className="delivery-welcome">
        <div>
          <span className="delivery-eyebrow">PARTNER DASHBOARD</span>
          <h2>Ready for your next delivery?</h2>
          <p>Manage assigned orders, collect food, and complete deliveries.</p>
        </div>

        <button
          type="button"
          className="delivery-refresh"
          onClick={() => loadOrders()}
          disabled={loading || updatingOrderId !== null}
        >
          {loading ? "Refreshing..." : "↻ Refresh orders"}
        </button>
      </section>

      <section className="delivery-stats">
        <article className="delivery-stat-card">
          <span className="delivery-stat-icon">▤</span>
          <p>Total assigned orders</p>
          <strong>{orders.length}</strong>
          <small>Orders visible to you</small>
        </article>

        <article className="delivery-stat-card">
          <span className="delivery-stat-icon">↗</span>
          <p>Active deliveries</p>
          <strong>{activeOrders.length}</strong>
          <small>Orders in progress</small>
        </article>

        <article className="delivery-stat-card">
          <span className="delivery-stat-icon">✓</span>
          <p>Completed deliveries</p>
          <strong>{completedOrders.length}</strong>
          <small>Successfully delivered</small>
        </article>
      </section>

      <section className="delivery-orders-section">
        <div className="delivery-section-heading">
          <div>
            <h2>My Deliveries</h2>
            <p>Orders assigned to your account</p>
          </div>
        </div>

        <nav className="delivery-tabs">
          {[
            { id: "all", label: "All Orders" },
            { id: "active", label: "Active" },
            { id: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={activeTab === tab.id ? "selected" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {actionError && (
          <div className="delivery-message delivery-error" role="alert">
            <h3>Action failed</h3>
            <p>{actionError}</p>
            <button type="button" onClick={() => setActionError("")}>
              Dismiss
            </button>
          </div>
        )}

        {actionMessage && (
          <div className="delivery-action-success" role="status">
            {actionMessage}
          </div>
        )}

        {loading ? (
          <div className="delivery-message">
            <div className="delivery-spinner" />
            <p>Loading your deliveries...</p>
          </div>
        ) : error ? (
          <div className="delivery-message delivery-error">
            <h3>Unable to load deliveries</h3>
            <p>{error}</p>
            <button type="button" onClick={() => loadOrders()}>
              Try again
            </button>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="delivery-message">
            <div className="delivery-empty-icon">▤</div>
            <h3>
              {activeTab === "completed"
                ? "No completed deliveries yet"
                : activeTab === "active"
                  ? "No active deliveries"
                  : "No orders assigned yet"}
            </h3>
            <p>
              Orders assigned by a restaurant will appear here. Refresh to
              check for new assignments.
            </p>
            <button type="button" onClick={() => loadOrders()}>
              Refresh orders
            </button>
          </div>
        ) : (
          <div className="delivery-order-list">
            {visibleOrders.map((order) => {
              const status = getStatus(order);
              const action = getStatusAction(order);
              const isUpdating = updatingOrderId === order.id;
              const items = getOrderItems(order);

              return (
                <article className="delivery-order-card" key={order.id}>
                  <div className="delivery-order-top">
                    <div>
                      <span className="delivery-order-label">ORDER ID</span>
                      <h3>#{order.id}</h3>
                    </div>

                    <span
                      className={`delivery-status status-${status.replace(
                        /[^a-z0-9_-]/g,
                        ""
                      )}`}
                    >
                      {formatStatus(status)}
                    </span>
                  </div>

                  <div className="delivery-order-details">
                    <div>
                      <span>Restaurant</span>
                      <strong>{getRestaurantName(order)}</strong>
                    </div>

                    <div>
                      <span>Customer</span>
                      <strong>{getCustomerName(order)}</strong>
                    </div>

                    <div>
                      <span>Order total</span>
                      <strong>{formatCurrency(getOrderTotal(order))}</strong>
                    </div>
                  </div>

                  {order.delivery_address && (
                    <div className="delivery-address">
                      <span>Delivery address</span>
                      <p>{order.delivery_address}</p>
                    </div>
                  )}

                  {order.customer_phone && (
                    <div className="delivery-address">
                      <span>Customer phone</span>
                      <p>{order.customer_phone}</p>
                    </div>
                  )}

                  {items.length > 0 && (
                    <div className="delivery-items">
                      <span>Order items</span>
                      <p>{items.join(", ")}</p>
                    </div>
                  )}

                  {action && (
                    <div className="delivery-order-actions">
                      <button
                        type="button"
                        className="delivery-action-button"
                        disabled={updatingOrderId !== null}
                        onClick={() =>
                          updateOrderStatus(order, action.nextStatus)
                        }
                      >
                        {isUpdating ? "Updating..." : action.label}
                      </button>
                    </div>
                  )}

                  {status === "delivered" && (
                    <div className="delivery-completed-note">
                      ✓ Delivery completed successfully
                    </div>
                  )}

                  {status === "cancelled" && (
                    <div className="delivery-cancelled-note">
                      This order has been cancelled.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="delivery-footer">
        FoodSwift Delivery Partner Portal
      </footer>
    </main>
  );
}

export default DeliveryPartnerDashboard;