
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsRestaurantOwnerOrReadOnly(BasePermission):
    """
    Allow public read access.
    Only authenticated restaurant owners can create restaurants.
    Owners can update or delete their own restaurants.
    Only administrators can manage other owners' restaurants.
    """

    def has_permission(self, request, view):
        # Allow public listing and detail retrieval.
        if request.method in SAFE_METHODS:
            return True

        user = request.user

        # Require authentication for write operations.
        if not user or not user.is_authenticated:
            return False

        # Django administrators can manage restaurants.
        if user.is_superuser or user.is_staff:
            return True

        # Only restaurant owners can submit applications.
        return getattr(user, "role", None) == "restaurant_owner"

    def has_object_permission(self, request, view, obj):
        # Public read access.
        if request.method in SAFE_METHODS:
            return True

        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Administrators can manage any restaurant.
        if user.is_superuser or user.is_staff:
            return True

        # Owners can modify only their own restaurants.
        return (
            getattr(user, "role", None) == "restaurant_owner"
            and obj.owner_id == user.pk
        )


class IsRestaurantOwner(BasePermission):
    """
    Allow restaurant owners to access owner-specific endpoints.
    Administrators may also access these endpoints.
    """

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or user.is_staff
                or getattr(user, "role", None) == "restaurant_owner"
            )
        )
