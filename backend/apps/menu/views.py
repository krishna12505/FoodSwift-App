from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .models import MenuItem
from .serializers import MenuItemSerializer
class IsRestaurantOwner(IsAuthenticated):

    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and request.user.role == "restaurant_owner"
        )
class RestaurantMenuListView(generics.ListAPIView):
    serializer_class = MenuItemSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = MenuItem.objects.filter(
            is_available=True,
            restaurant__is_active=True,
        ).select_related("restaurant")

        restaurant_id = self.request.query_params.get("restaurant")

        if restaurant_id:
            queryset = queryset.filter(restaurant_id=restaurant_id)

        return queryset
class OwnerMenuListCreateView(generics.ListCreateAPIView):

    serializer_class = MenuItemSerializer
    permission_classes = [IsRestaurantOwner]

    def get_queryset(self):
        return MenuItem.objects.filter(
            restaurant__owner=self.request.user
        ).select_related("restaurant")

    def perform_create(self, serializer):
        restaurant = serializer.validated_data["restaurant"]

        if restaurant.owner_id != self.request.user.id:
            raise PermissionDenied(
                "You can only add menu items to your own restaurant."
            )

        serializer.save()
class OwnerMenuDetailView(generics.RetrieveUpdateDestroyAPIView):

    serializer_class = MenuItemSerializer
    permission_classes = [IsRestaurantOwner]

    def get_queryset(self):
        return MenuItem.objects.filter(
            restaurant__owner=self.request.user
        ).select_related("restaurant")