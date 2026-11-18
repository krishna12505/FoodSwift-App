
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Chatbot.css";

const API_URL =
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const CART_KEY = "foodswiftCart";

// =========================================
// ADVANCED FOODSWIFT AI NEURAL ORB ICON
// =========================================

function NeuralOrbIcon() {
    return (
        <div className="chatbot-message-avatar advanced-ai-orb">
            <svg
                viewBox="0 0 48 48"
                width="30"
                height="30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <ellipse
                    cx="24"
                    cy="24"
                    rx="19"
                    ry="9"
                    transform="rotate(-45 24 24)"
                    stroke="white"
                    strokeWidth="1.5"
                    opacity="0.8"
                />

                <ellipse
                    cx="24"
                    cy="24"
                    rx="19"
                    ry="9"
                    transform="rotate(45 24 24)"
                    stroke="white"
                    strokeWidth="1.5"
                    opacity="0.65"
                />

                <path
                    d="M13 14L24 24L35 13M13 34L24 24L35 35"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.8"
                />

                <circle cx="13" cy="14" r="3" fill="white" />
                <circle cx="35" cy="13" r="3" fill="white" />
                <circle cx="13" cy="34" r="3" fill="white" />
                <circle cx="35" cy="35" r="3" fill="white" />

                <circle
                    cx="24"
                    cy="24"
                    r="7"
                    fill="white"
                    opacity="0.2"
                />

                <circle cx="24" cy="24" r="4" fill="white" />
            </svg>
        </div>
    );
}

// =========================================
// CART HELPERS
// =========================================

function readCart() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(CART_KEY) || "null"
        );

        if (saved && Array.isArray(saved.items)) {
            return saved;
        }
    } catch {
        // Ignore invalid cart data.
    }

    return { restaurantId: null, items: [] };
}

// NEW: GET TOTAL CART ITEM QUANTITY

function getCartItemCount() {
    const cart = readCart();

    return cart.items.reduce(
        (total, item) =>
            total + Number(item.quantity || 0),
        0
    );
}

function saveCart(cart) {
    if (!cart.items.length) {
        localStorage.removeItem(CART_KEY);
    } else {
        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );
    }

    window.dispatchEvent(
        new Event("foodswift-cart-updated")
    );
}

function getCartTotal(cart) {
    const subtotal = cart.items.reduce(
        (sum, item) =>
            sum +
            Number(item.price || 0) *
            Number(item.quantity || 0),
        0
    );

    const deliveryFee = cart.items.length ? 40 : 0;

    return {
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
    };
}

// =========================================
// ORDER HELPERS
// =========================================

function formatOrderStatus(status) {
    return String(status || "unknown")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
        );
}

