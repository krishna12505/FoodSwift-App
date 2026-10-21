from django.urls import path

from .views import (RestaurantMenuListView,OwnerMenuListCreateView,OwnerMenuDetailView,)

urlpatterns = [
    # Public customer menu
    path(
        "",
        RestaurantMenuListView.as_view(),
        name="menu-list",
    ),

    # Restaurant owner menu management
    path(
        "manage/",
        OwnerMenuListCreateView.as_view(),
        name="owner-menu-list-create",
    ),

    path(
        "manage/<int:pk>/",
        OwnerMenuDetailView.as_view(),
        name="owner-menu-detail",
    ),
]
