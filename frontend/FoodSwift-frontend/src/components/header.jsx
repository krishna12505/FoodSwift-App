import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./header.css";

function Header({ openLogin, openRegister }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);

    // Read the current login session.
    useEffect(() => {
        const loadUser = () => {
            const token = localStorage.getItem("accessToken");

            try {
                const storedUser = JSON.parse(
                    localStorage.getItem("user") || "null"
                );

                setUser(token ? storedUser : null);
            } catch {
                setUser(null);
            }
        };

        loadUser();

        window.addEventListener("foodswift-auth-changed", loadUser);
        window.addEventListener("storage", loadUser);

        return () => {
            window.removeEventListener("foodswift-auth-changed", loadUser);
            window.removeEventListener("storage", loadUser);
        };
    }, []);

    // Navigate to a section on CustomerHome.
    const goToSection = (sectionId) => {
        setProfileOpen(false);

        if (location.pathname !== "/") {
            navigate("/", {
                state: { scrollToSection: sectionId },
            });
            return;
        }

        const section = document.getElementById(sectionId);

        if (section) {
            section.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        } else {
            console.warn(
                `Section #${sectionId} was not found. ` +
                "Check the corresponding ID in CustomerHome.jsx."
            );
        }
    };

    // Handle scrolling after returning to the home page.
    useEffect(() => {
        const sectionId = location.state?.scrollToSection;

        if (location.pathname !== "/" || !sectionId) {
            return;
        }

        const frameId = requestAnimationFrame(() => {
            document.getElementById(sectionId)?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });

        return () => cancelAnimationFrame(frameId);
    }, [location.pathname, location.state]);

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        setUser(null);
        setProfileOpen(false);

        window.dispatchEvent(new Event("foodswift-auth-changed"));
        navigate("/");
    };

    const displayName = user?.name || "My Account";

    return (
        <header className="header">
            <div className="header-container">

                {/* Brand logo */}
                <button
                    type="button"
                    className="logo"
                    aria-label="FoodSwift home"
                    onClick={() => {
                        if (location.pathname !== "/") {
                            navigate("/");
                        } else {
                            window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                            });
                        }
                    }}
                >
                    <img
                        src="/foodswifticon.png"
                        alt="FoodSwift Logo"
                        className="logo-image"
                    />

                    <span className="brand-name">
                        Food<span>Swift</span>
                    </span>
                </button>

                {/* Main navigation */}
                <nav className="header-nav" aria-label="Main navigation">
                    <a
                        href="/#home"
                        onClick={(event) => {
                            event.preventDefault();
                            goToSection("home");
                        }}
                    >
                        Home
                    </a>

                    <a
                        href="/#categories"
                        onClick={(event) => {
                            event.preventDefault();
                            goToSection("categories");
                        }}
                    >
                        Explore
                    </a>

                    <a
                        href="/#restaurants"
                        onClick={(event) => {
                            event.preventDefault();
                            goToSection("restaurants");
                        }}
                    >
                        Restaurants
                    </a>
                </nav>

                {/* Authentication and profile */}
                <div className="header-button">
                    {!user ? (
                        <>
                            <button
                                type="button"
                                className="Signin-button"
                                onClick={openLogin}
                            >
                                Sign In
                            </button>

                            <button
                                type="button"
                                className="signup-button"
                                onClick={openRegister}
                            >
                                Sign Up
                            </button>
                        </>
                    ) : (
                        <div className="profile-container">
                            <button
                                type="button"
                                className="profile-trigger"
                                aria-expanded={profileOpen}
                                aria-label="Open account menu"
                                onClick={() =>
                                    setProfileOpen((previous) => !previous)
                                }
                            >
                                <span className="profile-avatar">
                                    {displayName.charAt(0).toUpperCase()}
                                </span>

                                <span className="profile-name">
                                    {displayName}
                                </span>

                                <span className="profile-chevron">
                                    {profileOpen ? "▲" : "▼"}
                                </span>
                            </button>

                            {profileOpen && (
                                <div className="profile-dropdown">
                                    <div className="profile-summary">
                                        <strong>{displayName}</strong>
                                        <span>{user.email || ""}</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            navigate("/profile");
                                        }}
                                    >
                                        <span>My Profile</span>
                                        <span className="menu-arrow">›</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            navigate("/my-orders");
                                        }}
                                    >
                                        <span>My Orders</span>
                                        <span className="menu-arrow">›</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            navigate("/favourites");
                                        }}
                                    >
                                        <span>Favourites</span>
                                        <span className="menu-arrow">›</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            navigate("/addresses");
                                        }}
                                    >
                                        <span>Saved Addresses</span>
                                        <span className="menu-arrow">›</span>
                                    </button>

                                    {user.role === "restaurant_owner" && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProfileOpen(false);
                                                navigate("/restaurant-dashboard");
                                            }}
                                        >
                                            <span>Restaurant Dashboard</span>
                                            <span className="menu-arrow">›</span>
                                        </button>
                                    )}

                                    <div className="profile-divider" />

                                    <button
                                        type="button"
                                        className="logout-option"
                                        onClick={handleLogout}
                                    >
                                        <span>Logout</span>
                                        <span className="menu-arrow">↗</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;
