
import "./RegisterModel.css";
import { useState } from "react";

function RegisterModel({ closeRegister, openLogin }) {
    const [showPassword, setShowPassword] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("");


    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Match the role values accepted by your Django Account model.
        const roleMap = {
            customer: "customer",
            restaurant: "restaurant_owner",
            delivery: "delivery_partner",
        };

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/account/register/",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim(),
                        password,
                        role: roleMap[role],
                    }),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message = Object.entries(data)
                    .map(([field, messages]) => {
                        const details = Array.isArray(messages)
                            ? messages.join(", ")
                            : typeof messages === "string"
                                ? messages
                                : JSON.stringify(messages);

                        return `${field}: ${details}`;
                    })
                    .join("\n");

                setError(message || "Registration failed. Please try again.");
                return;
            }

            alert("FoodSwift account created successfully!");

            closeRegister();
            openLogin();
        } catch (err) {
            console.error("Registration error:", err);
            setError(
                "Cannot connect to Django. Please check that the backend is running."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="model-overlay">
            <div className="register-model">

                <button
                    className="close-button"
                    type="button"
                    onClick={closeRegister}
                    aria-label="Close registration"
                >
                    ×
                </button>

                {/* Left section */}
                <div className="register-left">
                    <div className="register-logo">
                        <img src="/foodswifticon.png" alt="FoodSwift" />
                    </div>

                    <h2>Join FoodSwift</h2>
                    <p>
                        Create your account and enjoy delicious food
                        delivery to your doorstep.
                    </p>
                </div>

                {/* Right section */}
                <div className="register-right">
                    <h1>Create Account</h1>
                    <p className="model-subtitle">Join FoodSwift today</p>

                    <form onSubmit={handleRegister}>
                        <div className="input-group">
                            <label htmlFor="register-name">Full Name</label>
                            <input
                                id="register-name"
                                type="text"
                                placeholder="Enter your full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={100}
                                autoComplete="name"
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="register-email">Email Address</label>
                            <input
                                id="register-email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="register-password">Password</label>

                            <div className="password-box">
                                <input
                                    id="register-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={8}
                                    autoComplete="new-password"
                                    required
                                />

                                <button
                                    className="password-toggle"
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((previous) => !previous)
                                    }
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="register-role">Register As</label>
                            <select
                                id="register-role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                required
                            >
                                <option value="">Select your role</option>
                                <option value="customer">Customer</option>
                                <option value="restaurant">Restaurant Owner</option>
                                <option value="delivery">Delivery Partner</option>
                            </select>
                        </div>

                        {error && (
                            <p
                                role="alert"
                                style={{
                                    color: "#c62828",
                                    whiteSpace: "pre-line",
                                    marginBottom: "12px",
                                }}
                            >
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={loading}
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                        </button>
                    </form>

                    <p className="register-text">
                        Already Have Account?
                        <button type="button" onClick={openLogin}>
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default RegisterModel;
