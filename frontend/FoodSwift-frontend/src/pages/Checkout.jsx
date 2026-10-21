
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Checkout.css";

const API_URL = "http://127.0.0.1:8000";
const ACCOUNT_API = `${API_URL}/api/account`;
const CART_KEY = "foodswiftCart";

const emptyAddressForm = {
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

function getSavedCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "null");
    if (saved && Array.isArray(saved.items)) return saved;
  } catch {
    // Ignore invalid cart data.
  }

  return { restaurantId: null, items: [] };
}

function getAddressText(savedAddress) {
  return [
    savedAddress.address_line,
    savedAddress.landmark,
    savedAddress.city,
    savedAddress.state,
    savedAddress.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

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

function Checkout() {
  const navigate = useNavigate();

  const [cart] = useState(getSavedCart);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentOutcome, setPaymentOutcome] = useState("success");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Saved address state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressMessage, setAddressMessage] = useState("");

  // New address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);

  const subtotal = useMemo(
    () =>
      cart.items.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),
    [cart.items]
  );

  const deliveryFee = cart.items.length ? 40 : 0;
  const total = subtotal + deliveryFee;

  const loadSavedAddresses = useCallback(async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setSavedAddresses([]);
      setLoadingAddresses(false);
      return;
    }

    setLoadingAddresses(true);

    try {
      const response = await fetch(`${ACCOUNT_API}/addresses/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      const results = Array.isArray(data) ? data : data?.results || [];
      setSavedAddresses(results);

      // Automatically select the default address when available.
      if (results.length > 0) {
        setSelectedAddressId((currentId) => {
          if (currentId && results.some((item) => String(item.id) === currentId)) {
            return currentId;
          }

          const defaultAddress = results.find((item) => item.is_default);
          const selected = defaultAddress || results[0];

          setAddress(getAddressText(selected));
          setPhone(selected.phone || "");

          return String(selected.id);
        });
      }
    } catch (err) {
      setAddressMessage(
        err.message || "Unable to load saved addresses. You can enter your address manually."
      );
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    loadSavedAddresses();
  }, [loadSavedAddresses]);

  function handleSelectAddress(event) {
    const id = event.target.value;
    setSelectedAddressId(id);
    setAddressMessage("");
    setError("");

    if (!id) {
      setAddress("");
      setPhone("");
      return;
    }

    const selected = savedAddresses.find(
      (item) => String(item.id) === id
    );

    if (selected) {
      setAddress(getAddressText(selected));
      setPhone(selected.phone || "");
    }
  }

  function handleAddressFormChange(event) {
    const { name, value, checked, type } = event.target;

    setAddressForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function openNewAddressForm() {
    let savedName = "";

    try {
      savedName = JSON.parse(localStorage.getItem("user") || "{}").name || "";
    } catch {
      savedName = "";
    }

    setAddressForm({
      ...emptyAddressForm,
      recipient_name: savedName,
      phone,
      address_line: address,
    });

    setShowAddressForm(true);
    setAddressMessage("");
    setError("");
  }

  async function saveNewAddress(event) {
    event.preventDefault();
    setAddressMessage("");
    setError("");

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setError("Please log in before saving an address.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(addressForm.phone.trim())) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!/^\d{6}$/.test(addressForm.postal_code.trim())) {
      setError("Enter a valid 6-digit postal code.");
      return;
    }

    setSavingAddress(true);

    try {
      const payload = {
        ...addressForm,
        recipient_name: addressForm.recipient_name.trim(),
        phone: addressForm.phone.trim(),
        address_line: addressForm.address_line.trim(),
        landmark: addressForm.landmark.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postal_code: addressForm.postal_code.trim(),
        is_default: savedAddresses.length === 0 || addressForm.is_default,
      };

      const response = await fetch(`${ACCOUNT_API}/addresses/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      const formattedAddress = getAddressText(data);

      setAddress(formattedAddress);
      setPhone(data.phone || payload.phone);
      setShowAddressForm(false);
      setAddressMessage("Address saved successfully.");

      await loadSavedAddresses();

      setSelectedAddressId(String(data.id));
    } catch (err) {
      setError(err.message || "Unable to save this address.");
    } finally {
      setSavingAddress(false);
    }
  }

  async function placeOrder(event) {
    event.preventDefault();
    setError("");

    if (!cart.items.length) {
      setError("Your cart is empty. Please add some dishes first.");
      return;
    }

    if (!cart.restaurantId) {
      setError(
        "Restaurant information is missing. Please add your dishes again."
      );
      return;
    }

    if (address.trim().length < 10) {
      setError("Please enter a complete delivery address.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setError("Please log in before placing your order.");
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create the order in Django.
      const response = await fetch(`${API_URL}/api/orders/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          restaurant: Number(cart.restaurantId),
          items: cart.items.map((item) => ({
            menu_item: Number(item.id),
            quantity: Number(item.quantity),
          })),
          delivery_address: address.trim(),
          customer_phone: phone.trim(),
          payment_method: paymentMethod,
          notes: notes.trim(),
        }),
      });

      const order = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof order === "object" && order !== null
            ? Object.entries(order)
                .map(([key, value]) => {
                  const detail = Array.isArray(value)
                    ? value.join(" ")
                    : typeof value === "string"
                      ? value
                      : JSON.stringify(value);

                  return `${key}: ${detail}`;
                })
                .join(" ")
            : "";

        throw new Error(
          message || "Unable to place your order. Please try again."
        );
      }

      if (!order.id) {
        throw new Error(
          "The server did not return an order ID. Please check your orders before retrying."
        );
      }

      // The order now exists. Clear the cart to prevent duplicate orders.
      localStorage.removeItem(CART_KEY);

      // Step 2: Simulate payment only for the demo online option.
      if (paymentMethod === "mock") {
        try {
          const paymentResponse = await fetch(
            `${API_URL}/api/orders/${order.id}/mock-payment/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                outcome: paymentOutcome,
              }),
            }
          );

          const paymentData = await paymentResponse.json().catch(() => ({}));

          if (!paymentResponse.ok) {
            navigate("/my-orders", {
              state: {
                orderPlaced: true,
                orderId: order.id,
                paymentError:
                  paymentData.detail ||
                  "The order was created, but payment needs attention.",
              },
            });
            return;
          }

          navigate("/my-orders", {
            state: {
              orderPlaced: true,
              orderId: order.id,
              paymentStatus: paymentData.payment_status,
              paymentMethod: "mock",
              paymentMessage: paymentData.message,
              demoMode: true,
            },
          });
          return;
        } catch {
          // The order exists even if the payment request cannot connect.
          navigate("/my-orders", {
            state: {
              orderPlaced: true,
              orderId: order.id,
              paymentError:
                "Your order was created, but the payment result could not be confirmed. Check your order status before retrying.",
            },
          });
          return;
        }
      }

      // Step 3: COD order. Payment remains pending until cash is collected.
      navigate("/my-orders", {
        state: {
          orderPlaced: true,
          orderId: order.id,
          paymentStatus: order.payment_status || "pending",
          paymentMethod: "cod",
        },
      });
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart.items.length) {
    return (
      <main className="checkout-page">
        <section className="checkout-empty">
          <div className="checkout-empty-icon">🛒</div>
          <h1>Your cart is empty</h1>
          <p>Add dishes before proceeding to checkout.</p>
          <button
            type="button"
            className="checkout-primary-button"
            onClick={() => navigate("/")}
          >
            Explore restaurants
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-heading">
        <p className="checkout-eyebrow">FOODSWIFT · ALMOST THERE</p>
        <h1>Complete your order</h1>
        <p>Confirm your delivery details and place your order.</p>
      </div>

      <form className="checkout-layout" onSubmit={placeOrder}>
        <section className="checkout-form-panel">
          <div className="checkout-section-heading">
            <span className="checkout-step-number">1</span>
            <div>
              <h2>Delivery details</h2>
              <p>Where should we deliver your food?</p>
            </div>
          </div>

          <div className="checkout-saved-addresses">
            <div className="checkout-saved-address-heading">
              <label htmlFor="saved-address-select">
                Choose a saved address
              </label>
              <button
                type="button"
                onClick={() => navigate("/addresses")}
              >
                Manage addresses
              </button>
            </div>

            {loadingAddresses ? (
              <p className="checkout-address-hint">
                Loading your saved addresses...
              </p>
            ) : savedAddresses.length > 0 ? (
              <select
                id="saved-address-select"
                value={selectedAddressId}
                onChange={handleSelectAddress}
              >
                <option value="">Enter a different address manually</option>
                {savedAddresses.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.label.charAt(0).toUpperCase() +
                      item.label.slice(1)}
                    {item.is_default ? " (Default)" : ""} —{" "}
                    {item.address_line}, {item.city}
                  </option>
                ))}
              </select>
            ) : (
              <p className="checkout-address-hint">
                No saved addresses yet. Enter your delivery details below or
                add an address here.
              </p>
            )}

            {addressMessage && (
              <p className="checkout-address-success" role="status">
                {addressMessage}
              </p>
            )}

            <button
              type="button"
              className="checkout-save-address-toggle"
              onClick={() => {
                if (showAddressForm) {
                  setShowAddressForm(false);
                } else {
                  openNewAddressForm();
                }
              }}
            >
              {showAddressForm ? "Cancel adding address" : "+ Save a new address"}
            </button>
          </div>

          {showAddressForm && (
            <div className="checkout-new-address-form">
              <h3>Save a new delivery address</h3>
              <p className="checkout-address-hint">
                Fill in the address details to save them to your account.
              </p>

              <div className="checkout-address-grid">
                <div className="checkout-field">
                  <label htmlFor="new-address-label">Address type *</label>
                  <select
                    id="new-address-label"
                    name="label"
                    value={addressForm.label}
                    onChange={handleAddressFormChange}
                    required
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="checkout-field">
                  <label htmlFor="new-address-name">Recipient name *</label>
                  <input
                    id="new-address-name"
                    name="recipient_name"
                    value={addressForm.recipient_name}
                    onChange={handleAddressFormChange}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="new-address-phone">Mobile number *</label>
                  <input
                    id="new-address-phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    value={addressForm.phone}
                    onChange={(event) =>
                      setAddressForm((current) => ({
                        ...current,
                        phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="new-address-line">House / street *</label>
                  <textarea
                    id="new-address-line"
                    name="address_line"
                    value={addressForm.address_line}
                    onChange={handleAddressFormChange}
                    maxLength={255}
                    rows={2}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="new-address-landmark">Landmark</label>
                  <input
                    id="new-address-landmark"
                    name="landmark"
                    value={addressForm.landmark}
                    onChange={handleAddressFormChange}
                    maxLength={255}
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="new-address-city">City *</label>
                  <input
                    id="new-address-city"
                    name="city"
                    value={addressForm.city}
                    onChange={handleAddressFormChange}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="new-address-state">State *</label>
                  <input
                    id="new-address-state"
                    name="state"
                    value={addressForm.state}
                    onChange={handleAddressFormChange}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="new-address-postal">Postal code *</label>
                  <input
                    id="new-address-postal"
                    name="postal_code"
                    type="text"
                    inputMode="numeric"
                    value={addressForm.postal_code}
                    onChange={(event) =>
                      setAddressForm((current) => ({
                        ...current,
                        postal_code: event.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    maxLength={6}
                    placeholder="6-digit PIN code"
                    required
                  />
                </div>
              </div>

              <label className="checkout-default-address">
                <input
                  type="checkbox"
                  name="is_default"
                  checked={addressForm.is_default}
                  onChange={handleAddressFormChange}
                />
                Set as my default address
              </label>

              <button
                type="button"
                className="checkout-primary-button checkout-save-new-address-button"
                disabled={savingAddress}
                onClick={(event) => {
                  const form = event.currentTarget.closest(
                    ".checkout-new-address-form"
                  )?.querySelector("form");
                  if (form) form.requestSubmit();
                }}
              >
                {savingAddress ? "Saving address..." : "Save address"}
              </button>

              <form onSubmit={saveNewAddress} className="checkout-address-submit-form">
                <button type="submit" className="checkout-primary-button" disabled={savingAddress}>
                  {savingAddress ? "Saving address..." : "Confirm and save address"}
                </button>
              </form>
            </div>
          )}

          <div className="checkout-field">
            <label htmlFor="delivery-address">
              Complete delivery address *
            </label>
            <textarea
              id="delivery-address"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setSelectedAddressId("");
              }}
              placeholder="House/flat number, street, area, landmark, city and PIN code"
              rows={4}
              required
              minLength={10}
            />
          </div>

          <div className="checkout-field">
            <label htmlFor="delivery-phone">Contact mobile number *</label>
            <input
              id="delivery-phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="10-digit mobile number"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              required
            />
          </div>

          <div className="checkout-field">
            <label htmlFor="order-notes">Delivery instructions (optional)</label>
            <textarea
              id="order-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Gate instructions or other notes"
              rows={3}
            />
          </div>

          <div className="checkout-section-heading payment-heading">
            <span className="checkout-step-number">2</span>
            <div>
              <h2>Payment method</h2>
              <p>Choose how you want to pay.</p>
            </div>
          </div>

          <label className="checkout-payment-option">
            <input
              type="radio"
              name="payment"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
            />
            <span className="checkout-cod-icon">₹</span>
            <span className="checkout-payment-text">
              <strong>Cash on Delivery</strong>
              <small>Pay when your order arrives</small>
            </span>
            <span className="checkout-payment-check">
              {paymentMethod === "cod" ? "✓" : ""}
            </span>
          </label>

          <label className="checkout-payment-option">
            <input
              type="radio"
              name="payment"
              value="mock"
              checked={paymentMethod === "mock"}
              onChange={() => setPaymentMethod("mock")}
            />
            <span className="checkout-cod-icon">↗</span>
            <span className="checkout-payment-text">
              <strong>Online Payment (Demo)</strong>
              <small>Simulated payment — no real money</small>
            </span>
            <span className="checkout-payment-check">
              {paymentMethod === "mock" ? "✓" : ""}
            </span>
          </label>

          {paymentMethod === "mock" && (
            <div className="checkout-field">
              <label htmlFor="mock-outcome">Demo payment result</label>
              <select
                id="mock-outcome"
                value={paymentOutcome}
                onChange={(event) => setPaymentOutcome(event.target.value)}
              >
                <option value="success">Simulate successful payment</option>
                <option value="failure">Simulate failed payment</option>
              </select>
              <small>
                Demo only. This does not contact a real payment provider.
              </small>
            </div>
          )}

          {error && (
            <div className="checkout-error" role="alert">
              {error}
              {error.includes("log in") && (
                <button type="button" onClick={() => navigate("/")}>
                  Go to home and log in
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            className="checkout-primary-button checkout-place-button"
            disabled={submitting}
          >
            {submitting
              ? "Processing your order..."
              : paymentMethod === "mock"
                ? `Place order & simulate payment · ₹${total.toFixed(2)}`
                : `Place order · ₹${total.toFixed(2)}`}
          </button>

          <p className="checkout-secure-note">
            {paymentMethod === "mock"
              ? "Demo payment only. No real money will be charged."
              : "Please review your delivery details before placing your order."}
          </p>
        </section>

        <aside className="checkout-summary">
          <h2>Order summary</h2>
          <p className="checkout-item-count">
            {cart.items.reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0
            )}{" "}
            item(s)
          </p>

          <div className="checkout-summary-items">
            {cart.items.map((item) => (
              <div className="checkout-summary-item" key={item.id}>
                <div className="checkout-summary-item-info">
                  <span className="checkout-item-quantity">
                    {item.quantity}×
                  </span>
                  <span>{item.name}</span>
                </div>
                <strong>
                  ₹
                  {(
                    Number(item.price || 0) * Number(item.quantity || 0)
                  ).toFixed(2)}
                </strong>
              </div>
            ))}
          </div>

          <div className="checkout-price-row">
            <span>Item subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          <div className="checkout-price-row">
            <span>Delivery fee</span>
            <span>₹{deliveryFee.toFixed(2)}</span>
          </div>

          <div className="checkout-total-row">
            <strong>Total payable</strong>
            <strong>₹{total.toFixed(2)}</strong>
          </div>

          <button
            type="button"
            className="checkout-back-button"
            onClick={() => navigate("/cart")}
          >
            ← Return to cart
          </button>
        </aside>
      </form>
    </main>
  );
}

export default Checkout;
