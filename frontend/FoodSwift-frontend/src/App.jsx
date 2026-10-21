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

function AppContent() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const location = useLocation();
  const isMenuPage = location.pathname === "/menu";

  return (
    <div>
      {!isMenuPage && (
        <Header
          openLogin={() => setShowLogin(true)}
          openRegister={() => setShowRegister(true)}
        />
      )}

      {showLogin && (
        <LoginModel
          closeLogin={() => setShowLogin(false)}
          openRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {showRegister && (
        <RegisterModel
          closeRegister={() => setShowRegister(false)}
          openLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      )}

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

        {/* Restaurant owner dashboard */}
        <Route
          path="/restaurant-dashboard"
          element={
            <ProtectedRoute allowedRole="restaurant_owner">
              <RestaurantOwnerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Delivery partner dashboard */}
        <Route
          path="/delivery-dashboard"
          element={
            <ProtectedRoute allowedRole="delivery_partner">
              <DeliveryPartnerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin dashboard */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reset-password/:uid/:token"
          element={<ResetPassword />}
        />

        <Route
          path="/addresses"
          element={
            <ProtectedRoute allowedRole="customer">
              <SavedAddresses />
            </ProtectedRoute>
          }
        />

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
