from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    ChangePasswordView,
    LogoutView,
    AdminDashboardStatsView,
    AdminUsersListView,
    ForgotPasswordView,
    ResetPasswordView,
    SavedAddressListCreateView,
    SavedAddressDetailView,
)

urlpatterns = [
    # Authentication
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path(
        "change-password/",
        ChangePasswordView.as_view(),
        name="change-password",
    ),
    path("logout/", LogoutView.as_view(), name="logout"),

    # Refresh an expired access token
    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    # Admin
    path(
        "admin/dashboard-stats/",
        AdminDashboardStatsView.as_view(),
        name="admin-dashboard-stats",
    ),
    path(
        "admin/users/",
        AdminUsersListView.as_view(),
        name="admin-users-list",
    ),

    # Forgot and reset password
    path(
        "forgot-password/",
        ForgotPasswordView.as_view(),
        name="forgot-password",
    ),
    path(
        "reset-password/",
        ResetPasswordView.as_view(),
        name="reset-password",
    ),

    # Saved Addresses
    path(
        "addresses/",
        SavedAddressListCreateView.as_view(),
        name="saved-address-list-create",
    ),
    path(
        "addresses/<int:pk>/",
        SavedAddressDetailView.as_view(),
        name="saved-address-detail",
    ),
]
