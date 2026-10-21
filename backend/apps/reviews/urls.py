
from django.urls import path
from .views import (
    FoodRatingView,
    AdminFoodRatingListView,
    AdminFoodRatingDetailView,
)

urlpatterns = [
    path(
        "food/<int:food_item_id>/",
        FoodRatingView.as_view(),
        name="food-rating",
    ),
    path(
        "admin/",
        AdminFoodRatingListView.as_view(),
        name="admin-food-ratings",
    ),
    path(
        "admin/<int:rating_id>/",
        AdminFoodRatingDetailView.as_view(),
        name="admin-food-rating-detail",
    ),
]
