
import "./LoginModel.css";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "") + "/api/account";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Google Identity Services script
const GOOGLE_SCRIPT_URL =
    "https://accounts.google.com/gsi/client";

function LoginModel({ closeLogin, openRegister }) {
    const navigate = useNavigate();
    const googleButtonRef = useRef(null);

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState("");

    const [forgotMode, setForgotMode] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState("");
    const [resetError, setResetError] = useState("");

    // =========================================
    // COMMON LOGIN SUCCESS HANDLER
    // Used by normal login and Google login
    // =========================================

    const completeLogin = useCallback(async (data) => {
        const accessToken = data.tokens?.access;
        const refreshToken = data.tokens?.refresh;
        const user = data.user;

        if (!accessToken || !refreshToken || !user?.role) {
            throw new Error(
                "Login response is missing token or user role information."
            );
        }

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("user", JSON.stringify(user));

        window.dispatchEvent(
            new Event("foodswift-auth-changed")
        );

        // Check whether the authenticated user is an admin
        const adminResponse = await fetch(
            `${API_URL}/admin/dashboard-stats/`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (adminResponse.ok) {
            closeLogin();
            navigate("/admin-dashboard", { replace: true });
            return;
        }

        closeLogin();

        switch (user.role) {
            case "delivery_partner":
                navigate("/delivery-dashboard", {
                    replace: true,
                });
                break;

            case "restaurant_owner":
                navigate("/restaurant-dashboard", {
                    replace: true,
                });
                break;

            case "customer":
                navigate("/", { replace: true });
                break;

            default:
                throw new Error(
                    "Your account role is not recognized. Please contact support."
                );
        }
    }, [closeLogin, navigate]);

    // =========================================
    // NORMAL EMAIL AND PASSWORD LOGIN
    // =========================================

    const handleLogin = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/login/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const message =
                    (typeof data.detail === "string" && data.detail) ||
                    data.email?.[0] ||
                    data.password?.[0] ||
                    data.non_field_errors?.[0] ||
                    "Login failed. Please check your credentials.";

                throw new Error(message);
            }

            await completeLogin(data);

        } catch (err) {
            console.error("Login error:", err);

            setError(
                err instanceof TypeError
                    ? "Cannot connect to the server. Check that Django is running."
                    : err.message
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================================
    // GOOGLE LOGIN
    // =========================================

    const handleGoogleCredential = useCallback(async (response) => {
        setError("");

        if (!response?.credential) {
            setError("Google authentication failed. Please try again.");
            return;
        }

        setGoogleLoading(true);

        try {
            const apiResponse = await fetch(
                `${API_URL}/google/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        credential: response.credential,
                    }),
                }
            );

            const data = await apiResponse.json();

            if (!apiResponse.ok) {
                throw new Error(
                    data.detail ||
                    data.message ||
                    "Google login failed. Please try again."
                );
            }

            await completeLogin(data);

        } catch (err) {
            console.error("Google login error:", err);

            setError(
                err instanceof TypeError
                    ? "Cannot connect to the server. Please try again."
                    : err.message
            );
        } finally {
            setGoogleLoading(false);
        }
    }, [completeLogin]);

    // =========================================
    // LOAD GOOGLE IDENTITY SERVICES
    // =========================================

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) {
            return;
        }

        let cancelled = false;

        const initializeGoogleLogin = () => {
            if (
                cancelled ||
                !window.google?.accounts?.id ||
                !googleButtonRef.current
            ) {
                return;
            }

            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredential,
            });

            googleButtonRef.current.innerHTML = "";

            window.google.accounts.id.renderButton(
                googleButtonRef.current,
                {
                    type: "standard",
                    theme: "outline",
                    size: "large",
                    text: "continue_with",
                    shape: "rectangular",
                    width: 300,
                    logo_alignment: "left",
                }
            );
        };

        // Check whether Google script is already loaded
        if (window.google?.accounts?.id) {
            initializeGoogleLogin();
        } else {
            let googleScript = document.getElementById(
                "google-identity-services"
            );

            if (!googleScript) {
                googleScript = document.createElement("script");
                googleScript.id = "google-identity-services";
                googleScript.src = GOOGLE_SCRIPT_URL;
                googleScript.async = true;
                googleScript.defer = true;

                document.head.appendChild(googleScript);
            }

            googleScript.addEventListener(
                "load",
                initializeGoogleLogin,
                { once: true }
            );
        }

        return () => {
            cancelled = true;
        };
    }, [handleGoogleCredential]);

    // =========================================
    // FORGOT PASSWORD
    // =========================================

    const handleForgotPassword = async (event) => {
        event.preventDefault();

        setResetMessage("");
        setResetError("");
        setResetLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/forgot-password/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: resetEmail.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const message =
                    data.message ||
                    data.detail ||
                    "Unable to process your request. Please try again.";

                throw new Error(
                    Array.isArray(message)
                        ? message.join(" ")
                        : message
                );
            }

            setResetMessage(
                data.message ||
                "If an account exists with that email, a password reset link has been sent."
            );

        } catch (err) {
            console.error("Forgot password error:", err);

            setResetError(
                err instanceof TypeError
                    ? "Cannot connect to the server. Please try again."
                    : err.message
            );
        } finally {
            setResetLoading(false);
        }
    };

    // =========================================
    // RETURN TO LOGIN
    // =========================================

    const returnToLogin = () => {
        setForgotMode(false);
        setResetMessage("");
        setResetError("");
        setError("");
    };

    // =========================================
    // UI
    // =========================================

    return (
        <div
            className="modal-overlay"
            onClick={closeLogin}
        >
            <div
                className="login-modal"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className="close-button"
                    onClick={closeLogin}
                    aria-label="Close login"
                >
                    ×
                </button>

                {/* LEFT SECTION */}

                <div className="login-left">
                    <div className="login-logo">
                        <img
                            src="/foodswifticon.png"
                            alt="FoodSwift"
                        />
                    </div>

                    <h2>FoodSwift</h2>

                    <p>
                        Delicious food is just a few clicks away.
                    </p>
                </div>

                {/* RIGHT SECTION */}

                <div className="login-right">

                    {forgotMode ? (
                        <>
                            <h1>Forgot Password?</h1>

                            <p className="modal-subtitle">
                                Enter your registered email address
                                and we'll send you a password reset link.
                            </p>

                            <form onSubmit={handleForgotPassword}>
                                <div className="input-group">
                                    <label htmlFor="reset-email">
                                        Email Address
                                    </label>

                                    <input
                                        id="reset-email"
                                        type="email"
                                        placeholder="Enter your registered email"
                                        value={resetEmail}
                                        onChange={(event) =>
                                            setResetEmail(event.target.value)
                                        }
                                        autoComplete="email"
                                        required
                                    />
                                </div>

                                {resetMessage && (
                                    <p
                                        role="status"
                                        style={{
                                            color: "green",
                                            marginBottom: "14px",
                                        }}
                                    >
                                        {resetMessage}
                                    </p>
                                )}

                                {resetError && (
                                    <p
                                        role="alert"
                                        style={{
                                            color: "red",
                                            marginBottom: "14px",
                                        }}
                                    >
                                        {resetError}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className="login-submit"
                                    disabled={resetLoading}
                                >
                                    {resetLoading
                                        ? "Sending..."
                                        : "Send Reset Link"}
                                </button>
                            </form>

                            <p className="register-text">
                                Remember your password?{" "}
                                <button
                                    type="button"
                                    onClick={returnToLogin}
                                >
                                    Back to Login
                                </button>
                            </p>
                        </>
                    ) : (
                        <>
                            <h1>Welcome Back!</h1>

                            <p className="modal-subtitle">
                                Sign in to continue to FoodSwift
                            </p>

                            {/* EMAIL LOGIN FORM */}

                            <form onSubmit={handleLogin}>
                                <div className="input-group">
                                    <label htmlFor="login-email">
                                        Email Address
                                    </label>

                                    <input
                                        id="login-email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(event) =>
                                            setEmail(event.target.value)
                                        }
                                        autoComplete="email"
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label htmlFor="login-password">
                                        Password
                                    </label>

                                    <div className="password-box">
                                        <input
                                            id="login-password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
                                            autoComplete="current-password"
                                            required
                                        />

                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                </div>

                                <div className="forgot-password">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setResetEmail(email);
                                            setResetMessage("");
                                            setResetError("");
                                            setForgotMode(true);
                                            setError("");
                                        }}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                {error && (
                                    <p
                                        role="alert"
                                        style={{
                                            color: "red",
                                            marginBottom: "14px",
                                        }}
                                    >
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className="login-submit"
                                    disabled={loading || googleLoading}
                                >
                                    {loading
                                        ? "Signing in..."
                                        : "Sign In"}
                                </button>
                            </form>

                            {/* DIVIDER */}

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    margin: "20px 0",
                                    color: "#888",
                                }}
                            >
                                <span
                                    style={{
                                        flex: 1,
                                        height: "1px",
                                        background: "#ddd",
                                    }}
                                />

                                <span style={{ fontSize: "13px" }}>
                                    OR
                                </span>

                                <span
                                    style={{
                                        flex: 1,
                                        height: "1px",
                                        background: "#ddd",
                                    }}
                                />
                            </div>

                            {/* GOOGLE SIGN-IN BUTTON */}

                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "10px",
                                }}
                            >
                                {GOOGLE_CLIENT_ID ? (
                                    <div
                                        ref={googleButtonRef}
                                        style={{
                                            minHeight: "40px",
                                        }}
                                    />
                                ) : (
                                    <p
                                        style={{
                                            color: "red",
                                            fontSize: "13px",
                                            textAlign: "center",
                                        }}
                                    >
                                        Google Sign-In is not configured.
                                        Please set VITE_GOOGLE_CLIENT_ID.
                                    </p>
                                )}

                                {googleLoading && (
                                    <p style={{ fontSize: "13px" }}>
                                        Signing in with Google...
                                    </p>
                                )}
                            </div>

                            {/* REGISTER LINK */}

                            <p className="register-text">
                                Don't have an account?{" "}
                                <button
                                    type="button"
                                    onClick={openRegister}
                                >
                                    Sign Up
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LoginModel;
