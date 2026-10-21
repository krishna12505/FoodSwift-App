
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./RestaurantMenu.css";

const API_URL = "http://127.0.0.1:8000";

function RestaurantMenu() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const restaurantId = searchParams.get("restaurant");

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [vegOnly, setVegOnly] = useState(false);
  const [foodRatings, setFoodRatings] = useState({});
  const [selectedRatings, setSelectedRatings] = useState({});
  const [reviewTexts, setReviewTexts] = useState({});
  const [ratingMessages, setRatingMessages] = useState({});
  const [submittingRatings, setSubmittingRatings] = useState({});
  const [cart, setCart] = useState(() => {
  try {
    const saved = JSON.parse(
      localStorage.getItem("foodswiftCart") || "null"
    );

   if (String(saved?.restaurantId) === String(restaurantId)) {
  return Object.fromEntries(
    (saved.items || []).map((item) => [
      item.id,
      Number(item.quantity) || 0,
    ])
  );
}
  } catch {
    // Ignore invalid saved cart data.
  }

  return {};
});


  // Load menu items and their ratings
  useEffect(() => {
    if (!restaurantId) {
      setError("Restaurant ID is missing.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchFoodRatings(items) {
      const results = await Promise.all(
        items.map(async (item) => {
          try {
            const response = await fetch(
              `${API_URL}/api/reviews/food/${item.id}/`,
              { signal: controller.signal }
            );

            if (!response.ok) {
              return [
                item.id,
                { average_rating: 0, rating_count: 0 },
              ];
            }

            const data = await response.json();

            return [
              item.id,
              {
                average_rating: Number(data.average_rating) || 0,
                rating_count: Number(data.rating_count) || 0,
              },
            ];
          } catch (err) {
            if (err.name === "AbortError") {
              throw err;
            }

            return [
              item.id,
              { average_rating: 0, rating_count: 0 },
            ];
          }
        })
      );

      if (!controller.signal.aborted) {
        setFoodRatings(Object.fromEntries(results));
      }
    }

    async function fetchMenu() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/menu/?restaurant=${encodeURIComponent(restaurantId)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load the menu.");
        }

        const data = await response.json();
        const items = Array.isArray(data)
          ? data
          : data.results || [];

        const availableItems = items.filter(
          (item) => item.is_available !== false
        );

        setMenuItems(availableItems);
        await fetchFoodRatings(availableItems);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            err.message || "Unable to connect to the server."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchMenu();

    return () => controller.abort();
  }, [restaurantId]);

  // Submit a food rating and review
  const submitFoodRating = async (foodItemId) => {
    const rating = selectedRatings[foodItemId];
    const review = reviewTexts[foodItemId] || "";

    if (!rating) {
      setRatingMessages((prev) => ({
        ...prev,
        [foodItemId]: "Please select a star rating.",
      }));
      return;
    }

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setRatingMessages((prev) => ({
        ...prev,
        [foodItemId]: "Please log in to submit a rating.",
      }));
      return;
    }

    setSubmittingRatings((prev) => ({
      ...prev,
      [foodItemId]: true,
    }));

    setRatingMessages((prev) => ({
      ...prev,
      [foodItemId]: "",
    }));

    try {
      const response = await fetch(
        `${API_URL}/api/reviews/food/${foodItemId}/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating: Number(rating),
            review: review.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const details =
          typeof data === "object" && data !== null
            ? Object.values(data)
                .flat()
                .map((value) =>
                  typeof value === "string" ? value : ""
                )
                .filter(Boolean)
                .join(" ")
            : "";

        throw new Error(
          details || "Unable to submit your rating."
        );
      }

      setRatingMessages((prev) => ({
        ...prev,
        [foodItemId]: "Rating submitted successfully!",
      }));

      const ratingsResponse = await fetch(
        `${API_URL}/api/reviews/food/${foodItemId}/`
      );

      if (ratingsResponse.ok) {
        const ratingsData = await ratingsResponse.json();

        setFoodRatings((prev) => ({
          ...prev,
          [foodItemId]: {
            average_rating:
              Number(ratingsData.average_rating) || 0,
            rating_count:
              Number(ratingsData.rating_count) || 0,
          },
        }));
      }
    } catch (err) {
      setRatingMessages((prev) => ({
        ...prev,
        [foodItemId]:
          err.message || "Unable to connect to the server.",
      }));
    } finally {
      setSubmittingRatings((prev) => ({
        ...prev,
        [foodItemId]: false,
      }));
    }
  };

  // Food categories
  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        menuItems
          .map((item) => item.category)
          .filter(Boolean)
      ),
    ];

    return ["All", ...uniqueCategories];
  }, [menuItems]);

  // Search and filter food items
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return menuItems.filter((item) => {
      const matchesSearch = [
        item.name,
        item.description,
        item.category,
      ]
        .filter(Boolean)
        .some((value) =>
          value.toLowerCase().includes(query)
        );

      const matchesCategory =
        selectedCategory === "All" ||
        item.category === selectedCategory;

      const matchesVeg =
        !vegOnly ||
        item.food_type?.toLowerCase() === "veg";

      return matchesSearch && matchesCategory && matchesVeg;
    });
  }, [menuItems, search, selectedCategory, vegOnly]);

  // Cart quantity

function changeQuantity(item, amount) {
  setCart((previous) => {
    const currentQuantity = Number(previous[item.id] || 0);
    const nextQuantity = Math.max(0, currentQuantity + amount);

    const updated = { ...previous };

    if (nextQuantity === 0) {
      delete updated[item.id];
    } else {
      updated[item.id] = nextQuantity;
    }

    // Preserve every dish currently in the cart.
    const savedItems = menuItems
      .filter((food) => Number(updated[food.id]) > 0)
      .map((food) => ({
        id: food.id,
        name: food.name,
        price: Number(food.price || 0),
        image: food.image || "",
        quantity: Number(updated[food.id]),
      }));

    const savedCart = {
      restaurantId: String(restaurantId),
      items: savedItems,
    };

    if (savedItems.length === 0) {
      localStorage.removeItem("foodswiftCart");
    } else {
      localStorage.setItem(
        "foodswiftCart",
        JSON.stringify(savedCart)
      );
    }

    return updated;
  });
}


  const cartItems = menuItems.filter(
    (item) => cart[item.id] > 0
  );

  const cartCount = cartItems.reduce(
    (total, item) => total + cart[item.id],
    0
  );

  const subtotal = cartItems.reduce(
    (total, item) =>
      total + Number(item.price || 0) * cart[item.id],
    0
  );

  return (
    <main className="restaurant-menu-page">
      <header className="menu-page-header">
        <button
            type="button"
            className="menu-back-button"
            onClick={() => navigate(-1)}
            >
            ← Back to restaurants
        </button>
        <div className="menu-heading-content">
          <p className="menu-eyebrow">
            FOODSWIFT · GOOD FOOD, DELIVERED
          </p>
          <h1>Discover your next favourite dish.</h1>
          <p>
            Fresh flavours, delicious choices, all in one place.
          </p>
        </div>
      </header>

      <section className="menu-toolbar">
        <div className="menu-search-box">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search dishes, categories..."
            aria-label="Search menu items"
          />
        </div>

        <label className="veg-filter">
          <input
            type="checkbox"
            checked={vegOnly}
            onChange={(event) =>
              setVegOnly(event.target.checked)
            }
          />
          <span className="veg-filter-dot">●</span>
          Vegetarian only
        </label>
      </section>

      {!loading && !error && menuItems.length > 0 && (
        <nav
          className="menu-category-list"
          aria-label="Food categories"
        >
          {categories.map((category) => (
            <button
                type="button"
                key={category}
                className={`menu-category-chip ${
                    selectedCategory === category ? "active" : ""
                }`}
                onClick={() => setSelectedCategory(category)}
                >
                {category}
            </button>
          ))}
        </nav>
      )}

      <section className="menu-results-heading">
        <div>
          <h2>Explore the menu</h2>
          <p>
            {loading
              ? "Finding delicious dishes..."
              : `${filteredItems.length} dish${
                  filteredItems.length === 1 ? "" : "es"
                } available`}
          </p>
        </div>
      </section>

      {loading && (
        <div className="menu-status">
          <span className="menu-loader" />
          <p>Loading your menu...</p>
        </div>
      )}

      {!loading && error && (
        <div className="menu-empty-state">
          <h2>We couldn't load the menu</h2>
          <p>{error}</p>
          <button
            className="menu-primary-button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && menuItems.length === 0 && (
        <div className="menu-empty-state">
          <span className="menu-empty-icon">🍽</span>
          <h2>The menu is getting ready</h2>
          <p>
            This restaurant has no available food items right now.
          </p>
        </div>
      )}

      {!loading &&
        !error &&
        menuItems.length > 0 &&
        filteredItems.length === 0 && (
          <div className="menu-empty-state">
            <h2>No matching dishes</h2>
            <p>
              Try another search or choose a different category.
            </p>
            <button
              className="menu-primary-button"
              onClick={() => {
                setSearch("");
                setSelectedCategory("All");
                setVegOnly(false);
              }}
            >
              Clear filters
            </button>
          </div>
        )}

      {!loading && !error && filteredItems.length > 0 && (
        <section className="food-menu-grid">
          {filteredItems.map((item) => {
            const quantity = cart[item.id] || 0;
            const isVeg =
              item.food_type?.toLowerCase() === "veg";

            return (
              <article
                className="food-menu-card"
                key={item.id}
              >
                <div className="food-menu-image">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        event.currentTarget.parentElement.classList.add(
                          "image-failed"
                        );
                      }}
                    />
                  ) : null}

                  <span className="food-image-placeholder">
                    {item.name}
                  </span>

                  <span
                    className={`food-type-badge ${
                      isVeg ? "veg" : "non-veg"
                    }`}
                  >
                    <span>●</span>{" "}
                    {isVeg ? "VEG" : "NON-VEG"}
                  </span>
                </div>

                <div className="food-menu-details">
                  <p className="food-category">
                    {item.category || "Chef's special"}
                  </p>

                  <h3>{item.name}</h3>

                  <div className="food-rating">
                    <span className="food-rating-stars">
                      ★★★★★
                    </span>
                    <strong>
                      {(
                        foodRatings[item.id]?.average_rating ?? 0
                      ).toFixed(1)}
                    </strong>
                    <span>
                      ({foodRatings[item.id]?.rating_count ?? 0} ratings)
                    </span>
                  </div>

                  <div className="food-review-form">
                    <p className="review-label">
                      Rate this food
                    </p>

                    <div className="review-star-selector">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={
                            star <= (selectedRatings[item.id] || 0)
                              ? "review-star active"
                              : "review-star"
                          }
                          onClick={() =>
                            setSelectedRatings((prev) => ({
                              ...prev,
                              [item.id]: star,
                            }))
                          }
                          aria-label={`Rate ${star} out of 5`}
                        >
                          ★
                        </button>
                      ))}
                    </div>

                    <textarea
                      className="food-review-input"
                      placeholder="Write your review (optional)"
                      value={reviewTexts[item.id] || ""}
                      onChange={(event) =>
                        setReviewTexts((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                      rows={2}
                    />

                    <button
                      type="button"
                      className="submit-food-review"
                      disabled={!!submittingRatings[item.id]}
                      onClick={() =>
                        submitFoodRating(item.id)
                      }
                    >
                      {submittingRatings[item.id]
                        ? "Submitting..."
                        : "Submit Rating"}
                    </button>

                    {ratingMessages[item.id] && (
                      <p className="rating-message" role="status">
                        {ratingMessages[item.id]}
                      </p>
                    )}
                  </div>

                  <p className="food-description">
                    {item.description ||
                      "Deliciously prepared with care and quality ingredients."}
                  </p>

                  <div className="food-menu-footer">
                    <strong>
                      ₹{Number(item.price || 0).toFixed(2)}
                    </strong>

                    {quantity === 0 ? (
                      <button
                        type="button"
                        className="menu-add-button"
                        onClick={() => changeQuantity(item, 1)}
                        aria-label={`Add ${item.name} to cart`}
                        >
                         + Add
                    </button>
                    ) : (
                      <div className="menu-quantity-control">
                            <button
                                type="button"
                                onClick={() => changeQuantity(item, -1)}
                                aria-label={`Remove one ${item.name}`}
                            >
                                −
                            </button>

                            <span>{quantity}</span>

                            <button
                                type="button"
                                onClick={() => changeQuantity(item, 1)}
                                aria-label={`Add one ${item.name}`}
                            >
                                +
                            </button>
                     </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {cartCount > 0 && (
        <aside className="menu-cart-bar">
          <div className="menu-cart-info">
            <span className="menu-cart-count">
              {cartCount}
            </span>
            <div>
              <strong>
                {cartCount} item{cartCount === 1 ? "" : "s"} added
              </strong>
              <p>Subtotal · ₹{subtotal.toFixed(2)}</p>
            </div>
          </div>

          
       <button
            type="button"
            className="menu-cart-button"
            onClick={() => navigate("/cart")}
            >
            View cart →
        </button>

        </aside>
      )}
    </main>
  );
}

export default RestaurantMenu;