function formatOrderDate(dateValue) {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// =========================================
// MAIN CHATBOT
// =========================================

function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // NEW: LIVE CART COUNTER STATE

    const [cartItemCount, setCartItemCount] =
        useState(getCartItemCount);

    const messagesEndRef = useRef(null);
    const pendingActionRef = useRef(null);

    // =========================================
    // AUTO UPDATE CART COUNTER
    // =========================================

    useEffect(() => {
        const updateCartCount = () => {
            setCartItemCount(getCartItemCount());
        };

        window.addEventListener(
            "foodswift-cart-updated",
            updateCartCount
        );

        window.addEventListener(
            "storage",
            updateCartCount
        );

        return () => {
            window.removeEventListener(
                "foodswift-cart-updated",
                updateCartCount
            );

            window.removeEventListener(
                "storage",
                updateCartCount
            );
        };
    }, []);

    // =========================================
    // AUTO SCROLL
    // =========================================

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages, isLoading]);

    // =========================================
    // QUICK SUGGESTIONS
    // =========================================

    const suggestions = [
        {
            icon: "🍛",
            title: "Best biryani",
            subtitle: "Explore popular biryanis",
            query: "Suggest the best biryani",
        },
        {
            icon: "₹",
            title: "Food under ₹200",
            subtitle: "Delicious meals on a budget",
            query: "Food under ₹200",
        },
        {
            icon: "🌿",
            title: "Vegetarian food",
            subtitle: "Discover vegetarian favourites",
            query: "Best vegetarian food",
        },
        {
            icon: "📦",
            title: "Recent orders",
            subtitle: "Check your order history",
            query: "Show my recent orders",
        },
    ];

    // =========================================
    // MESSAGE HELPERS
    // =========================================

    function addBotMessage(text, menuItems = []) {
        setMessages((previous) => [
            ...previous,
            {
                id: Date.now() + Math.random(),
                sender: "bot",
                text,
                menuItems,
            },
        ]);
    }

    function addUserMessage(text) {
        setMessages((previous) => [
            ...previous,
            {
                id: Date.now() + Math.random(),
                sender: "user",
                text,
            },
        ]);
    }

    // =========================================
    // SHOW CART
    // =========================================

    function showCart() {
        const cart = readCart();

        if (!cart.items.length) {
            addBotMessage(
                "Your shopping cart is currently empty.\n\nExplore our menu and add some delicious dishes!"
            );
            return;
        }

        const { subtotal, deliveryFee, total } =
            getCartTotal(cart);

        const details = cart.items.map(
            (item) =>
                `${item.name} × ${item.quantity} = ₹${(
                    Number(item.price) *
                    Number(item.quantity)
                ).toFixed(2)}`
        );

        addBotMessage(
            `Here is your current cart:\n\n${details.join(
                "\n"
            )}\n\nItem subtotal: ₹${subtotal.toFixed(
                2
            )}\nDelivery fee: ₹${deliveryFee.toFixed(
                2
            )}\nTotal: ₹${total.toFixed(
                2
            )}\n\nYou can continue shopping or proceed to checkout.`
        );
    }

    // =========================================
    // ADD ITEMS TO CART
    // =========================================

    function addItemsToCart(items, quantity) {
        if (!items.length) {
            addBotMessage(
                "I couldn't find a matching available dish. Please try another food name."
            );
            return;
        }

        const cart = readCart();

        const restaurantIds = [
            ...new Set(
                items.map((item) =>
                    String(item.restaurant_id)
                )
            ),
        ];

        if (restaurantIds.length !== 1) {
            addBotMessage(
                "These dishes belong to different restaurants. Please add items from one restaurant at a time."
            );
            return;
        }

        const requestedRestaurantId = restaurantIds[0];

        if (
            cart.items.length &&
            String(cart.restaurantId) !== requestedRestaurantId
        ) {
            pendingActionRef.current = {
                type: "replace_cart",
                items,
                quantity,
            };

            addBotMessage(
                "Your existing cart contains food from another restaurant.\n\nWould you like to replace your current cart with items from this restaurant?\n\nReply YES to replace or NO to keep your current cart."
            );

            return;
        }

        const updatedItems = [...cart.items];

        items.forEach((food) => {
            const existing = updatedItems.find(
                (item) =>
                    Number(item.id) === Number(food.id)
            );

            if (existing) {
                existing.quantity = Math.min(
                    99,
                    Number(existing.quantity) + quantity
                );
            } else {
                updatedItems.push({
                    id: food.id,
                    name: food.name,
                    price: Number(food.price),
                    image: food.image || "",
                    quantity,
                });
            }
        });

        saveCart({
            restaurantId: requestedRestaurantId,
            items: updatedItems,
        });

        addBotMessage(
            `${items.map((item) => item.name).join(", ")} added to your cart successfully!`
        );
    }

    // =========================================
    // REMOVE CART ITEMS
    // =========================================

    function removeCartItem(items) {
        const cart = readCart();

        if (!cart.items.length) {
            addBotMessage("Your cart is already empty.");
            return;
        }

        const ids = items.map((item) =>
            Number(item.id)
        );

        const updatedItems = cart.items.filter(
            (item) =>
                !ids.includes(Number(item.id))
        );

        if (updatedItems.length === cart.items.length) {
            addBotMessage(
                "I couldn't find that dish in your current cart."
            );
            return;
        }

        saveCart({
            restaurantId: updatedItems.length
                ? cart.restaurantId
                : null,
            items: updatedItems,
        });

        addBotMessage(
            "The requested food item has been removed from your cart."
        );
    }

    // =========================================
    // UPDATE CART QUANTITY
    // =========================================

    function updateCartQuantity(items, quantity) {
        const cart = readCart();

        if (!cart.items.length) {
            addBotMessage("Your cart is empty.");
            return;
        }

        const ids = items.map((item) =>
            Number(item.id)
        );

        let found = false;

        const updatedItems = cart.items.map((item) => {
            if (ids.includes(Number(item.id))) {
                found = true;

                return {
                    ...item,
                    quantity: Math.min(
                        99,
                        Math.max(1, quantity)
                    ),
                };
            }

            return item;
        });

        if (!found) {
            addBotMessage(
                "That dish is not currently in your cart."
            );
            return;
        }

        saveCart({
            ...cart,
            items: updatedItems,
        });

        addBotMessage(
            `Cart quantity updated successfully to ${quantity}.`
        );
    }

    // =========================================
    // CLEAR CART
    // =========================================

    function clearCart() {
        const cart = readCart();

        if (!cart.items.length) {
            addBotMessage("Your cart is already empty.");
            return;
        }

        pendingActionRef.current = {
            type: "clear_cart",
        };

        addBotMessage(
            "Are you sure you want to remove all items from your cart?\n\nReply YES to confirm or NO to cancel."
        );
    }

    // =========================================
    // YES / NO CONFIRMATION
    // =========================================

    function handleConfirmation(userMessage) {
        const pending = pendingActionRef.current;

        if (!pending) return false;

        const answer = userMessage.trim().toLowerCase();

        if (
            ["yes", "yes please", "confirm", "sure"].includes(answer)
        ) {
            pendingActionRef.current = null;

            if (pending.type === "clear_cart") {
                saveCart({
                    restaurantId: null,
                    items: [],
                });

                addBotMessage(
                    "Your cart has been cleared successfully."
                );

                return true;
            }

            if (pending.type === "replace_cart") {
                saveCart({
                    restaurantId: null,
                    items: [],
                });

                addItemsToCart(
                    pending.items,
                    pending.quantity
                );

                return true;
            }
        }

        if (
            ["no", "no thanks", "cancel"].includes(answer)
        ) {
            pendingActionRef.current = null;

            addBotMessage(
                "Okay! Your existing cart has been kept."
            );

            return true;
        }

        addBotMessage(
            "Please reply YES to confirm or NO to cancel."
        );

        return true;
    }

    // =========================================
    // FETCH CUSTOMER ORDERS
    // =========================================

    async function fetchCustomerOrders() {
        const token = localStorage.getItem("accessToken");

        if (!token) {
            addBotMessage(
                "Please log in to your FoodSwift account to view your order history and track your orders."
            );

            return null;
        }

        const response = await fetch(
            `${API_URL}/api/orders/`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            if (
                response.status === 401 ||
                response.status === 403
            ) {
                throw new Error(
                    "Your login session may have expired. Please log in again."
                );
            }

            throw new Error(
                data.detail ||
                data.error ||
                "Unable to retrieve your orders."
            );
        }

        return Array.isArray(data)
            ? data
            : Array.isArray(data.results)
                ? data.results
                : [];
    }

    // =========================================
    // ORDER HISTORY
    // =========================================

    async function showOrderHistory() {
        const orders = await fetchCustomerOrders();

        if (!orders) return;

        if (!orders.length) {
            addBotMessage(
                "You haven't placed any orders yet.\n\nExplore FoodSwift and order your favourite food!"
            );
            return;
        }

        const recentOrders = [...orders]
            .sort(
                (a, b) =>
                    new Date(b.created_at || 0) -
                    new Date(a.created_at || 0)
            )
            .slice(0, 5);

        const details = recentOrders.map((order) => {
            const items = Array.isArray(order.items)
                ? order.items
                    .map(
                        (item) =>
                            `${item.item_name || item.name || "Food item"} × ${item.quantity}`
                    )
                    .join(", ")
                : "Order items unavailable";

            return (
                `ORDER #${order.id}\n\n` +
                `Items: ${items}\n` +
                `Total: ₹${Number(
                    order.total_amount || 0
                ).toFixed(2)}\n` +
                `Status: ${formatOrderStatus(order.status)}\n` +
                `Date: ${formatOrderDate(order.created_at)}`
            );
        });

        addBotMessage(
            `Here are your recent FoodSwift orders:\n\n${details.join(
                "\n\n━━━━━━━━━━━━━━━━━━\n\n"
            )}`
        );
    }

    // =========================================
    // TRACK ORDER BY ID, DATE OR LATEST
    // =========================================

    async function trackCustomerOrder(userMessage) {
        const orders = await fetchCustomerOrders();

        if (!orders) return;

        if (!orders.length) {
            addBotMessage(
                "You haven't placed any orders yet."
            );
            return;
        }

        const lowerMessage = userMessage.toLowerCase();

        let matchingOrders = [];

        const idMatch = lowerMessage.match(
            /\border\s*#?\s*(\d+)\b/i
        );

        if (idMatch) {
            matchingOrders = orders.filter(
                (order) =>
                    String(order.id) === idMatch[1]
            );
        } else {
            const dateMatch = userMessage.match(
                /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i
            );

            if (dateMatch) {
                const requestedDate = new Date(
                    `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}`
                );

                if (Number.isNaN(requestedDate.getTime())) {
                    addBotMessage(
                        "I couldn't understand that date. Please use a format like 4 November 2026."
                    );
                    return;
                }

                const dateKey = [
                    requestedDate.getFullYear(),
                    String(requestedDate.getMonth() + 1).padStart(2, "0"),
                    String(requestedDate.getDate()).padStart(2, "0"),
                ].join("-");

                matchingOrders = orders.filter((order) => {
                    const orderDate = new Date(order.created_at);

                    if (Number.isNaN(orderDate.getTime())) {
                        return false;
                    }

                    const orderDateKey = [
                        orderDate.getFullYear(),
                        String(orderDate.getMonth() + 1).padStart(2, "0"),
                        String(orderDate.getDate()).padStart(2, "0"),
                    ].join("-");

                    return orderDateKey === dateKey;
                });
            } else {
                const sortedOrders = [...orders].sort(
                    (a, b) =>
                        new Date(b.created_at || 0) -
                        new Date(a.created_at || 0)
                );

                const latestActiveOrder = sortedOrders.find(
                    (order) =>
                        !["delivered", "cancelled"].includes(
                            order.status
                        )
                );

                matchingOrders = [
                    latestActiveOrder || sortedOrders[0],
                ];
            }
        }

        if (!matchingOrders.length) {
            addBotMessage(
                "I couldn't find an order matching your request.\n\nPlease check the order ID or date and try again."
            );
            return;
        }

        matchingOrders.forEach((order) => {
            const items = (order.items || [])
                .map(
                    (item) =>
                        `${item.item_name || item.name || "Food item"} × ${item.quantity}`
                )
                .join("\n");

            addBotMessage(
                `ORDER #${order.id}\n\n` +
                `ORDER DATE\n${formatOrderDate(order.created_at)}\n\n` +
                `YOUR ITEMS\n${items || "No items available"}\n\n` +
                `TOTAL AMOUNT\n₹${Number(
                    order.total_amount || 0
                ).toFixed(2)}\n\n` +
                `ORDER STATUS\n${formatOrderStatus(order.status)}`
            );
        });
    }

    // =========================================
    // SEND MESSAGE
    // =========================================

    async function sendMessage(text) {
        const userMessage = text.trim();

        if (!userMessage || isLoading) return;

        addUserMessage(userMessage);
        setMessage("");

        if (handleConfirmation(userMessage)) {
            return;
        }

        const lowerMessage = userMessage.toLowerCase();

        if (
            /\b(show|view|display|check)\b/.test(lowerMessage) &&
            /\b(cart|basket)\b/.test(lowerMessage)
        ) {
            showCart();
            return;
        }

        if (
            /\b(total|bill|cost)\b/.test(lowerMessage) &&
            /\b(cart|order|shopping)\b/.test(lowerMessage)
        ) {
            showCart();
            return;
        }

        if (
            /\b(clear|empty|remove all)\b/.test(lowerMessage) &&
            /\b(cart|basket|items)\b/.test(lowerMessage)
        ) {
            clearCart();
            return;
        }

        const wantsOrderHistory =
            /\b(order history|previous orders|past orders|recent orders|my orders)\b/.test(
                lowerMessage
            ) ||
            (
                /\b(show|view|list|check|display)\b/.test(
                    lowerMessage
                ) &&
                /\borders\b/.test(lowerMessage)
            );

        const wantsOrderTracking =
            /\b(track|tracking|where is|status of)\b/.test(
                lowerMessage
            ) &&
            /\b(order|delivery)\b/.test(lowerMessage);

        if (wantsOrderHistory || wantsOrderTracking) {
            setIsLoading(true);

            try {
                if (wantsOrderTracking) {
                    await trackCustomerOrder(userMessage);
                } else {
                    await showOrderHistory();
                }
            } catch (error) {
                console.error("Order History Error:", error);

                addBotMessage(
                    error.message ||
                    "Unable to retrieve your order information."
                );
            } finally {
                setIsLoading(false);
            }

            return;
        }

        // =====================================
        // GROQ AI REQUEST
        // =====================================

        setIsLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/api/chatbot/message/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: userMessage,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Unable to get AI response."
                );
            }

            if (!data.reply) {
                throw new Error(
                    "AI returned an empty response."
                );
            }

            const items = Array.isArray(data.menu_items)
                ? data.menu_items
                : [];

            const quantity = Math.min(
                20,
                Math.max(1, Number(data.quantity) || 1)
            );

            switch (data.intent) {
                case "add_to_cart":
                    if (items.length) {
                        addItemsToCart(items, quantity);
                    } else {
                        addBotMessage(data.reply);
                    }
                    break;

                case "remove_from_cart":
                    if (items.length) {
                        removeCartItem(items);
                    } else {
                        addBotMessage(data.reply);
                    }
                    break;

                case "update_quantity":
                    if (items.length) {
                        updateCartQuantity(items, quantity);
                    } else {
                        addBotMessage(data.reply);
                    }
                    break;

                case "show_cart":
                    showCart();
                    break;

                case "clear_cart":
                    clearCart();
                    break;

                case "order":
                    addBotMessage(
                        "You can proceed to checkout using your existing cart.\n\nPlease review your delivery address, items and payment method before confirming your order.",
                        items
                    );
                    break;

                default:
                    addBotMessage(data.reply, items);
            }
        } catch (error) {
            console.error("Chatbot Error:", error);

            addBotMessage(
                error.message === "Failed to fetch"
                    ? "Unable to connect to FoodSwift. Please check whether the backend server is running."
                    : error.message ||
                    "Something went wrong. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    }

    // =========================================
    // INPUT HANDLERS
    // =========================================

    const handleSend = (event) => {
        event.preventDefault();
        sendMessage(message);
    };

    const handleSuggestion = (suggestion) => {
        sendMessage(suggestion);
    };

    const handleNewConversation = () => {
        setMessages([]);
        setMessage("");
        pendingActionRef.current = null;
    };

    const getMenuItemUrl = (item) => {
        if (item.url) return item.url;

        return `/menu?restaurant=${item.restaurant_id}&item=${item.id}`;
    };

    // =========================================
    // CHATBOT UI
    // =========================================

    return (
        <div className="foodswift-chatbot">

            {!isOpen && (
                <button
                    className="chatbot-toggle"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open FoodSwift AI"
                >
                    <span className="chatbot-toggle-icon">
                        ✦
                    </span>

                    <span>Ask AI</span>
                </button>
            )}

            {isOpen && (
                <div className="chatbot-overlay">

                    <div className="chatbot-panel">

                        {/* HEADER */}

                        <header className="chatbot-header">

                            <div className="chatbot-brand">

                                <div className="chatbot-logo">
                                    FS
                                </div>

                                <div>
                                    <h2>FoodSwift AI</h2>
                                    <p>Your personal food assistant</p>
                                </div>

                            </div>

                            <div className="chatbot-header-actions">

                                {/* NEW: LIVE CART BUTTON */}

                                <button
                                    className="chatbot-header-btn chatbot-header-cart"
                                    onClick={showCart}
                                    title="Show shopping cart"
                                    aria-label={`Show shopping cart, ${cartItemCount} items`}
                                >
                                    <span aria-hidden="true">
                                        🛒
                                    </span>

                                    {cartItemCount > 0 && (
                                        <span className="chatbot-cart-count">
                                            {cartItemCount > 99
                                                ? "99+"
                                                : cartItemCount}
                                        </span>
                                    )}
                                </button>

                                <button
                                    className="chatbot-header-btn"
                                    onClick={handleNewConversation}
                                    title="New conversation"
                                >
                                    ＋
                                </button>

                                <button
                                    className="chatbot-header-btn close-btn"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close chatbot"
                                >
                                    ×
                                </button>

                            </div>

                        </header>

                        {/* CHAT FEED */}

                        <main className="chatbot-feed">

                            {messages.length === 0 ? (

                                <section className="chatbot-home">

                                    {/* WELCOME HERO */}

                                    <section className="chatbot-welcome">

                                        <div className="welcome-orb">
                                            <NeuralOrbIcon />
                                        </div>

                                        <span className="welcome-label">
                                            YOUR FOOD COMPANION
                                        </span>

                                        <h1>
                                            What are you
                                            <span> craving today?</span>
                                        </h1>

                                        <p>
                                            Discover delicious food, explore restaurants
                                            and manage your shopping cart with FoodSwift AI.
                                        </p>

                                    </section>

                                    {/* QUICK SUGGESTIONS */}

                                    <section className="suggestion-section">

                                        <div className="home-section-heading">
                                            <div>
                                                <span className="section-label">
                                                    QUICK DISCOVERY
                                                </span>

                                                <h3>Explore your cravings</h3>
                                            </div>
                                        </div>

                                        <div className="suggestion-list">

                                            {suggestions.map((item) => (

                                                <button
                                                    key={item.query}
                                                    className="suggestion-card"
                                                    onClick={() =>
                                                        handleSuggestion(item.query)
                                                    }
                                                    disabled={isLoading}
                                                >

                                                    <span className="suggestion-card-icon">
                                                        {item.icon}
                                                    </span>

                                                    <span className="suggestion-card-content">
                                                        <strong>{item.title}</strong>
                                                        <small>{item.subtitle}</small>
                                                    </span>

                                                    <span className="suggestion-arrow">
                                                        →
                                                    </span>

                                                </button>

                                            ))}

                                        </div>

                                    </section>

                                    {/* FOOD DISCOVERY */}

                                    <section className="recommendation-section">

                                        <div className="discovery-icon">
                                            ✦
                                        </div>

                                        <span className="section-label">
                                            FOOD DISCOVERY
                                        </span>

                                        <h3>Discover your next meal</h3>

                                        <p>
                                            Tell FoodSwift AI what you love. Get recommendations
                                            from real restaurants and available menu items.
                                        </p>

                                        <div className="discovery-features">
                                            <span>Smart recommendations</span>
                                            <span>Real menu prices</span>
                                            <span>Easy ordering</span>
                                        </div>

                                    </section>

                                </section>

                            ) : (

                                <section className="conversation-section">

                                    <div className="conversation-welcome">

                                        <span>FOODSWIFT AI</span>
                                        <h3>Your conversation</h3>

                                    </div>

                                    {/* MESSAGE LIST */}

                                    {messages.map((msg) => (

                                        <div
                                            key={msg.id}
                                            className={`chat-message-row ${msg.sender}-row`}
                                        >

                                            {msg.sender === "bot" && (
                                                <NeuralOrbIcon />
                                            )}

                                            <div className="chat-message-content">

                                                {msg.sender === "bot" && (
                                                    <span className="chat-message-name">
                                                        FoodSwift AI
                                                    </span>
                                                )}

                                                <div
                                                    className={`chat-message ${msg.sender}`}
                                                >
                                                    {msg.text}
                                                </div>

                                                {/* MENU RESULTS */}

                                                {msg.sender === "bot" &&
                                                    msg.menuItems?.length > 0 && (

                                                        <div className="chatbot-menu-results">

                                                            <h4>
                                                                Available on FoodSwift
                                                            </h4>

                                                            {msg.menuItems.map((item) => (

                                                                <article
                                                                    className="chatbot-menu-card"
                                                                    key={`${item.restaurant_id}-${item.id}`}
                                                                >

                                                                    <div className="chatbot-menu-card-info">

                                                                        <h5>{item.name}</h5>

                                                                        <p>{item.restaurant}</p>

                                                                        <p className="chatbot-menu-description">
                                                                            {item.description}
                                                                        </p>

                                                                        <div className="chatbot-menu-bottom">

                                                                            <strong>
                                                                                ₹{item.price}
                                                                            </strong>

                                                                            <span className="chatbot-availability">
                                                                                Available
                                                                            </span>

                                                                        </div>

                                                                        <Link
                                                                            className="chatbot-view-menu-link"
                                                                            to={getMenuItemUrl(item)}
                                                                            onClick={() =>
                                                                                setIsOpen(false)
                                                                            }
                                                                        >
                                                                            View Menu Item →
                                                                        </Link>

                                                                    </div>

                                                                </article>

                                                            ))}

                                                        </div>
                                                    )}

                                            </div>

                                        </div>

                                    ))}

                                    {/* TYPING INDICATOR */}

                                    {isLoading && (

                                        <div className="chat-message-row bot-row">

                                            <NeuralOrbIcon />

                                            <div className="chat-message-content">

                                                <span className="chat-message-name">
                                                    FoodSwift AI
                                                </span>

                                                <div className="chat-message bot chatbot-loading">

                                                    <span className="typing-dot"></span>
                                                    <span className="typing-dot"></span>
                                                    <span className="typing-dot"></span>

                                                </div>

                                            </div>

                                        </div>

                                    )}

                                    <div ref={messagesEndRef} />

                                </section>

                            )}

                        </main>

                        {/* FOOTER */}

                        <footer className="chatbot-footer">

                            <form
                                className="chatbot-composer"
                                onSubmit={handleSend}
                            >

                                <input
                                    type="text"
                                    value={message}
                                    onChange={(event) =>
                                        setMessage(event.target.value)
                                    }
                                    placeholder="What do you feel like eating?"
                                    disabled={isLoading}
                                />

                                <div className="composer-actions">

                                    <button
                                        type="button"
                                        className="composer-icon"
                                        onClick={() => setMessage("")}
                                        title="Clear message"
                                        disabled={isLoading}
                                    >
                                        +
                                    </button>

                                    <button
                                        type="button"
                                        className="composer-icon cart-icon"
                                        onClick={showCart}
                                        title="Show shopping cart"
                                        disabled={isLoading}
                                    >
                                        🛒
                                    </button>

                                    <div className="composer-spacer"></div>

                                    <button
                                        type="submit"
                                        className="composer-send"
                                        disabled={!message.trim() || isLoading}
                                        aria-label="Send message"
                                    >
                                        →
                                    </button>

                                </div>

                            </form>

                            <p className="chatbot-disclaimer">
                                AI-powered responses. Verify your order
                                details before checkout.
                            </p>

                        </footer>

                    </div>

                </div>
            )}

        </div>
    );
}

export default Chatbot;
