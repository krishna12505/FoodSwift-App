
from rest_framework.permissions import BasePermission


class IsCustomer(BasePermission):
    """Allow access only to customers."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and request.user.role == "customer"
        )


class IsRestaurantOwner(BasePermission):
    """Allow access only to restaurant owners."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and request.user.role == "restaurant_owner"
        )


class IsDeliveryPartner(BasePermission):
    """Allow access only to delivery partners."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and request.user.role == "delivery_partner"
        )


class IsFoodSwiftAdmin(BasePermission):
    """Allow access only to Django staff administrators."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and request.user.is_staff and request.user.is_superuser
        )
