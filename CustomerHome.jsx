import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CustomerHome.css";



const categories = [
  {
    name: "Biryani",
    image: "https://i.pinimg.com/736x/67/1f/41/671f417384c4bc89be17ba652476727b.jpg",
  },
  {
    name: "Pizza",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "South Indian",
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Desserts",
    image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Chinese",
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Mandi",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Sandwiches",
    image: "https://i.pinimg.com/736x/ad/78/1b/ad781bec9d702a569a67d6e41c7ff362.jpg",
  },
  {
    name: "Fried Chicken",
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Ice Cream",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Healthy Food",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Wraps",
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&auto=format&fit=crop&q=80",
  },
];


function CustomerHome() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [restaurantError, setRestaurantError] = useState("");
  const navigate = useNavigate();


const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
        const query = search.trim().toLowerCase();

        const matchesSearch =
            (restaurant.name || "").toLowerCase().includes(query) ||
            (restaurant.cuisine || "").toLowerCase().includes(query) ||
            (restaurant.city || "").toLowerCase().includes(query) ||
            (restaurant.address || "").toLowerCase().includes(query);

        
            const searchableRestaurantText = [
                restaurant.name,
                restaurant.cuisine,
                restaurant.description,
                restaurant.city,
                restaurant.address,
            ].filter(Boolean).join(" ").toLowerCase();

            const matchesCategory =
                selectedCategory === "All" ||
                searchableRestaurantText.includes(selectedCategory.toLowerCase());
        const matchesFavorites =
            !showFavorites || favorites.includes(restaurant.id);

        return matchesSearch && matchesCategory && matchesFavorites;
    });
}, [restaurants, search, selectedCategory, favorites, showFavorites]);

  const categorySliderRef = useRef(null);

    function slideCategories(direction) {
    if (categorySliderRef.current) {
        categorySliderRef.current.scrollBy({
        left: direction * 500,
        behavior: "smooth",
        });
    }
    }


    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                setLoadingRestaurants(true);
                setRestaurantError("");

                const response = await fetch(
                    "http://127.0.0.1:8000/api/restaurants/"
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch restaurants");
                }

                const data = await response.json();

                setRestaurants(
                    Array.isArray(data) ? data : data.results || []
                );

                console.log("Restaurant API data:", data);
                console.log("Restaurant count:", Array.isArray(data) ? data.length : data.results?.length);
            } catch (error) {
                console.error("Restaurant API error:", error);
                setRestaurantError(
                    "Unable to load restaurants. Please try again later."
                );
            } finally {
                setLoadingRestaurants(false);
            }
        };

        fetchRestaurants();
    }, []);


  function toggleFavorite(id) {
    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  }

  return (
    <main className="customer-home">
      <section className="foodswift-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            DISCOVER THE TASTE OF HYDERABAD
          </span>

          <h1>
            Good food.
            <br />
            <span>Good mood.</span>
          </h1>

          <p>
            Find your favourite restaurants and bring delicious
            meals straight to your doorstep.
          </p>

          <div className="hero-search">
            <span className="search-symbol">⌕</span>
            <input
              type="search"
              placeholder="Search restaurants or locations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search restaurants or locations"
            />
            <button
              onClick={() =>
                document
                  .getElementById("restaurants")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Find food
            </button>
          </div>

          <div className="hero-trust">
            <span>Fresh choices</span>
            <span>Local restaurants</span>
            <span>Easy ordering</span>
          </div>
        </div>

        <div className="hero-image-wrap">
          <img
            src="https://i.pinimg.com/736x/96/27/fe/9627fe1ec0ac0831e0fd8ad88d03a988.jpg"
            alt="A delicious plate of biryani"
            className="hero-food-image"
          />
          <div className="hero-image-label">
            <span className="hero-label-dot" />
            <div>
              <strong>Hyderabad favourites</strong>
              <small>Discover something delicious</small>
            </div>
          </div>
        </div>
      </section>


        <section className="category-section">
        <div className="category-heading">
            <div>
            <h2>Explore Categories</h2>
            <p>Find your favourite food</p>
            </div>

            <div className="category-arrows">
            <button
                type="button"
                className="category-arrow"
                onClick={() => slideCategories(-1)}
                aria-label="Previous categories"
            >
                &#8592;
            </button>

            <button
                type="button"
                className="category-arrow"
                onClick={() => slideCategories(1)}
                aria-label="Next categories"
            >
                &#8594;
            </button>
            </div>
        </div>

        <div className="category-grid" ref={categorySliderRef}>
            {categories.map((category) => (
            <button
                type="button"
                className={`category-card ${
                selectedCategory === category.name ? "active" : ""
                }`}
                key={category.name}
                onClick={() => {
                setSearch("");
                setSelectedCategory(
                    selectedCategory === category.name ? "All" : category.name
                );
                document
                    .getElementById("restaurants")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
            >
                <img
                src={category.image}
                alt={category.name}
                loading="lazy"
                />
                <span>{category.name}</span>
            </button>
            ))}
        </div>
        </section>

     

      <section className="restaurant-section" id="restaurants">
          <div className="restaurant-section-header">
            <div>
              <span className="section-kicker">DISCOVER YOUR NEXT FAVOURITE</span>
              <h2>
                {showFavorites
                  ? "Your Favourite Restaurants"
                  : "Popular Restaurants Near You"}
              </h2>
              <p>Discover delicious food from local restaurants.</p>
            </div>

        <button
          type="button"
          className={`favorites-filter ${showFavorites ? "active" : ""}`}
          onClick={() => setShowFavorites(!showFavorites)}
        >
          ♥ {showFavorites ? "Show All" : "Favourites"}
        </button>

          </div>

        {loadingRestaurants && (
        <p className="restaurant-message">Loading restaurants...</p>
        )}

        {!loadingRestaurants && restaurantError && (
        <p className="restaurant-error">{restaurantError}</p>
        )}

        {!loadingRestaurants &&
        !restaurantError &&
        filteredRestaurants.length === 0 && (
        <p className="restaurant-message">
        {showFavorites
        ? "You haven't added any favourite restaurants yet."
        : search.trim() || selectedCategory !== "All"
        ? "No restaurants match your search or category."
        : "No restaurants available right now."}
        </p>
        )}

        {!loadingRestaurants &&
        !restaurantError &&
        filteredRestaurants.length > 0 && (
        <div className="restaurant-grid">
        {filteredRestaurants.map((restaurant) => {
        const isFavorite = favorites.includes(restaurant.id);
        const location = [restaurant.address, restaurant.city]
        .filter(Boolean)
        .join(", ");

              return (
                <article className="restaurant-card" key={restaurant.id}>
                  <div className="restaurant-image-wrap">
                    <img
                      className="restaurant-image"
                      src={
                        restaurant.image ||
                        "/images/restaurant-placeholder.jpg"
                      }
                      alt={restaurant.name}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src =
                          "/images/restaurant-placeholder.jpg";
                      }}
                    />

                    <span
                      className={`restaurant-status ${
                        restaurant.is_open
                          ? "restaurant-open"
                          : "restaurant-closed"
                      }`}
                    >
                      {restaurant.is_open ? "Open now" : "Closed"}
                    </span>

                    <button
                      type="button"
                      className={`restaurant-favorite ${
                        isFavorite ? "selected" : ""
                      }`}
                      onClick={() => toggleFavorite(restaurant.id)}
                      aria-label={
                        isFavorite
                          ? "Remove from favourites"
                          : "Add to favourites"
                      }
                      aria-pressed={isFavorite}
                    >
                      {isFavorite ? "♥" : "♡"}
                    </button>
                  </div>

                  <div className="restaurant-card-content">
                    <h3>{restaurant.name}</h3>

                    <p className="restaurant-cuisine">
                      {restaurant.cuisine || "Local cuisine"}
                    </p>

                    {location && (
                      <p className="restaurant-location">
                        <span>⌖</span> {location}
                      </p>
                    )}

                    <div className="restaurant-card-meta">
                      {restaurant.rating != null && (
                        <span className="restaurant-rating">
                          ★ {restaurant.rating}
                          {restaurant.review_count != null &&
                            ` (${restaurant.review_count})`}
                        </span>
                      )}

                      {restaurant.delivery_time && (
                        <span>◷ {restaurant.delivery_time}</span>
                      )}

                      {(restaurant.average_cost_for_one ??
                        restaurant.cost_for_one) != null && (
                        <span>
                          ₹
                          {restaurant.average_cost_for_one ??
                            restaurant.cost_for_one}{" "}
                          for one
                        </span>
                      )}
                                        </div>
                    <button
                      className="view-menu-button"
                      onClick={() =>
                        navigate(`/menu?restaurant=${restaurant.id}`)
                      }
                    >
                      View Menu →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        </section>


      <section className="foodswift-promo">
        <div>
          <span className="section-kicker">YOUR NEXT FAVOURITE MEAL</span>
          <h2>Great food starts with a great choice.</h2>
          <p>Explore local restaurants with FoodSwift.</p>
        </div>
        <button
          onClick={() =>
            document
              .getElementById("restaurants")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          Explore restaurants →
        </button>
      </section>

      <footer className="foodswift-footer">
        <div className="footer-brand">
          <strong>Food<span>Swift</span></strong>
          <p>Your Food. Your Way. Your Swift.</p>
        </div>
        <p>Discover local food. Order with ease.</p>
        <small>© {new Date().getFullYear()} FoodSwift</small>
      </footer>
    </main>
  );
}

export default CustomerHome;
