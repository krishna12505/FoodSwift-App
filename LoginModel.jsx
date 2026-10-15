import "./LoginModel.css";
import { useState } from "react";

function LoginModel({ closeLogin, openRegister }) {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    const handleLogin = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/account/login/",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                    }),
                }
            );

            const data = await response.json();

            

            if (!response.ok) {
                const message =
                    typeof data.detail === "string"
                        ? data.detail
                        : data.email?.[0] ||
                          data.password?.[0] ||
                          data.non_field_errors?.[0] ||
                          "Login failed. Please check your credentials.";

                throw new Error(message);
            }

            // Save the JWT tokens for authenticated API requests.

            // Save JWT tokens.
            localStorage.setItem("accessToken", data.tokens.access);
            localStorage.setItem("refreshToken", data.tokens.refresh);

            // Save customer details.
            localStorage.setItem("user", JSON.stringify(data.user));

            // Notify the header that login is complete.
            window.dispatchEvent(new Event("foodswift-auth-changed"));

            console.log("Access token saved:", Boolean(localStorage.getItem("accessToken")));
            console.log("Refresh token saved:", Boolean(localStorage.getItem("refreshToken")));
            console.log("Logged-in user:", data.user);

            // Close the login modal after successful login.
            setTimeout(() => {
                closeLogin();
            }, 800);
        } catch (err) {
            setError(
                err instanceof TypeError
                    ? "Cannot connect to the server. Check that Django is running."
                    : err.message
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={closeLogin}>
            <div
                className="login-modal"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className="close-button"
                    onClick={closeLogin}
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
                                        showPassword ? "text" : "password"
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
                                onClick={() =>
                                    setError(
                                        "Password reset will be available soon."
                                    )
                                }
                            >
                                Forgot Password?
                            </button>
                        </div>

                        {error && (
                            <p role="alert" style={{ color: "red" }}>
                                {error}
                            </p>
                        )}


                        <button
                            type="submit"
                            className="login-submit"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <p className="register-text">
                        Don't have an account?

                        <button
                            type="button"
                            onClick={openRegister}
                        >
                            Sign Up
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginModel;
