
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000/api";

export default function ProtectedRoute({ children, allowedRole }) {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const token = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");
        const savedUser = localStorage.getItem("user");

        if (!token || !savedUser) {
          console.warn("ProtectedRoute: login required.");
          if (active) setChecking(false);
          return;
        }

        const user = JSON.parse(savedUser);
        let accessToken = token;

        // Verify admin access using Django permissions.
        if (allowedRole === "admin") {
          let response = await fetch(
            `${API_URL}/account/admin/dashboard-stats/`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          // If the access token expired, try refreshing it once.
          if (response.status === 401 && refreshToken) {
            const refreshResponse = await fetch(
              `${API_URL}/account/token/refresh/`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ refresh: refreshToken }),
              }
            );

            if (refreshResponse.ok) {
              const data = await refreshResponse.json();
              accessToken = data.access;

              localStorage.setItem("accessToken", accessToken);

              if (data.refresh) {
                localStorage.setItem("refreshToken", data.refresh);
              }

              response = await fetch(
                `${API_URL}/account/admin/dashboard-stats/`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              );
            } else {
              console.error(
                "Token refresh failed:",
                refreshResponse.status
              );
            }
          }

          console.log("Admin API status:", response.status);

          if (!response.ok) {
            console.error(
              "Admin access denied:",
              await response.text()
            );
          }

          if (active) {
            setAuthorized(response.ok);
            setChecking(false);
          }

          return;
        }

        // Other dashboards use the stored application role.
        if (active) {
          setAuthorized(user.role === allowedRole);
          setChecking(false);
        }
      } catch (error) {
        console.error("ProtectedRoute error:", error);

        if (active) {
          setAuthorized(false);
          setChecking(false);
        }
      }
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [allowedRole]);

  if (checking) {
    return <div className="protected-route-loading">Checking access...</div>;
  }

  if (!authorized) {
    return <Navigate to="/" replace />;
  }

  return children;
}
    