
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SavedAddresses.css";

const API_URL = "http://127.0.0.1:8000/api/account";

const emptyForm = {
  label: "home",
  recipient_name: "",
  phone: "",
  address_line: "",
  landmark: "",
  city: "",
  state: "Telangana",
  postal_code: "",
  is_default: false,
};

function getErrorMessage(data) {
  if (!data) return "Something went wrong. Please try again.";

  if (typeof data.detail === "string") return data.detail;

  if (typeof data === "string") return data;

  return Object.entries(data)
    .map(([field, errors]) => {
      const message = Array.isArray(errors) ? errors.join(" ") : String(errors);
      return `${field.replaceAll("_", " ")}: ${message}`;
    })
    .join(" ");
}

function getAddressText(address) {
  return [
    address.address_line,
    address.landmark,
    address.city,
    address.state,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function SavedAddresses() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const getToken = () => localStorage.getItem("accessToken");

  const loadAddresses = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setError("Please log in to manage your saved addresses.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/addresses/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setAddresses(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(err.message || "Unable to load saved addresses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openAddForm = () => {
    setForm({
      ...emptyForm,
      recipient_name: localStorage.getItem("user")
        ? (() => {
            try {
              return JSON.parse(localStorage.getItem("user")).name || "";
            } catch {
              return "";
            }
          })()
        : "",
    });

    setEditingId(null);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const openEditForm = (address) => {
    setForm({
      label: address.label || "home",
      recipient_name: address.recipient_name || "",
      phone: address.phone || "",
      address_line: address.address_line || "",
      landmark: address.landmark || "",
      city: address.city || "",
      state: address.state || "Telangana",
      postal_code: address.postal_code || "",
      is_default: Boolean(address.is_default),
    });

    setEditingId(address.id);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const token = getToken();

    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!/^\d{6}$/.test(form.postal_code.trim())) {
      setError("Enter a valid 6-digit postal code.");
      return;
    }

    setSaving(true);

    try {
      const isFirstAddress = addresses.length === 0;
      const payload = {
        ...form,
        recipient_name: form.recipient_name.trim(),
        phone: form.phone.trim(),
        address_line: form.address_line.trim(),
        landmark: form.landmark.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postal_code: form.postal_code.trim(),
        is_default: isFirstAddress || form.is_default,
      };

      const url = editingId
        ? `${API_URL}/addresses/${editingId}/`
        : `${API_URL}/addresses/`;

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setSuccess(editingId ? "Address updated successfully." : "Address saved successfully.");
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadAddresses();
    } catch (err) {
      setError(err.message || "Unable to save the address.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (address) => {
    const confirmed = window.confirm(
      `Delete this ${address.label} address?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/addresses/${address.id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(getErrorMessage(data));
      }

      setSuccess("Address deleted successfully.");
      await loadAddresses();
    } catch (err) {
      setError(err.message || "Unable to delete the address.");
    }
  };

  const makeDefault = async (address) => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/addresses/${address.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_default: true }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setSuccess("Default delivery address updated.");
      await loadAddresses();
    } catch (err) {
      setError(err.message || "Unable to update the default address.");
    }
  };

  return (
    <main className="saved-addresses-page">
      <header className="saved-addresses-header">
        <div>
          <p className="saved-addresses-eyebrow">YOUR ACCOUNT</p>
          <h1>Saved Addresses</h1>
          <p>Manage your delivery locations for a quicker checkout.</p>
        </div>

        <button
          type="button"
          className="saved-addresses-back"
          onClick={() => navigate("/profile")}
        >
          Back to Profile
        </button>
      </header>

      {error && (
        <div className="saved-addresses-message saved-addresses-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="saved-addresses-message saved-addresses-success" role="status">
          {success}
        </div>
      )}

      <section className="saved-addresses-toolbar">
        <div>
          <h2>Delivery locations</h2>
          <p>
            {addresses.length} saved{" "}
            {addresses.length === 1 ? "address" : "addresses"}
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            className="saved-addresses-add-button"
            onClick={openAddForm}
          >
            + Add New Address
          </button>
        )}
      </section>

      {showForm && (
        <section className="saved-addresses-form-card">
          <div className="saved-addresses-form-heading">
            <div>
              <h2>{editingId ? "Edit Address" : "Add New Address"}</h2>
              <p>Enter the details where you want your order delivered.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="saved-addresses-form-grid">
              <div className="saved-addresses-field">
                <label htmlFor="address-label">Address Type</label>
                <select
                  id="address-label"
                  name="label"
                  value={form.label}
                  onChange={updateField}
                  required
                >
                  <option value="home">Home</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="saved-addresses-field">
                <label htmlFor="recipient-name">Recipient Name</label>
                <input
                  id="recipient-name"
                  name="recipient_name"
                  value={form.recipient_name}
                  onChange={updateField}
                  placeholder="Full name"
                  maxLength={100}
                  required
                />
              </div>

              <div className="saved-addresses-field">
                <label htmlFor="address-phone">Mobile Number</label>
                <input
                  id="address-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={updateField}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>

              <div className="saved-addresses-field saved-addresses-field-full">
                <label htmlFor="address-line">House / Flat / Street</label>
                <textarea
                  id="address-line"
                  name="address_line"
                  value={form.address_line}
                  onChange={updateField}
                  placeholder="House number, apartment, street"
                  maxLength={255}
                  rows={2}
                  required
                />
              </div>

              <div className="saved-addresses-field">
                <label htmlFor="address-landmark">Landmark (Optional)</label>
                <input
                  id="address-landmark"
                  name="landmark"
                  value={form.landmark}
                  onChange={updateField}
                  placeholder="Nearby landmark"
                  maxLength={255}
                />
              </div>

              <div className="saved-addresses-field">
                <label htmlFor="address-city">City</label>
                <input
                  id="address-city"
                  name="city"
                  value={form.city}
                  onChange={updateField}
                  placeholder="City"
                  maxLength={100}
                  required
                />
              </div>

              <div className="saved-addresses-field">
                <label htmlFor="address-state">State</label>
                <input
                  id="address-state"
                  name="state"
                  value={form.state}
                  onChange={updateField}
                  placeholder="State"
                  maxLength={100}
                  required
                />
              </div>

              <div className="saved-addresses-field">
                <label htmlFor="address-postal">Postal Code</label>
                <input
                  id="address-postal"
                  name="postal_code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.postal_code}
                  onChange={updateField}
                  placeholder="6-digit postal code"
                  required
                />
              </div>
            </div>

            <label className="saved-addresses-default-option">
              <input
                type="checkbox"
                name="is_default"
                checked={form.is_default}
                onChange={updateField}
              />
              <span>Set as my default delivery address</span>
            </label>

            <div className="saved-addresses-form-actions">
              <button
                type="button"
                className="saved-addresses-cancel-button"
                onClick={cancelForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="saved-addresses-save-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Address"
                    : "Save Address"}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="saved-addresses-state">Loading your addresses...</div>
      ) : addresses.length === 0 ? (
        <section className="saved-addresses-empty">
          <div className="saved-addresses-empty-icon">
            <span className="saved-addresses-pin" aria-hidden="true" />
          </div>
          <h2>No saved addresses yet</h2>
          <p>Add your home or work address to make checkout faster.</p>
          {!showForm && (
            <button
              type="button"
              className="saved-addresses-save-button"
              onClick={openAddForm}
            >
              Add Your First Address
            </button>
          )}
        </section>
      ) : (
        <section className="saved-addresses-list">
          {addresses.map((address) => (
            <article
              className="saved-address-card"
              key={address.id}
            >
              <div className="saved-address-card-top">
                <div className="saved-address-type">
                  <span className="saved-address-type-icon">
                    {address.label === "home"
                      ? "H"
                      : address.label === "work"
                        ? "W"
                        : "O"}
                  </span>

                  <div>
                    <h3>
                      {address.label?.charAt(0).toUpperCase()}
                      {address.label?.slice(1)}
                    </h3>
                    <p>{address.recipient_name}</p>
                  </div>
                </div>

                {address.is_default && (
                  <span className="saved-address-default-badge">
                    Default
                  </span>
                )}
              </div>

              <p className="saved-address-full-text">
                {getAddressText(address)}
              </p>

              <p className="saved-address-phone">
                Mobile: {address.phone}
              </p>

              <div className="saved-address-card-actions">
                {!address.is_default && (
                  <button
                    type="button"
                    onClick={() => makeDefault(address)}
                  >
                    Set as Default
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openEditForm(address)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="saved-address-delete-action"
                  onClick={() => handleDelete(address)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
