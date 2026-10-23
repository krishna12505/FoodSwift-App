
import "./LoginModel.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "") + "/api/account";

function LoginModel({ closeLogin, openRegister }) {
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [forgotMode, setForgotMode] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState("");
    const [resetError, setResetError] = useState("");

    const handleLogin = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
                    setError(
                        "Your account role is not recognized. Please contact support."
                    );
            }
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

    const returnToLogin = () => {
        setForgotMode(false);
        setResetMessage("");
        setResetError("");
        setError("");
    };

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
                                            setResetEmail(
                                                event.target.value
                                            )
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
                                                setPassword(
                                                    event.target.value
                                                )
                                            }
                                            autoComplete="current-password"
                                            required
                                        />

                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() =>
                                                setShowPassword(
                                                    !showPassword
                                                )
                                            }
                                        >
                                            {showPassword
                                                ? "Hide"
                                                : "Show"}
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
                                        style={{ color: "red" }}
                                    >
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className="login-submit"
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Signing in..."
                                        : "Sign In"}
                                </button>
                            </form>

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
