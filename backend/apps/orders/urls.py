from django.urls import path

from .views import (
    OrderListCreateView,
    OrderDetailView,
    RestaurantOrderListView,
    DeliveryOrderListView,
    OrderStatusUpdateView,
    DeliveryAssignmentView,
    AvailableDeliveryPartnersView,
    AdminOrderListView,
    AdminReportsView,
    MockPaymentView,
)

urlpatterns = [
    path(
        "",
        OrderListCreateView.as_view(),
        name="order-list-create",
    ),
    path(
        "<int:pk>/",
        OrderDetailView.as_view(),
        name="order-detail",
    ),
    path(
        "restaurant/",
        RestaurantOrderListView.as_view(),
        name="restaurant-orders",
    ),
    path(
        "delivery/",
        DeliveryOrderListView.as_view(),
        name="delivery-orders",
    ),
    path(
        "<int:pk>/status/",
        OrderStatusUpdateView.as_view(),
        name="order-status-update",
    ),
    path(
        "<int:pk>/assign-delivery/",
        DeliveryAssignmentView.as_view(),
        name="assign-delivery",
    ),
    path(
    "delivery-partners/",
    AvailableDeliveryPartnersView.as_view(),
    name="available-delivery-partners",
    ),

    path(
    "admin/orders/",
    AdminOrderListView.as_view(),
    name="admin-orders",
),

    path(
    "admin/reports/",
    AdminReportsView.as_view(),
    name="admin-reports",
),

path(
    "<int:pk>/mock-payment/",
    MockPaymentView.as_view(),
    name="mock-payment",
),

]
