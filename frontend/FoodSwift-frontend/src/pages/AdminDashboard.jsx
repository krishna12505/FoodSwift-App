import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API_URL = "http://127.0.0.1:8000/api";

const navigation = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "users", label: "Users", icon: "♙" },
  { id: "restaurants", label: "Restaurants", icon: "♨" },
  { id: "orders", label: "Orders", icon: "▤" },
  { id: "reviews", label: "Reviews", icon: "☆" },
  { id: "reports", label: "Reports", icon: "▥" },
];

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "#fff",
  fontSize: 14,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left",
};

const cellStyle = {
  padding: "14px 12px",
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
};

const headingStyle = {
  padding: "14px 12px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f8fafc",
  whiteSpace: "nowrap",
};

const orderStatuses = [
  "placed",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const paymentStatuses = ["pending", "paid", "failed", "refunded"];

const formatLabel = (value) =>
  String(value || "—")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const initialRestaurantForm = {
  owner: "",
  name: "",
  description: "",
  cuisine: "",
  address: "",
  city: "Hyderabad",
  image: "",
  phone: "",
  opening_time: "09:00",
  closing_time: "23:00",
  is_open: true,
  is_active: false,
};

function AdminDashboard() {
  const [activePage, setActivePage] = useState("overview");

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);
  const [restaurantsError, setRestaurantsError] = useState("");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [restaurantStatus, setRestaurantStatus] = useState("all");
  const [restaurantVerificationFilter, setRestaurantVerificationFilter] =
  useState("all");

  // Add restaurant form
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState(initialRestaurantForm);
  const [restaurantSaving, setRestaurantSaving] = useState(false);
  const [restaurantFormError, setRestaurantFormError] = useState("");
  const [restaurantFormSuccess, setRestaurantFormSuccess] = useState("");
  const [restaurantOwners, setRestaurantOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [verifyingRestaurantId, setVerifyingRestaurantId] = useState(null);

  // Orders
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({
    total_reviews: 0,
    average_rating: 0,
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewRatingFilter, setReviewRatingFilter] = useState("all");
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  // Reports
  const [reportData, setReportData] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");



  const navigate = useNavigate();

  const getToken = useCallback(
    () => localStorage.getItem("accessToken"),
    []
  );

  const getAuthHeaders = useCallback(() => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const changePage = (page) => {
    setSelectedOrder(null);
    setActivePage(page);
  };

  // Dashboard statistics
  useEffect(() => {
    let active = true;

    async function fetchDashboardStats() {
      try {
        if (!getToken()) {
          navigate("/", { replace: true });
          return;
        }

        const response = await fetch(
          `${API_URL}/account/admin/dashboard-stats/`,
          { headers: getAuthHeaders() }
        );

        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Admin access denied. Sign in with your admin account."
          );
        }

        if (!response.ok) {
          throw new Error(
            `Unable to load dashboard statistics (${response.status}).`
          );
        }

        const data = await response.json();
        if (active) {
          setStats(data);
          setError("");
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load statistics.");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDashboardStats();
    return () => {
      active = false;
    };
  }, [navigate, getToken, getAuthHeaders]);

  // Registered users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");

    try {
      if (!getToken()) {
        navigate("/", { replace: true });
        return;
      }

      const response = await fetch(`${API_URL}/account/admin/users/`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Admin access denied. Please sign in again.");
      }
      if (!response.ok) {
        throw new Error(`Unable to load users (${response.status}).`);
      }

      const data = await response.json();
      setUsers(
        Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : []
      );
    } catch (err) {
      setUsersError(err.message || "Unable to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, [getToken, getAuthHeaders, navigate]);

  useEffect(() => {
    if (activePage === "users") fetchUsers();
  }, [activePage, fetchUsers]);

  // Fetch all restaurants, including inactive ones
  const fetchRestaurants = useCallback(async () => {
    setRestaurantsLoading(true);
    setRestaurantsError("");

    try {
      if (!getToken()) {
        navigate("/", { replace: true });
        return false;
      }

      const response = await fetch(
        `${API_URL}/restaurants/admin/restaurants/`,
        { headers: getAuthHeaders() }
      );

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Admin access denied. Sign in again with your admin account."
        );
      }
      if (!response.ok) {
        throw new Error(`Unable to load restaurants (${response.status}).`);
      }

      const data = await response.json();
      
      const restaurantList = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : [];

      setRestaurants(restaurantList);
      return true;

    } catch (err) {
      setRestaurantsError(err.message || "Unable to load restaurants.");
      return false;
    } finally {
      setRestaurantsLoading(false);
    }
  }, [getToken, getAuthHeaders, navigate]);

  useEffect(() => {
    if (activePage === "restaurants") fetchRestaurants();
  }, [activePage, fetchRestaurants]);

  // Load registered restaurant owners for the form
  
    const fetchRestaurantOwners = useCallback(async () => {
      setOwnersLoading(true);
      setRestaurantFormError("");

      try {
        if (!getToken()) {
          navigate("/", { replace: true });
          return;
        }

        const response = await fetch(`${API_URL}/account/admin/users/`, {
          headers: getAuthHeaders(),
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Admin access denied. Please sign in again."
          );
        }

        if (!response.ok) {
          throw new Error(
            `Unable to load restaurant owners (${response.status}).`
          );
        }

        const data = await response.json();

        const userList = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : [];

        const owners = userList.filter(
          (user) => user.role === "restaurant_owner"
        );

        setRestaurantOwners(owners);
      } catch (err) {
        setRestaurantFormError(
          err.message || "Unable to load restaurant owners."
        );
      } finally {
        setOwnersLoading(false);
      }
    }, [getToken, getAuthHeaders, navigate]);

  const openRestaurantForm = () => {
    setRestaurantForm(initialRestaurantForm);
    setRestaurantFormError("");
    setRestaurantFormSuccess("");
    setShowRestaurantForm(true);
    fetchRestaurantOwners();
  };

  const updateRestaurantField = (event) => {
    const { name, value, type, checked } = event.target;

    setRestaurantForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Create restaurant through the admin API
  const handleCreateRestaurant = async (event) => {
    event.preventDefault();
    setRestaurantFormError("");
    setRestaurantFormSuccess("");

    if (!restaurantForm.owner) {
      setRestaurantFormError("Please select a restaurant owner.");
      return;
    }

    if (
      restaurantForm.opening_time &&
      restaurantForm.closing_time &&
      restaurantForm.opening_time === restaurantForm.closing_time
    ) {
      setRestaurantFormError(
        "Opening and closing times cannot be identical."
      );
      return;
    }

    setRestaurantSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/restaurants/admin/restaurants/`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...restaurantForm,
            owner: Number(restaurantForm.owner),
            image: restaurantForm.image.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Admin permission denied. Check your admin login and backend permissions."
        );
      }

      if (response.status === 405) {
        throw new Error(
          "The backend admin endpoint currently supports GET only. Add POST support to AdminRestaurantListView before creating restaurants."
        );
      }

      if (!response.ok) {
        const details =
          typeof data === "object"
            ? Object.entries(data)
                .map(([key, value]) => {
                  const message = Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "string"
                      ? value
                      : JSON.stringify(value);
                  return `${key}: ${message}`;
                })
                .join(" | ")
            : "";

        throw new Error(
          details || `Unable to create restaurant (${response.status}).`
        );
      }

      setRestaurantFormSuccess("Restaurant created successfully.");
      setRestaurantForm(initialRestaurantForm);
      await fetchRestaurants();
    } catch (err) {
      setRestaurantFormError(
        err.message || "Unable to create restaurant."
      );
    } finally {
      setRestaurantSaving(false);
    }
  };

  
  // Admin: approve, reject, or request more information
  
  // Admin: approve, reject, or request more information
  const handleRestaurantVerification = async (restaurant, newStatus) => {
    let notes = "";

    if (newStatus === "rejected" || newStatus === "needs_info") {
      const promptMessage =
        newStatus === "rejected"
          ? "Enter the reason for rejecting this restaurant:"
          : "Enter the additional information required:";

      const input = window.prompt(promptMessage);

      if (input === null) return;

      notes = input.trim();

      if (!notes) {
        window.alert("Please provide a reason or instructions.");
        return;
      }
    } else if (newStatus === "approved") {
      const confirmed = window.confirm(
        `Approve "${restaurant.name}" for FoodSwift?`
      );

      if (!confirmed) return;
    }

    if (verifyingRestaurantId !== null) return;

    setVerifyingRestaurantId(restaurant.id);

    setRestaurantsError("");

    try {
      const response = await fetch(
        `${API_URL}/restaurants/admin/restaurants/${restaurant.id}/verify/`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            verification_status: newStatus,
            verification_notes: notes,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Admin access denied. Please sign in with your admin account."
        );
      }

      if (!response.ok) {
        const details =
          typeof data === "object" && data !== null
            ? Object.entries(data)
                .map(([key, value]) => {
                  const message = Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "string"
                      ? value
                      : JSON.stringify(value);

                  return `${key}: ${message}`;
                })
                .join(" | ")
            : "";

        throw new Error(
          details || `Verification failed (${response.status}).`
        );
      }

      // The verification API succeeded. Refresh the restaurant list.
      const refreshed = await fetchRestaurants();

      if (refreshed) {
        window.alert(
          `"${restaurant.name}" verification updated to ${formatLabel(newStatus)}.`
        );
      } else {
        window.alert(
          `"${restaurant.name}" verification was updated, but the restaurant list could not refresh. Click Refresh Restaurants to try again.`
        );
      }
    } catch (err) {
      setRestaurantsError(
        err.message || "Unable to update restaurant verification."
      );
    } finally {
      setVerifyingRestaurantId(null);
    }
  };


  // Admin orders
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError("");

    try {
      if (!getToken()) {
        navigate("/", { replace: true });
        return;
      }

      const response = await fetch(`${API_URL}/orders/admin/orders/`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Admin access denied. Please sign in again.");
      }
      if (!response.ok) {
        throw new Error(`Unable to load orders (${response.status}).`);
      }

      const data = await response.json();

      setOrders(
        Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : []
      );
    } catch (err) {
      setOrdersError(err.message || "Unable to load orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, [getToken, getAuthHeaders, navigate]);

  useEffect(() => {
    if (activePage === "orders") fetchOrders();
  }, [activePage, fetchOrders]);

  
  // Admin: fetch all food reviews
  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError("");

    try {
      if (!getToken()) {
        navigate("/", { replace: true });
        return;
      }

      const response = await fetch(`${API_URL}/reviews/admin/`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Admin access denied. Please sign in with your admin account."
        );
      }

      if (!response.ok) {
        throw new Error(`Unable to load reviews (${response.status}).`);
      }

      const data = await response.json();

      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setReviewStats({
        total_reviews: Number(data.total_reviews || 0),
        average_rating: Number(data.average_rating || 0),
      });
    } catch (err) {
      setReviewsError(err.message || "Unable to load reviews.");
    } finally {
      setReviewsLoading(false);
    }
  }, [getToken, getAuthHeaders, navigate]);

  useEffect(() => {
    if (activePage === "reviews") {
      fetchReviews();
    }
  }, [activePage, fetchReviews]);

  
  // Admin: fetch order reports
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError("");

    try {
      if (!getToken()) {
        navigate("/", { replace: true });
        return;
      }

      const params = new URLSearchParams();

      if (reportStartDate) {
        params.set("start_date", reportStartDate);
      }

      if (reportEndDate) {
        params.set("end_date", reportEndDate);
      }

      const query = params.toString();
      const url = `${API_URL}/orders/admin/reports/${
        query ? `?${query}` : ""
      }`;

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Admin access denied. Please sign in again."
        );
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || `Unable to load reports (${response.status}).`
        );
      }

      setReportData(data);
    } catch (err) {
      setReportsError(err.message || "Unable to load reports.");
    } finally {
      setReportsLoading(false);
    }
  }, [
    getToken,
    getAuthHeaders,
    navigate,
    reportStartDate,
    reportEndDate,
  ]);

  // Load reports when the Reports page is opened
  useEffect(() => {
    if (activePage === "reports") {
      fetchReports();
    }
  }, [activePage, fetchReports]);


  // Admin: delete a review
  const handleDeleteReview = async (review) => {
    const confirmed = window.confirm(
      `Delete review #${review.id}? This action cannot be undone.`
    );

    if (!confirmed) return;
    if (deletingReviewId !== null) return;

    setDeletingReviewId(review.id);
    setReviewsError("");

    try {
      const response = await fetch(
        `${API_URL}/reviews/admin/${review.id}/`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        throw new Error("Admin access denied. Please sign in again.");
      }

      if (!response.ok) {
        throw new Error(
          data.detail || `Unable to delete review (${response.status}).`
        );
      }

      await fetchReviews();
    } catch (err) {
      setReviewsError(err.message || "Unable to delete review.");
    } finally {
      setDeletingReviewId(null);
    }
  };


  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("foodswift-auth-changed"));
    navigate("/", { replace: true });
  };

  const pageTitle =
    navigation.find((item) => item.id === activePage)?.label || "Overview";

  const statistics = [
    { label: "Total Users", value: stats?.total_users, icon: "♙" },
    { label: "Total Customers", value: stats?.total_customers, icon: "♙" },
    {
      label: "Restaurant Owners",
      value: stats?.total_restaurant_owners,
      icon: "♨",
    },
    {
      label: "Delivery Partners",
      value: stats?.total_delivery_partners,
      icon: "▤",
    },
  ];

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      String(user.name || "").toLowerCase().includes(search) ||
      String(user.email || "").toLowerCase().includes(search) ||
      String(user.id).includes(search);

    return (
      matchesSearch &&
      (roleFilter === "all" || user.role === roleFilter)
    );
  });

  
  const filteredRestaurants = restaurants.filter((restaurant) => {
    const search = restaurantSearch.trim().toLowerCase();

    const matchesSearch = [
      restaurant.name,
      restaurant.cuisine,
      restaurant.city,
      restaurant.address,
      restaurant.owner?.name,
      restaurant.owner?.email,
    ].some((value) =>
      String(value || "").toLowerCase().includes(search)
    );

    const matchesStatus =
      restaurantStatus === "all" ||
      (restaurantStatus === "active" && restaurant.is_active) ||
      (restaurantStatus === "inactive" && !restaurant.is_active);

    const matchesVerification =restaurantVerificationFilter === "all" ||
      (restaurant.verification_status || "pending") === restaurantVerificationFilter;

    return matchesSearch && matchesStatus && matchesVerification;
  });


  const filteredOrders = orders.filter((order) => {
    const search = orderSearch.trim().toLowerCase();

    const matchesSearch = [
      order.id,
      order.customer?.name,
      order.customer?.email,
      order.restaurant?.name,
      order.delivery_partner?.name,
      order.customer_phone,
    ].some((value) =>
      String(value ?? "").toLowerCase().includes(search)
    );

    return (
      matchesSearch &&
      (orderStatusFilter === "all" ||
        order.status === orderStatusFilter) &&
      (paymentStatusFilter === "all" ||
        order.payment_status === paymentStatusFilter)
    );
  });


  const filteredReviews = reviews.filter((review) => {
    const search = reviewSearch.trim().toLowerCase();

    const matchesSearch = [
      review.id,
      review.customer_name,
      review.customer,
      review.customer_email,
      review.food_item_name,
      review.food_item,
      review.review,
    ].some((value) =>
      String(value ?? "").toLowerCase().includes(search)
    );

    return (
      matchesSearch &&
      (
        reviewRatingFilter === "all" ||
        Number(review.rating) === Number(reviewRatingFilter)
      )
    );
  });


  const statusStyle = (enabled) => ({
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    color: enabled ? "#166534" : "#b91c1c",
    background: enabled ? "#dcfce7" : "#fee2e2",
    whiteSpace: "nowrap",
  });

  const orderBadgeStyle = (value) => {
    const colors = {
      placed: ["#92400e", "#fef3c7"],
      confirmed: ["#1d4ed8", "#dbeafe"],
      preparing: ["#6d28d9", "#ede9fe"],
      ready: ["#0f766e", "#ccfbf1"],
      out_for_delivery: ["#1d4ed8", "#dbeafe"],
      delivered: ["#166534", "#dcfce7"],
      cancelled: ["#b91c1c", "#fee2e2"],
      pending: ["#92400e", "#fef3c7"],
      paid: ["#166534", "#dcfce7"],
      failed: ["#b91c1c", "#fee2e2"],
      refunded: ["#6d28d9", "#ede9fe"],
    };

    const [color, background] = colors[value] || ["#374151", "#f3f4f6"];

    return {
      display: "inline-block",
      padding: "5px 9px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      color,
      background,
      whiteSpace: "nowrap",
    };
  };

  const orderSummary = [
    {
      label: "Total Orders",
      value: orders.length,
      detail: "All recorded orders",
    },
    {
      label: "Placed",
      value: orders.filter((order) => order.status === "placed").length,
      detail: "Awaiting confirmation",
    },
    {
      label: "Delivered",
      value: orders.filter((order) => order.status === "delivered").length,
      detail: "Successfully delivered",
    },
    {
      label: "Cancelled",
      value: orders.filter((order) => order.status === "cancelled").length,
      detail: "Cancelled orders",
    },
  ];

  const primaryButtonStyle = {
    border: "none",
    borderRadius: 8,
    padding: "11px 16px",
    background: "linear-gradient(135deg, #ff9800, #ff7200)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  };

  const secondaryButtonStyle = {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "10px 15px",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/foodswifticon.png" alt="FoodSwift" />
          <div>
            <h2>FoodSwift</h2>
            <span>ADMINISTRATION</span>
          </div>
        </div>

        <div className="admin-nav-label">WORKSPACE</div>

        <nav className="admin-navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={activePage === item.id ? "active" : ""}
              onClick={() => changePage(item.id)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-profile">
            <div className="admin-avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <span>Platform Management</span>
            </div>
          </div>

          <button className="admin-logout" onClick={handleLogout}>
            ↪ Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-breadcrumb">FoodSwift / Admin</span>
            <h1>{pageTitle}</h1>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-status-dot" />
            <span>Management Portal</span>
          </div>
        </header>

        {/* Overview */}
        {activePage === "overview" && (
          <>
            <section className="admin-welcome">
              <div>
                <span className="admin-eyebrow">ADMINISTRATION CENTER</span>
                <h2>Welcome to FoodSwift</h2>
                <p>
                  Manage your food delivery platform from one central workspace.
                </p>
              </div>
              <div className="admin-welcome-symbol">FS</div>
            </section>

            {error && (
              <div role="alert" style={{ color: "#c62828", margin: "16px 0" }}>
                {error}
              </div>
            )}

            <section className="admin-stats">
              {statistics.map((stat) => (
                <article className="admin-stat-card" key={stat.label}>
                  <div className="admin-stat-top">
                    <span>{stat.label}</span>
                    <span className="admin-stat-icon">{stat.icon}</span>
                  </div>
                  <strong>{loading ? "Loading..." : stat.value ?? "—"}</strong>
                  <small>
                    {loading
                      ? "Fetching from backend..."
                      : stats
                        ? "Live database count"
                        : "Data unavailable"}
                  </small>
                </article>
              ))}
            </section>

            <section className="admin-content-card">
              <div className="admin-section-heading">
                <div>
                  <h2>Platform Management</h2>
                  <p>Select a module to manage FoodSwift.</p>
                </div>
              </div>

              <div className="admin-module-grid">
                {navigation
                  .filter((item) => item.id !== "overview")
                  .map((item) => (
                    <button
                      className="admin-module"
                      key={item.id}
                      onClick={() => changePage(item.id)}
                    >
                      <span className="admin-module-icon">{item.icon}</span>
                      <strong>{item.label}</strong>
                      <span>Open management →</span>
                    </button>
                  ))}
              </div>
            </section>
          </>
        )}

        {/* Users */}
        {activePage === "users" && (
          <section className="admin-content-card">
            <div className="admin-section-heading">
              <div>
                <h2>Registered Users</h2>
                <p>
                  View customer, restaurant owner, and delivery partner accounts.
                </p>
              </div>
              <button
                className="admin-primary-button"
                onClick={fetchUsers}
                disabled={usersLoading}
              >
                {usersLoading ? "Refreshing..." : "Refresh Users"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, email or ID..."
                aria-label="Search users"
                style={{ ...inputStyle, flex: "1 1 220px" }}
              />
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                aria-label="Filter users by role"
                style={{ ...inputStyle, flex: "1 1 220px" }}
              >
                <option value="all">All roles</option>
                <option value="customer">Customers</option>
                <option value="restaurant_owner">Restaurant Owners</option>
                <option value="delivery_partner">Delivery Partners</option>
              </select>
            </div>

            {usersLoading && <p>Loading registered users...</p>}
            {usersError && (
              <p role="alert" style={{ color: "#c62828" }}>{usersError}</p>
            )}

            {!usersLoading && !usersError && (
              <>
                <p style={{ marginBottom: 12 }}>
                  Showing {filteredUsers.length} of {users.length} users
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        {["ID", "Name", "Email", "Role", "Status"].map((heading) => (
                          <th key={heading} style={headingStyle}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td style={cellStyle}>{user.id}</td>
                          <td style={cellStyle}>{user.name || "—"}</td>
                          <td style={cellStyle}>{user.email}</td>
                          <td style={cellStyle}>{formatLabel(user.role)}</td>
                          <td style={cellStyle}>
                            <span style={statusStyle(user.is_active)}>
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ ...cellStyle, textAlign: "center" }}>
                            No users match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {/* Restaurants */}
        {activePage === "restaurants" && (
          <section className="admin-content-card">
            <div className="admin-section-heading">
              <div>
                <h2>Restaurant Management</h2>
                <p>Add restaurants and manage registered restaurant details.</p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="admin-primary-button"
                  onClick={fetchRestaurants}
                  disabled={restaurantsLoading}
                >
                  {restaurantsLoading ? "Refreshing..." : "Refresh Restaurants"}
                </button>
                <button
                  type="button"
                  style={primaryButtonStyle}
                  onClick={openRestaurantForm}
                >
                  + Add Restaurant
                </button>
              </div>
            </div>

            {restaurantFormSuccess && (
              <div
                role="status"
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 8,
                  background: "#dcfce7",
                  color: "#166534",
                }}
              >
                {restaurantFormSuccess}
              </div>
            )}

            {/* Add restaurant form */}
            {showRestaurantForm && (
              <section
                style={{
                  marginTop: 24,
                  padding: 22,
                  border: "1px solid #fed7aa",
                  borderRadius: 12,
                  background: "#fffaf5",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <h2 style={{ margin: "0 0 6px" }}>Add New Restaurant</h2>
                    <p style={{ margin: 0, color: "#777", fontSize: 14 }}>
                      Enter the restaurant information below.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close restaurant form"
                    style={secondaryButtonStyle}
                    onClick={() => setShowRestaurantForm(false)}
                  >
                    × Close
                  </button>
                </div>

                {restaurantFormError && (
                  <div
                    role="alert"
                    style={{
                      background: "#fef2f2",
                      color: "#b91c1c",
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 16,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {restaurantFormError}
                  </div>
                )}

                <form onSubmit={handleCreateRestaurant}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                      gap: 16,
                    }}
                  >
                    <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 600 }}>
                      Restaurant Owner *
                      <select
                        name="owner"
                        value={restaurantForm.owner}
                        onChange={updateRestaurantField}
                        required
                        style={inputStyle}
                        disabled={ownersLoading}
                      >
                        <option value="">
                          {ownersLoading ? "Loading owners..." : "Select restaurant owner"}
                        </option>
                        {restaurantOwners.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.name || owner.email} — {owner.email}
                          </option>
                        ))}
                      </select>
                      {!ownersLoading && restaurantOwners.length === 0 && (
                        <span style={{ color: "#b45309", fontWeight: 400 }}>
                          No restaurant-owner accounts found. Register an owner first.
                        </span>
                      )}
                    </label>

                    <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 600 }}>
                      Restaurant Name *
                      <input
                        name="name"
                        value={restaurantForm.name}
                        onChange={updateRestaurantField}
                        placeholder="e.g. Bawarchi"
                        required
                        maxLength={150}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 600 }}>
                      Cuisine *
                      <input
                        name="cuisine"
                        value={restaurantForm.cuisine}
                        onChange={updateRestaurantField}
                        placeholder="e.g. Indian, Biryani"
                        required
                        maxLength={100}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 600 }}>
                      Phone Number *
                      <input
                        name="phone"
                        type="tel"
                        value={restaurantForm.phone}
                        onChange={updateRestaurantField}
                        placeholder="Restaurant contact number"
                        required
                        maxLength={15}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 600 }}>
                      City *
                      <input
                        name="city"
                        value={restaurantForm.city}
                        onChange={updateRestaurantField}
                        required
                        maxLength={100}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 600 }}>
                      Restaurant Image URL
                      <input
                        name="image"
                        type="url"
                        value={restaurantForm.image}
                        onChange={updateRestaurantField}
                        placeholder="https://example.com/restaurant.jpg"
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 600 }}>
                      Opening Time
                      <input
                        name="opening_time"
                        type="time"
                        value={restaurantForm.opening_time}
                        onChange={updateRestaurantField}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 600 }}>
                      Closing Time
                      <input
                        name="closing_time"
                        type="time"
                        value={restaurantForm.closing_time}
                        onChange={updateRestaurantField}
                        style={inputStyle}
                      />
                    </label>

                    <label
                      style={{
                        display: "grid",
                        gap: 7,
                        fontSize: 13,
                        fontWeight: 600,
                        gridColumn: "1 / -1",
                      }}
                    >
                      Address *
                      <textarea
                        name="address"
                        value={restaurantForm.address}
                        onChange={updateRestaurantField}
                        placeholder="Full restaurant address"
                        required
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical" }}
                      />
                    </label>

                    <label
                      style={{
                        display: "grid",
                        gap: 7,
                        fontSize: 13,
                        fontWeight: 600,
                        gridColumn: "1 / -1",
                      }}
                    >
                      Description
                      <textarea
                        name="description"
                        value={restaurantForm.description}
                        onChange={updateRestaurantField}
                        placeholder="Describe the restaurant and its specialities"
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical" }}
                      />
                    </label>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 24,
                      flexWrap: "wrap",
                      marginTop: 20,
                    }}
                  >


                    <label style={{ display: "flex", gap: 9, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        name="is_open"
                        checked={restaurantForm.is_open}
                        onChange={updateRestaurantField}
                      />
                      Currently Open
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
                    <button
                      type="submit"
                      style={{
                        ...primaryButtonStyle,
                        opacity: restaurantSaving ? 0.7 : 1,
                      }}
                      disabled={restaurantSaving || ownersLoading}
                    >
                      {restaurantSaving ? "Saving Restaurant..." : "Save Restaurant"}
                    </button>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => {
                        setShowRestaurantForm(false);
                        setRestaurantFormError("");
                      }}
                      disabled={restaurantSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            )}

            <div className="admin-stats" style={{ margin: "20px 0" }}>
              <article className="admin-stat-card">
                <div className="admin-stat-top"><span>Total Restaurants</span></div>
                <strong>{restaurants.length}</strong>
                <small>Registered in database</small>
              </article>
              <article className="admin-stat-card">
                <div className="admin-stat-top"><span>Active Restaurants</span></div>
                <strong>{restaurants.filter((r) => r.is_active).length}</strong>
                <small>Available on the platform</small>
              </article>
              <article className="admin-stat-card">
                <div className="admin-stat-top"><span>Currently Open</span></div>
                <strong>
                  {restaurants.filter((r) => r.is_active && r.is_open).length}
                </strong>
                <small>Marked as open by the restaurant</small>
              </article>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
              <input
                type="search"
                value={restaurantSearch}
                onChange={(event) => setRestaurantSearch(event.target.value)}
                placeholder="Search name, cuisine, owner or city..."
                aria-label="Search restaurants"
                style={{ ...inputStyle, flex: "1 1 220px" }}
              />
              <select
                value={restaurantStatus}
                onChange={(event) => setRestaurantStatus(event.target.value)}
                aria-label="Filter restaurants by active status"
                style={{ ...inputStyle, flex: "1 1 220px" }}
              >
                <option value="all">All restaurants</option>
                <option value="active">Active restaurants</option>
                <option value="inactive">Inactive restaurants</option>
              </select>
              
              <select
                value={restaurantVerificationFilter}
                onChange={(event) =>
                  setRestaurantVerificationFilter(event.target.value)
                }
                aria-label="Filter restaurants by verification status"
                style={{ ...inputStyle, flex: "1 1 220px" }}
              >
                <option value="all">All verification statuses</option>
                <option value="pending">Pending Verification</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="needs_info">More Information Required</option>
              </select>

            </div>

            {restaurantsLoading && <p>Loading restaurants from database...</p>}

            {restaurantsError && (
              <div role="alert" style={{ color: "#c62828", margin: "16px 0" }}>
                {restaurantsError}
              </div>
            )}

            {!restaurantsLoading && !restaurantsError && (
              <>
                <p style={{ marginBottom: 12 }}>
                  Showing {filteredRestaurants.length} of {restaurants.length} restaurants
                </p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          {[
                            "Restaurant",
                            "Owner",
                            "Cuisine",
                            "Location",
                            "Contact",
                            "Opening Hours",
                            "Open Status",
                            "Account Status",
                            "Verification",
                            "Admin Notes",
                            "Actions",
                          ].map((heading) => (
                            <th key={heading} style={headingStyle}>
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {filteredRestaurants.map((restaurant) => {
                          const verificationColors = {
                            pending: ["#92400e", "#fef3c7"],
                            approved: ["#166534", "#dcfce7"],
                            rejected: ["#b91c1c", "#fee2e2"],
                            needs_info: ["#1d4ed8", "#dbeafe"],
                          };

                          const [verificationColor, verificationBackground] =
                            verificationColors[restaurant.verification_status] ||
                            ["#374151", "#f3f4f6"];

                          const actionButtonStyle = {
                            padding: "7px 10px",
                            border: "1px solid #ddd",
                            borderRadius: 7,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            background: "#fff",
                          };

                          return (
                            <tr key={restaurant.id}>
                              <td style={{ ...cellStyle, minWidth: 190 }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                  {restaurant.image && (
                                    <img
                                      src={restaurant.image}
                                      alt={restaurant.name}
                                      loading="lazy"
                                      onError={(event) => {
                                        event.currentTarget.style.display = "none";
                                      }}
                                      style={{
                                        width: 58,
                                        height: 52,
                                        borderRadius: 8,
                                        objectFit: "cover",
                                        background: "#f3f4f6",
                                      }}
                                    />
                                  )}

                                  <div>
                                    <strong>{restaurant.name}</strong>
                                    <div style={{ color: "#777", fontSize: 12 }}>
                                      ID: {restaurant.id}
                                    </div>
                                    <div style={{ color: "#777", fontSize: 12 }}>
                                      {restaurant.description || "No description"}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td style={{ ...cellStyle, minWidth: 170 }}>
                                <strong>{restaurant.owner?.name || "—"}</strong>
                                <div style={{ color: "#777", fontSize: 12 }}>
                                  {restaurant.owner?.email || "—"}
                                </div>
                              </td>

                              <td style={cellStyle}>{restaurant.cuisine || "—"}</td>

                              <td style={{ ...cellStyle, minWidth: 150 }}>
                                {restaurant.city || "—"}
                                <div style={{ color: "#777", fontSize: 12 }}>
                                  {restaurant.address || ""}
                                </div>
                              </td>

                              <td style={cellStyle}>{restaurant.phone || "—"}</td>

                              <td style={{ ...cellStyle, minWidth: 130, whiteSpace: "nowrap" }}>
                                {restaurant.opening_time || "—"} –{" "}
                                {restaurant.closing_time || "—"}
                              </td>

                              <td style={cellStyle}>
                                <span style={statusStyle(restaurant.is_open)}>
                                  {restaurant.is_open ? "Open" : "Closed"}
                                </span>
                              </td>

                              <td style={cellStyle}>
                                <span style={statusStyle(restaurant.is_active)}>
                                  {restaurant.is_active ? "Active" : "Inactive"}
                                </span>
                              </td>

                              <td style={{ ...cellStyle, minWidth: 170 }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "6px 10px",
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: verificationColor,
                                    background: verificationBackground,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatLabel(
                                    restaurant.verification_status || "pending"
                                  )}
                                </span>

                                {restaurant.verified_at && (
                                  <div style={{ color: "#777", fontSize: 11, marginTop: 6 }}>
                                    Verified: {formatDate(restaurant.verified_at)}
                                  </div>
                                )}
                              </td>

                              <td style={{ ...cellStyle, minWidth: 190 }}>
                                {restaurant.verification_notes ? (
                                  <span
                                    title={restaurant.verification_notes}
                                    style={{
                                      display: "block",
                                      maxWidth: 220,
                                      whiteSpace: "normal",
                                      overflowWrap: "anywhere",
                                      fontSize: 12,
                                      color: "#555",
                                    }}
                                  >
                                    {restaurant.verification_notes}
                                  </span>
                                ) : (
                                  <span style={{ color: "#999" }}>No notes</span>
                                )}
                              </td>

                              <td style={{ ...cellStyle, minWidth: 190 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                  {restaurant.verification_status !== "approved" && (
                                    <button
                                      type="button"
                                      style={{
                                        ...actionButtonStyle,
                                        borderColor: "#86efac",
                                        background: "#f0fdf4",
                                        color: "#166534",
                                      }}
                                      onClick={() =>
                                        handleRestaurantVerification(restaurant, "approved")
                                      }
                                    >
                                      ✓ Approve
                                    </button>
                                  )}

                                  {restaurant.verification_status !== "rejected" && (
                                    <button
                                      type="button"
                                      style={{
                                        ...actionButtonStyle,
                                        borderColor: "#fecaca",
                                        background: "#fef2f2",
                                        color: "#b91c1c",
                                      }}
                                      onClick={() =>
                                        handleRestaurantVerification(restaurant, "rejected")
                                      }
                                    >
                                      ✕ Reject
                                    </button>
                                  )}

                                  {restaurant.verification_status !== "needs_info" && (
                                    <button
                                      type="button"
                                      style={{
                                        ...actionButtonStyle,
                                        borderColor: "#bfdbfe",
                                        background: "#eff6ff",
                                        color: "#1d4ed8",
                                      }}
                                      onClick={() =>
                                        handleRestaurantVerification(restaurant, "needs_info")
                                      }
                                    >
                                      Request Information
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredRestaurants.length === 0 && (
                          <tr>
                            <td
                              colSpan={11}
                              style={{
                                ...cellStyle,
                                textAlign: "center",
                                padding: 28,
                              }}
                            >
                              No restaurants match your search or filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

              </>
            )}
          </section>
        )}

        {/* Orders */}
        {activePage === "orders" && (
          <section className="admin-content-card">
            <div className="admin-section-heading">
              <div>
                <h2>Order Management</h2>
                <p>Monitor customer orders, payments, and delivery assignments.</p>
              </div>
              <button
                className="admin-primary-button"
                onClick={fetchOrders}
                disabled={ordersLoading}
              >
                {ordersLoading ? "Refreshing..." : "↻ Refresh Orders"}
              </button>
            </div>

            <section className="admin-stats" style={{ margin: "20px 0" }}>
              {orderSummary.map((item) => (
                <article className="admin-stat-card" key={item.label}>
                  <div className="admin-stat-top"><span>{item.label}</span></div>
                  <strong>{ordersLoading ? "…" : item.value}</strong>
                  <small>{item.detail}</small>
                </article>
              ))}
            </section>

            {ordersError && (
              <div role="alert" style={{ color: "#b91c1c", background: "#fef2f2", padding: 14, borderRadius: 8, margin: "16px 0" }}>
                {ordersError}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
              <input
                type="search"
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
                placeholder="Search order ID, customer, restaurant..."
                aria-label="Search orders"
                style={{ ...inputStyle, flex: "1 1 220px" }}
              />
              <select
                value={orderStatusFilter}
                onChange={(event) => setOrderStatusFilter(event.target.value)}
                aria-label="Filter orders by status"
                style={{ ...inputStyle, flex: "1 1 220px" }}
              >
                <option value="all">All order statuses</option>
                {orderStatuses.map((status) => (
                  <option key={status} value={status}>{formatLabel(status)}</option>
                ))}
              </select>
              <select
                value={paymentStatusFilter}
                onChange={(event) => setPaymentStatusFilter(event.target.value)}
                aria-label="Filter orders by payment status"
                style={{ ...inputStyle, flex: "1 1 220px" }}
              >
                <option value="all">All payment statuses</option>
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>{formatLabel(status)}</option>
                ))}
              </select>
            </div>

            {ordersLoading && <p style={{ padding: 16 }}>Loading orders from the database...</p>}

            {!ordersLoading && !ordersError && (
              <>
                <p style={{ marginBottom: 12 }}>
                  Showing {filteredOrders.length} of {orders.length} orders
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        {[
                          "Order", "Customer", "Restaurant", "Items", "Total",
                          "Payment", "Order Status", "Delivery Partner", "Date", "Details",
                        ].map((heading) => (
                          <th key={heading} style={headingStyle}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td style={{ ...cellStyle, whiteSpace: "nowrap" }}><strong>#{order.id}</strong></td>
                          <td style={{ ...cellStyle, minWidth: 160 }}>
                            <strong>{order.customer?.name || "—"}</strong>
                            <div style={{ color: "#777", fontSize: 12 }}>{order.customer?.email || "—"}</div>
                            <div style={{ color: "#777", fontSize: 12 }}>{order.customer_phone || ""}</div>
                          </td>
                          <td style={{ ...cellStyle, minWidth: 130 }}>{order.restaurant?.name || "—"}</td>
                          <td style={cellStyle}>
                            {(order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
                          </td>
                          <td style={{ ...cellStyle, whiteSpace: "nowrap" }}><strong>{money(order.total_amount)}</strong></td>
                          <td style={{ ...cellStyle, minWidth: 115 }}>
                            <span style={orderBadgeStyle(order.payment_status)}>{formatLabel(order.payment_status)}</span>
                            <div style={{ color: "#777", fontSize: 12, marginTop: 5 }}>{formatLabel(order.payment_method)}</div>
                          </td>
                          <td style={cellStyle}><span style={orderBadgeStyle(order.status)}>{formatLabel(order.status)}</span></td>
                          <td style={{ ...cellStyle, minWidth: 140 }}>{order.delivery_partner?.name || "Unassigned"}</td>
                          <td style={{ ...cellStyle, minWidth: 145 }}>{formatDate(order.created_at)}</td>
                          <td style={cellStyle}>
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              style={{
                                padding: "8px 11px",
                                border: "1px solid #fed7aa",
                                borderRadius: 7,
                                background: "#fff7ed",
                                color: "#c2410c",
                                cursor: "pointer",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={10} style={{ ...cellStyle, textAlign: "center", padding: 32, color: "#777" }}>
                            {orders.length === 0 ? "No orders are available." : "No orders match your search or filters."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        
        {/* Reviews */}
        {activePage === "reviews" && (
          <section className="admin-content-card">
            <div className="admin-section-heading">
              <div>
                <h2>Customer Reviews</h2>
                <p>
                  Monitor customer feedback and manage inappropriate food reviews.
                </p>
              </div>

              <button
                className="admin-primary-button"
                onClick={fetchReviews}
                disabled={reviewsLoading}
              >
                {reviewsLoading ? "Refreshing..." : "↻ Refresh Reviews"}
              </button>
            </div>

            <section
              className="admin-stats"
              style={{ margin: "20px 0" }}
            >
              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>Total Reviews</span>
                </div>
                <strong>
                  {reviewsLoading ? "…" : reviewStats.total_reviews}
                </strong>
                <small>Reviews in the database</small>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>Average Rating</span>
                </div>
                <strong>
                  {reviewsLoading
                    ? "…"
                    : `${reviewStats.average_rating.toFixed(1)} / 5`}
                </strong>
                <small>Average across all reviews</small>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>5-Star Reviews</span>
                </div>
                <strong>
                  {reviewsLoading
                    ? "…"
                    : reviews.filter(
                        (review) => Number(review.rating) === 5
                      ).length}
                </strong>
                <small>Excellent food ratings</small>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>Low Ratings</span>
                </div>
                <strong>
                  {reviewsLoading
                    ? "…"
                    : reviews.filter(
                        (review) => Number(review.rating) <= 2
                      ).length}
                </strong>
                <small>Reviews rated 1 or 2 stars</small>
              </article>
            </section>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                margin: "20px 0",
              }}
            >
              <input
                type="search"
                value={reviewSearch}
                onChange={(event) => setReviewSearch(event.target.value)}
                placeholder="Search customer, food item or comment..."
                aria-label="Search reviews"
                style={{ ...inputStyle, flex: "1 1 240px" }}
              />

              <select
                value={reviewRatingFilter}
                onChange={(event) =>
                  setReviewRatingFilter(event.target.value)
                }
                aria-label="Filter reviews by rating"
                style={{ ...inputStyle, flex: "1 1 180px" }}
              >
                <option value="all">All ratings</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </div>

            {reviewsError && (
              <div
                role="alert"
                style={{
                  color: "#b91c1c",
                  background: "#fef2f2",
                  padding: 14,
                  borderRadius: 8,
                  margin: "16px 0",
                  overflowWrap: "anywhere",
                }}
              >
                {reviewsError}
              </div>
            )}

            {reviewsLoading && (
              <p>Loading customer reviews from the database...</p>
            )}

            {!reviewsLoading && !reviewsError && (
              <>
                <p style={{ marginBottom: 12 }}>
                  Showing {filteredReviews.length} of {reviews.length} reviews
                </p>

                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        {[
                          "Review ID",
                          "Customer",
                          "Food Item",
                          "Rating",
                          "Comment",
                          "Date",
                          "Actions",
                        ].map((heading) => (
                          <th key={heading} style={headingStyle}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredReviews.map((review) => (
                        <tr key={review.id}>
                          <td style={cellStyle}>
                            #{review.id}
                          </td>

                          <td style={{ ...cellStyle, minWidth: 140 }}>
                            <strong>
                              {review.customer_name || "Customer"}
                            </strong>
                            <div
                              style={{
                                color: "#777",
                                fontSize: 12,
                                marginTop: 4,
                              }}
                            >
                              Customer ID: {review.customer ?? "—"}
                            </div>
                          </td>

                          <td style={{ ...cellStyle, minWidth: 120 }}>
                            {review.food_item_name ||
                              `Food item #${review.food_item}`}
                          </td>

                          <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                            <span
                              style={{
                                color:
                                  Number(review.rating) <= 2
                                    ? "#b91c1c"
                                    : Number(review.rating) >= 4
                                      ? "#15803d"
                                      : "#92400e",
                                fontWeight: 700,
                              }}
                            >
                              {"★".repeat(
                                Math.max(
                                  0,
                                  Math.min(5, Number(review.rating) || 0)
                                )
                              )}
                              {"☆".repeat(
                                5 -
                                  Math.max(
                                    0,
                                    Math.min(5, Number(review.rating) || 0)
                                  )
                              )}
                            </span>
                            <div style={{ fontSize: 12, marginTop: 3 }}>
                              {review.rating}/5
                            </div>
                          </td>

                          <td
                            style={{
                              ...cellStyle,
                              minWidth: 220,
                              maxWidth: 320,
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {review.review?.trim() || (
                              <span style={{ color: "#999" }}>
                                No written comment
                              </span>
                            )}
                          </td>

                          <td style={{ ...cellStyle, minWidth: 145 }}>
                            {formatDate(review.created_at)}
                          </td>

                          <td style={cellStyle}>
                            <button
                              type="button"
                              disabled={deletingReviewId !== null}
                              onClick={() => handleDeleteReview(review)}
                              style={{
                                border: "1px solid #fecaca",
                                borderRadius: 7,
                                padding: "8px 10px",
                                background: "#fef2f2",
                                color: "#b91c1c",
                                cursor:
                                  deletingReviewId !== null
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  deletingReviewId !== null ? 0.6 : 1,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {deletingReviewId === review.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}

                      {filteredReviews.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              ...cellStyle,
                              textAlign: "center",
                              padding: 32,
                              color: "#777",
                            }}
                          >
                            {reviews.length === 0
                              ? "No customer reviews have been submitted yet."
                              : "No reviews match your search or rating filter."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}



        {/* Order details modal */}
        {activePage === "orders" && selectedOrder && (
          <div
            onClick={(event) => {
              if (event.target === event.currentTarget) setSelectedOrder(null);
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(15, 23, 42, 0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
              overflowY: "auto",
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-details-title"
              style={{
                width: "100%",
                maxWidth: 720,
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#fff",
                borderRadius: 14,
                padding: 24,
                boxShadow: "0 20px 60px rgba(0,0,0,.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, borderBottom: "1px solid #eee", paddingBottom: 16 }}>
                <div>
                  <h2 id="order-details-title" style={{ margin: "0 0 8px" }}>Order #{selectedOrder.id}</h2>
                  <span style={{ color: "#777", fontSize: 13 }}>Placed {formatDate(selectedOrder.created_at)}</span>
                </div>
                <button type="button" onClick={() => setSelectedOrder(null)} aria-label="Close order details" style={secondaryButtonStyle}>×</button>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "18px 0" }}>
                <span style={orderBadgeStyle(selectedOrder.status)}>{formatLabel(selectedOrder.status)}</span>
                <span style={orderBadgeStyle(selectedOrder.payment_status)}>Payment: {formatLabel(selectedOrder.payment_status)}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                <div style={{ background: "#f8fafc", padding: 16, borderRadius: 10 }}>
                  <h3 style={{ marginTop: 0 }}>Customer</h3>
                  <p><strong>{selectedOrder.customer?.name || "—"}</strong></p>
                  <p style={{ overflowWrap: "anywhere" }}>{selectedOrder.customer?.email || "—"}</p>
                  <p>{selectedOrder.customer_phone || "—"}</p>
                </div>
                <div style={{ background: "#f8fafc", padding: 16, borderRadius: 10 }}>
                  <h3 style={{ marginTop: 0 }}>Delivery</h3>
                  <p><strong>{selectedOrder.restaurant?.name || "—"}</strong></p>
                  <p style={{ overflowWrap: "anywhere" }}>{selectedOrder.delivery_address || "No address provided"}</p>
                  <p><strong>Partner: </strong>{selectedOrder.delivery_partner?.name || "Not assigned"}</p>
                  {selectedOrder.delivery_partner?.email && (
                    <p style={{ overflowWrap: "anywhere" }}>{selectedOrder.delivery_partner.email}</p>
                  )}
                </div>
              </div>

              <h3 style={{ marginTop: 24 }}>Ordered Items</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {["Item", "Unit Price", "Quantity", "Total"].map((heading) => (
                        <th key={heading} style={headingStyle}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((item) => (
                      <tr key={item.id}>
                        <td style={cellStyle}><strong>{item.item_name}</strong></td>
                        <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{money(item.unit_price)}</td>
                        <td style={cellStyle}>{item.quantity}</td>
                        <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{money(item.line_total)}</td>
                      </tr>
                    ))}
                    {(selectedOrder.items || []).length === 0 && (
                      <tr><td colSpan={4} style={cellStyle}>No item details available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ maxWidth: 320, marginLeft: "auto", marginTop: 18, padding: 16, background: "#fff7ed", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span>Subtotal</span><strong>{money(selectedOrder.subtotal)}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span>Delivery Fee</span><strong>{money(selectedOrder.delivery_fee)}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #fed7aa", fontSize: 18 }}>
                  <strong>Total</strong><strong>{money(selectedOrder.total_amount)}</strong>
                </div>
                <p style={{ marginBottom: 0, color: "#777", fontSize: 12 }}>Payment method: {formatLabel(selectedOrder.payment_method)}</p>
              </div>

              {selectedOrder.notes && (
                <div style={{ marginTop: 20 }}>
                  <h3>Order Notes</h3>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}

              <div style={{ marginTop: 22, textAlign: "right" }}>
                <button className="admin-primary-button" onClick={() => setSelectedOrder(null)}>Close Details</button>
              </div>
            </section>
          </div>
        )}

        {/* Reviews and Reports placeholders */}      
        
        {/* Reports */}
        {activePage === "reports" && (
          <section className="admin-content-card">
            <div className="admin-section-heading">
              <div>
                <h2>Platform Reports</h2>
                <p>
                  Monitor orders, revenue, payments, and restaurant activity.
                </p>
              </div>

              <button
                className="admin-primary-button"
                onClick={fetchReports}
                disabled={reportsLoading}
              >
                {reportsLoading ? "Loading..." : "↻ Refresh Reports"}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "end",
                margin: "24px 0",
              }}
            >
              <label style={{ flex: "1 1 180px" }}>
                <span style={{ display: "block", marginBottom: 7 }}>
                  Start Date
                </span>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(event) =>
                    setReportStartDate(event.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label style={{ flex: "1 1 180px" }}>
                <span style={{ display: "block", marginBottom: 7 }}>
                  End Date
                </span>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(event) =>
                    setReportEndDate(event.target.value)
                  }
                  style={inputStyle}
                />
              </label>
            </div>

            {reportsError && (
              <div
                role="alert"
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: "#fef2f2",
                  color: "#b91c1c",
                  marginBottom: 20,
                  overflowWrap: "anywhere",
                }}
              >
                {reportsError}
              </div>
            )}

            {reportsLoading && <p>Loading reports from the database...</p>}

            {!reportsLoading && !reportsError && reportData && (
              <>
                <section
                  className="admin-stats"
                  style={{ margin: "20px 0" }}
                >
                    {[
                      {
                        label: "Total Orders",
                        value: reportData.orders?.total_orders ?? 0,
                      },
                      {
                        label: "FoodSwift Commission Revenue",
                        value: money(
                          reportData.orders?.foodswift_commission ??
                          reportData.orders?.revenue ??
                          0
                        ),
                      },
                      {
                        label: "Total Paid Order Value",
                        value: money(reportData.orders?.paid_order_value ?? 0),
                      },
                      {
                        label: "Restaurant Payable",
                        value: money(reportData.orders?.restaurant_payable ?? 0),
                      },
                      {
                        label: "Delivered Orders",
                        value: reportData.orders?.delivered_orders ?? 0,
                      },
                      {
                        label: "Cancelled Orders",
                        value: reportData.orders?.cancelled_orders ?? 0,
                      },
                      {
                        label: "Paid Orders",
                        value: reportData.orders?.paid_orders ?? 0,
                      },
                      {
                        label: "Active Restaurants",
                        value: reportData.restaurants?.active_restaurants ?? 0,
                      },
                    ].map((item) => (
                      <article className="admin-stat-card" key={item.label}>
                        <div className="admin-stat-top">
                          <span>{item.label}</span>
                        </div>
                        <strong>{item.value}</strong>
                        <small>Based on report data</small>
                      </article>
                    ))}

                </section>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 20,
                    marginTop: 24,
                  }}
                >
                  <section
                    style={{
                      padding: 20,
                      border: "1px solid #eee",
                      borderRadius: 12,
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>Orders by Status</h3>

                    {(reportData.status_breakdown || []).length > 0 ? (
                      reportData.status_breakdown.map((item) => (
                        <div
                          key={item.status}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 0",
                            borderBottom: "1px solid #f1f1f1",
                          }}
                        >
                          <span>{formatLabel(item.status)}</span>
                          <strong>{item.count}</strong>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#777" }}>
                        No order status data available.
                      </p>
                    )}
                  </section>

                  <section
                    style={{
                      padding: 20,
                      border: "1px solid #eee",
                      borderRadius: 12,
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>Daily Order Trend</h3>

                    {(() => {
                      const trend = reportData.daily_trend || [];
                      const maxOrders = Math.max(
                        1,
                        ...trend.map(
                          (item) => Number(item.orders) || 0
                        )
                      );

                      return trend.length > 0 ? (
                        trend.map((item) => (
                          <div
                            key={item.date}
                            style={{ marginBottom: 18 }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                                marginBottom: 7,
                              }}
                            >
                              <span>{item.date}</span>
                              <strong>
                                {item.orders} orders
                              </strong>
                            </div>

                            <div
                              style={{
                                height: 9,
                                background: "#f3f4f6",
                                borderRadius: 8,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${
                                    ((Number(item.orders) || 0) /
                                      maxOrders) *
                                    100
                                  }%`,
                                  height: "100%",
                                  background:
                                    "linear-gradient(90deg, #ff9800, #ff7200)",
                                  borderRadius: 8,
                                }}
                              />
                            </div>

                            <small style={{ color: "#777" }}>
                              Revenue: {money(item.revenue)}
                            </small>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: "#777" }}>
                          No daily order activity available.
                        </p>
                      );
                    })()}
                  </section>
                </div>

                <section
                  style={{
                    marginTop: 24,
                    padding: 20,
                    border: "1px solid #eee",
                    borderRadius: 12,
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Payment Summary</h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {[
                      {
                        label: "Paid Orders",
                        value: reportData.payments?.paid_orders ?? 0,
                      },
                      {
                        label: "Pending Payments",
                        value:
                          reportData.payments?.pending_payments ?? 0,
                      },
                      {
                        label: "Failed Payments",
                        value:
                          reportData.payments?.failed_payments ?? 0,
                      },
                      {
                        label: "Refunded Amount",
                        value: money(
                          reportData.payments?.refunded_amount
                        ),
                      },
                      {
                        label: "Total Customers",
                        value: reportData.users?.total_customers ?? 0,
                      },
                      {
                        label: "Total Users",
                        value: reportData.users?.total_users ?? 0,
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <div style={{ color: "#777", fontSize: 13 }}>
                          {item.label}
                        </div>
                        <strong
                          style={{
                            display: "block",
                            fontSize: 21,
                            marginTop: 7,
                          }}
                        >
                          {item.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </section>
        )}


      </main>
    </div>
  );
}

export default AdminDashboard;
