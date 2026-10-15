import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CustomerProfile.css";

const API_URL = "http://127.0.0.1:8000";

function CustomerProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") || {};
    } catch {
      return {};
    }
  });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Load the latest profile from Django.
  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        navigate("/");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/account/profile/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            setError("Your session has expired. Please log in again.");
          } else {
            setError(data.detail || "Unable to load your profile.");
          }
          return;
        }

        setUser(data);
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        localStorage.setItem("user", JSON.stringify(data));
      } catch (err) {
        console.error("Profile loading error:", err);
        setError("Cannot connect to Django. Check that the backend is running.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  // Save profile changes to Django/MySQL.
  const handleSave = async (event) => {
    event.preventDefault();
    setError("");

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setError("Please log in again to update your profile.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/account/profile/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else {
          setError(
            data.detail ||
              data.name?.[0] ||
              data.phone?.[0] ||
              "Unable to save your profile."
          );
        }
        return;
      }

      const updatedUser = { ...user, ...data };

      setUser(updatedUser);
      setName(updatedUser.name || "");
      setEmail(updatedUser.email || "");
      setPhone(updatedUser.phone || "");

      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("foodswift-auth-changed"));

      setEditing(false);
    } catch (err) {
      console.error("Profile update error:", err);
      setError("Cannot connect to Django. Check that the backend is running.");
    } finally {
      setSaving(false);
    }
  };
  
  // Change password through the Django API.
  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("Your new password must be different from your current password.");
      return;
    }

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setPasswordError("Please log in again to change your password.");
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/account/change-password/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const messages = Object.values(data).flat();
        setPasswordError(
          messages.join(" ") || "Unable to change your password."
        );
        return;
      }

      setPasswordMessage(
        data.message || "Password changed successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Change password error:", err);
      setPasswordError(
        "Cannot connect to Django. Check that the backend is running."
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const cancelEditing = () => {
    setName(user.name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setError("");
    setEditing(false);
  };

  if (loading) {
    return (
      <main className="customer-profile-page">
        <p>Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="customer-profile-page">
      <div className="profile-page-heading">
        <button
          className="profile-back-button"
          onClick={() => navigate("/")}
          type="button"
        >
          ← Back to Home
        </button>

        <h1>My Profile</h1>
        <p>Manage your FoodSwift account and personal details.</p>
      </div>

      <div className="customer-profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-user-card">
            <div className="profile-large-avatar">
              {(user.name || "U").charAt(0).toUpperCase()}
            </div>

            <h2>{user.name || "FoodSwift User"}</h2>
            <p>{user.email || "No email available"}</p>

           
          </div>

          <nav className="profile-page-nav">
            <button className="active" type="button">
              Personal Information
            </button>

            <button type="button" onClick={() => navigate("/my-orders")}>
              My Orders
            </button>

            <button type="button" onClick={() => navigate("/favourites")}>
              Favourites
            </button>

            <button type="button" onClick={() => navigate("/addresses")}>
              Saved Addresses
            </button>
          </nav>
        </aside>

        <section className="profile-details-card">
          <div className="profile-details-heading">
            <div>
              <h2>Personal Information</h2>
              <p>View and manage your account details.</p>
            </div>

            {!editing && (
              <button
                className="profile-edit-button"
                type="button"
                onClick={() => {
                  setError("");
                  setEditing(true);
                }}
              >
                Edit Profile
              </button>
            )}
          </div>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: "18px",
                padding: "12px 14px",
                borderRadius: "9px",
                background: "#fff0f0",
                color: "#bd2929",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {editing ? (
            <form className="profile-edit-form" onSubmit={handleSave}>
              <label htmlFor="profile-name">Full Name</label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={100}
              />

              <label htmlFor="profile-email">Email Address</label>
              <input
                id="profile-email"
                type="email"
                value={email}
                readOnly
              />

              <label htmlFor="profile-phone">Phone Number</label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={15}
                placeholder="Enter your phone number"
              />

              <div className="profile-form-actions">
                <button
                  className="profile-cancel-button"
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="profile-save-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <span>Full Name</span>
                <strong>{user.name || "Not provided"}</strong>
              </div>

              <div className="profile-info-item">
                <span>Email Address</span>
                <strong>{user.email || "Not provided"}</strong>
              </div>

              <div className="profile-info-item">
                <span>Account Type</span>
                <strong>
                  {(user.role || "customer").replaceAll("_", " ")}
                </strong>
              </div>

              <div className="profile-info-item">
                <span>Phone Number</span>
                <strong>{user.phone || "Not provided"}</strong>
              </div>
            </div>
          )}

          <div className="profile-security-note">
            <strong>Keep your account secure</strong>
            <p>
              Never share your password or account access token with anyone.
            </p>
          </div>
          
            <div className="change-password-section">
            <div className="profile-details-heading">
                <div>
                <h2>Change Password</h2>
                <p>Update your password to keep your account secure.</p>
                </div>
            </div>

            {passwordMessage && (
                <p className="password-success">{passwordMessage}</p>
            )}

            {passwordError && (
                <p className="password-error" role="alert">
                {passwordError}
                </p>
            )}

            <form onSubmit={handleChangePassword} className="profile-edit-form">
                <label htmlFor="current-password">Current Password</label>
                <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
                />

                <label htmlFor="new-password">New Password</label>
                <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
                />

                <label htmlFor="confirm-password">Confirm New Password</label>
                <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
                />

                <div className="profile-form-actions">
                <button
                    className="profile-save-button"
                    type="submit"
                    disabled={passwordSaving}
                >
                    {passwordSaving ? "Updating..." : "Update Password"}
                </button>
                </div>
            </form>
            </div>

        </section>
      </div>
    </main>
  );
}

export default CustomerProfile;