import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Header from "./components/header";
import LoginModel from "./pages/LoginModel";
import RegisterModel from "./pages/RegisterModel";
import CustomerHome from "./pages/CustomerHome";
import RestaurantMenu from "./pages/RestaurantMenu";
import CustomerProfile from "./pages/CustomerProfile";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import MyOrders from "./pages/MyOrders";
import RestaurantOwnerDashboard from "./pages/RestaurantOwnerDashboard";
import DeliveryPartnerDashboard from "./pages/DeliveryPartnerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ResetPassword from "./pages/ResetPassword";
import SavedAddresses from "./pages/SavedAddresses";
import Chatbot from "./pages/Chatbot";

function AppContent() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const location = useLocation();

  const isMenuPage = location.pathname === "/menu";

  // Show chatbot only on customer-facing pages
  const showChatbot = [
    "/",
    "/menu",
    "/profile",
    "/cart",
    "/checkout",
    "/my-orders",
    "/addresses",
  ].includes(location.pathname);

  return (
    <div>
      {/* Header */}
      {!isMenuPage && (
        <Header
          openLogin={() => setShowLogin(true)}
          openRegister={() => setShowRegister(true)}
        />
      )}

      {/* Login Modal */}
      {showLogin && (
        <LoginModel
          closeLogin={() => setShowLogin(false)}
          openRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {/* Register Modal */}
      {showRegister && (
        <RegisterModel
          closeRegister={() => setShowRegister(false)}
          openLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      )}

      {/* Application Routes */}
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<CustomerHome />} />
        <Route path="/menu" element={<RestaurantMenu />} />

        {/* Customer pages */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRole="customer">
              <CustomerProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cart"
          element={
            <ProtectedRoute allowedRole="customer">
              <Cart />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute allowedRole="customer">
              <Checkout />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-orders"
          element={
            <ProtectedRoute allowedRole="customer">
              <MyOrders />
            </ProtectedRoute>
          }
        />

        {/* Restaurant Owner Dashboard */}
        <Route
          path="/restaurant-dashboard"
          element={
            <ProtectedRoute allowedRole="restaurant_owner">
              <RestaurantOwnerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Delivery Partner Dashboard */}
        <Route
          path="/delivery-dashboard"
          element={
            <ProtectedRoute allowedRole="delivery_partner">
              <DeliveryPartnerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Password Reset */}
        <Route
          path="/reset-password/:uid/:token"
          element={<ResetPassword />}
        />

        {/* Saved Addresses */}
        <Route
          path="/addresses"
          element={
            <ProtectedRoute allowedRole="customer">
              <SavedAddresses />
            </ProtectedRoute>
          }
        />

        {/* Unknown Routes */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>

      {/* FoodSwift AI Chatbot */}
      {showChatbot && <Chatbot />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
