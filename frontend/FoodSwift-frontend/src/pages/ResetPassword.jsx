
import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import "./ResetPassword.css";

const API_URL = "http://127.0.0.1:8000/api/account";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/reset-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid,
          token,
          new_password: password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiMessage = data.message || data.detail;

        setError(
          Array.isArray(apiMessage)
            ? apiMessage.join(" ")
            : typeof apiMessage === "string"
              ? apiMessage
              : "Unable to reset password. Please try again."
        );
        return;
      }

      setMessage(
        data.message || "Password reset successfully. Please log in."
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/");
      }, 2500);
    } catch (err) {
      console.error("Password reset error:", err);
      setError(
        "Cannot connect to the server. Please check that Django is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="reset-password-wrapper">
      <section className="reset-password-page">
        <div className="reset-password-brand">
          <span className="reset-password-logo">FoodSwift</span>
          <span className="reset-password-tagline">
            Good food. Delivered fast.
          </span>
        </div>

        <div className="reset-password-heading">
          <h1>Reset your password</h1>
          <p>
            Create a new password for your FoodSwift account.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="reset-form-group">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div className="reset-form-group">
            <label htmlFor="confirmPassword">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="reset-message reset-error" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div
              className="reset-message reset-success"
              role="status"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            className="reset-submit-button"
            disabled={loading}
          >
            {loading ? "Resetting password..." : "Reset Password"}
          </button>
        </form>

        <div className="reset-password-footer">
          <Link to="/">Return to FoodSwift login</Link>
        </div>
      </section>
    </main>
  );
}
