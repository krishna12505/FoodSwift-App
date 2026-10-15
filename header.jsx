import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./header.css";

function Header({ openLogin, openRegister }) {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);

    // Read the existing login session.
    useEffect(() => {
        const loadUser = () => {
            const token = localStorage.getItem("accessToken");

            let storedUser = null;

            try {
                storedUser = JSON.parse(
                    localStorage.getItem("user") || "null"
                );
            } catch {
                storedUser = null;
            }

            setUser(token ? storedUser : null);
        };

        loadUser();

        // Refresh the header if authentication changes in this tab.
        window.addEventListener("foodswift-auth-changed", loadUser);

        return () => {
            window.removeEventListener(
                "foodswift-auth-changed",
                loadUser
            );
        };
    }, [openLogin, openRegister]);

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        setUser(null);
        setProfileOpen(false);

        navigate("/");
        window.location.reload();
    };

    const displayName = user?.name || "My Account";

    return (
        <header className="header">
            <div className="header-container">

                {/* Brand logo */}
                <a href="/" className="logo" aria-label="FoodSwift home">
                    <img
                        src="/foodswifticon.png"
                        alt="FoodSwift Logo"
                        className="logo-image"
                    />

                    <span className="brand-name">
                        Food<span>Swift</span>
                    </span>
                </a>

                {/* Navigation */}
                <nav className="header-nav" aria-label="Main navigation">
                    <a href="#home">Home</a>
                    <a href="#categories">Explore Food</a>
                    <a href="#restaurants">Restaurants</a>
                </nav>

                {/* Logged-in / logged-out controls */}
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
                                aria-label="Open customer profile menu"
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

                            <button type="button" onClick={() => {
                                    setProfileOpen(false);
                                    navigate("/profile");
                                }}>
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
