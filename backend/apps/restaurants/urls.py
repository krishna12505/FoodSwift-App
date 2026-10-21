
from django.urls import path

from .views import (
    RestaurantListCreateView,
    MyRestaurantsView,
    RestaurantDetailView,
    AdminRestaurantListView,
    AdminRestaurantCreateView,
    AdminRestaurantVerificationView,
    RestaurantRegistrationEmailView
)

urlpatterns = [
    # Public: list approved restaurants
    # Restaurant owner: submit a restaurant application
    path(
        "",
        RestaurantListCreateView.as_view(),
        name="restaurant-list-create",
    ),

    # Restaurant owner: list their own restaurants
    path(
        "my-restaurants/",
        MyRestaurantsView.as_view(),
        name="my-restaurants",
    ),

    # Retrieve, update, or delete a restaurant
    path(
        "<int:pk>/",
        RestaurantDetailView.as_view(),
        name="restaurant-detail",
    ),

    # Admin: list all restaurants
    path(
        "admin/restaurants/",
        AdminRestaurantListView.as_view(),
        name="admin-restaurant-list",
    ),

    # Admin: create a restaurant and assign its owner
    path(
        "admin/restaurants/create/",
        AdminRestaurantCreateView.as_view(),
        name="admin-restaurant-create",
    ),

    # Admin: approve, reject, or request more information
    path(
        "admin/restaurants/<int:pk>/verify/",
        AdminRestaurantVerificationView.as_view(),
        name="admin-restaurant-verify",
    ),
    path(
        "registration-request/",
        RestaurantRegistrationEmailView.as_view(),
        name="restaurant-registration-request",
    ),
]
