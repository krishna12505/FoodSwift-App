
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework import generics, serializers, status
from rest_framework.exceptions import (
    PermissionDenied,
    ValidationError,
    NotFound,
)
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import (
    IsCustomer,
    IsRestaurantOwner,
    IsDeliveryPartner,
)
from apps.restaurants.models import Restaurant

from .models import Order
from .serializers import OrderSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return (
            Order.objects
            .filter(customer=self.request.user)
            .select_related("restaurant", "customer", "delivery_partner")
            .prefetch_related("items")
        )

    def perform_create(self, serializer):
        serializer.save()


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return (
                Order.objects
                .select_related(
                    "restaurant", "customer", "delivery_partner"
                )
                .prefetch_related("items")
            )

        if user.role == "customer":
            return (
                Order.objects
                .filter(customer=user)
                .select_related(
                    "restaurant", "customer", "delivery_partner"
                )
                .prefetch_related("items")
            )

        if user.role == "restaurant_owner":
            return (
                Order.objects
                .filter(restaurant__owner=user)
                .select_related(
                    "restaurant", "customer", "delivery_partner"
                )
                .prefetch_related("items")
            )

        if user.role == "delivery_partner":
            return (
                Order.objects
                .filter(delivery_partner=user)
                .select_related(
                    "restaurant", "customer", "delivery_partner"
                )
                .prefetch_related("items")
            )

        return Order.objects.none()


class MockPaymentView(APIView):
    """
    DEMO ONLY: Simulates payment success or failure.
    This endpoint does not process real money.
    """
    permission_classes = [IsAuthenticated, IsCustomer]

    def post(self, request, pk):
        outcome = request.data.get("outcome")

        if outcome not in {"success", "failure"}:
            raise ValidationError({
                "outcome": "Choose 'success' or 'failure'."
            })

        with transaction.atomic():
            try:
                order = (
                    Order.objects
                    .select_for_update()
                    .get(pk=pk, customer=request.user)
                )
            except Order.DoesNotExist:
                raise NotFound("Order not found.")

            if order.status == Order.Status.CANCELLED:
                raise ValidationError({
                    "detail": "Cancelled orders cannot be paid."
                })

            if order.payment_status == Order.PaymentStatus.PAID:
                raise ValidationError({
                    "detail": "This order has already been paid."
                })

            if order.payment_status == Order.PaymentStatus.REFUNDED:
                raise ValidationError({
                    "detail": "A refunded order cannot be paid again."
                })

            order.payment_method = "mock"

            if outcome == "success":
                order.payment_status = Order.PaymentStatus.PAID
            else:
                order.payment_status = Order.PaymentStatus.FAILED

            order.save(update_fields=[
                "payment_method",
                "payment_status",
                "updated_at",
            ])

            result = {
                "order_id": order.id,
                "payment_method": order.payment_method,
                "payment_status": order.payment_status,
                "total_amount": str(order.total_amount),
                "message": (
                    "Demo payment successful."
                    if outcome == "success"
                    else "Demo payment failed."
                ),
                "demo_mode": True,
            }

        return Response(result, status=status.HTTP_200_OK)


class RestaurantOrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsRestaurantOwner]

    def get_queryset(self):
        return (
            Order.objects
            .filter(restaurant__owner=self.request.user)
            .select_related("restaurant", "customer", "delivery_partner")
            .prefetch_related("items")
        )


class DeliveryOrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsDeliveryPartner]

    def get_queryset(self):
        return (
            Order.objects
            .filter(delivery_partner=self.request.user)
            .select_related("restaurant", "customer", "delivery_partner")
            .prefetch_related("items")
        )


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Order.Status.choices
    )


class OrderStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        with transaction.atomic():
            user = request.user

            try:
                order = (
                    Order.objects
                    .select_for_update()
                    .select_related("restaurant")
                    .get(pk=pk)
                )
            except Order.DoesNotExist:
                raise NotFound("Order not found.")

            if user.is_staff:
                allowed_statuses = {
                    choice[0] for choice in Order.Status.choices
                }

            elif user.role == "restaurant_owner":
                if order.restaurant.owner_id != user.id:
                    raise PermissionDenied(
                        "You cannot update this restaurant's order."
                    )

                allowed_statuses = {
                    Order.Status.CONFIRMED,
                    Order.Status.PREPARING,
                    Order.Status.READY,
                    Order.Status.CANCELLED,
                }

            elif user.role == "delivery_partner":
                if order.delivery_partner_id != user.id:
                    raise PermissionDenied(
                        "This order is not assigned to you."
                    )

                allowed_statuses = {
                    Order.Status.OUT_FOR_DELIVERY,
                    Order.Status.DELIVERED,
                }

            else:
                raise PermissionDenied(
                    "You do not have permission to update order status."
                )

            serializer = OrderStatusUpdateSerializer(
                data=request.data
            )
            serializer.is_valid(raise_exception=True)
            new_status = serializer.validated_data["status"]

            if new_status not in allowed_statuses:
                raise PermissionDenied(
                    "Your role cannot set this order status."
                )

            transitions = {
                Order.Status.PLACED: {
                    Order.Status.CONFIRMED,
                    Order.Status.CANCELLED,
                },
                Order.Status.CONFIRMED: {
                    Order.Status.PREPARING,
                    Order.Status.CANCELLED,
                },
                Order.Status.PREPARING: {
                    Order.Status.READY,
                },
                Order.Status.READY: {
                    Order.Status.OUT_FOR_DELIVERY,
                },
                Order.Status.OUT_FOR_DELIVERY: {
                    Order.Status.DELIVERED,
                },
                Order.Status.DELIVERED: set(),
                Order.Status.CANCELLED: set(),
            }

            if new_status not in transitions.get(order.status, set()):
                raise ValidationError({
                    "status": (
                        f"Cannot change order from '{order.status}' "
                        f"to '{new_status}'."
                    )
                })

            order.status = new_status
            order.save(update_fields=["status", "updated_at"])

        return Response(
            OrderSerializer(
                order,
                context={"request": request},
            ).data,
            status=status.HTTP_200_OK,
        )


class DeliveryAssignmentSerializer(serializers.Serializer):
    delivery_partner_id = serializers.IntegerField(min_value=1)

    def validate_delivery_partner_id(self, value):
        User = get_user_model()

        try:
            partner = User.objects.get(
                pk=value,
                role="delivery_partner",
                is_active=True,
            )
        except User.DoesNotExist:
            raise ValidationError(
                "An active delivery partner with this ID was not found."
            )

        return partner


class DeliveryAssignmentView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        user = request.user

        try:
            order = Order.objects.select_related(
                "restaurant", "delivery_partner"
            ).get(pk=pk)
        except Order.DoesNotExist:
            raise NotFound("Order not found.")

        is_admin = user.is_staff
        is_owner = (
            user.role == "restaurant_owner"
            and order.restaurant.owner_id == user.id
        )

        if not (is_admin or is_owner):
            raise PermissionDenied(
                "Only the restaurant owner or admin can assign "
                "a delivery partner."
            )

        if order.status not in {
            Order.Status.CONFIRMED,
            Order.Status.PREPARING,
            Order.Status.READY,
        }:
            raise ValidationError({
                "status": (
                    "A delivery partner can only be assigned "
                    "to an active order."
                )
            })

        serializer = DeliveryAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order.delivery_partner = serializer.validated_data[
            "delivery_partner_id"
        ]
        order.save(update_fields=["delivery_partner", "updated_at"])

        return Response(
            OrderSerializer(
                order,
                context={"request": request},
            ).data,
            status=status.HTTP_200_OK,
        )


class AvailableDeliveryPartnersView(APIView):
    permission_classes = [IsAuthenticated, IsRestaurantOwner]

    def get(self, request):
        User = get_user_model()

        partners = User.objects.filter(
            role="delivery_partner",
            is_active=True,
        ).order_by("name", "email")

        data = [
            {
                "id": partner.id,
                "name": partner.name or partner.get_username(),
                "email": partner.email,
            }
            for partner in partners
        ]

        return Response(data, status=status.HTTP_200_OK)


class AdminOrderListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        orders = (
            Order.objects
            .select_related(
                "customer",
                "restaurant",
                "delivery_partner",
            )
            .prefetch_related("items")
        )

        order_data = []

        for order in orders:
            order_data.append({
                "id": order.id,
                "customer": {
                    "id": order.customer.id,
                    "name": order.customer.name,
                    "email": order.customer.email,
                },
                "restaurant": {
                    "id": order.restaurant.id,
                    "name": order.restaurant.name,
                },
                "delivery_partner": (
                    {
                        "id": order.delivery_partner.id,
                        "name": order.delivery_partner.name,
                        "email": order.delivery_partner.email,
                    }
                    if order.delivery_partner else None
                ),
                "delivery_address": order.delivery_address,
                "customer_phone": order.customer_phone,
                "subtotal": str(order.subtotal),
                "delivery_fee": str(order.delivery_fee),
                "total_amount": str(order.total_amount),
                "status": order.status,
                "payment_status": order.payment_status,
                "payment_method": order.payment_method,
                "notes": order.notes,
                "created_at": order.created_at,
                "updated_at": order.updated_at,
                "items": [
                    {
                        "id": item.id,
                        "menu_item_id": item.menu_item_id,
                        "item_name": item.item_name,
                        "unit_price": str(item.unit_price),
                        "quantity": item.quantity,
                        "line_total": str(item.line_total),
                    }
                    for item in order.items.all()
                ],
            })

        return Response(order_data)


class AdminReportsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        User = get_user_model()
        today = timezone.localdate()

        # Validate optional date filters.
        start_value = request.query_params.get("start_date")
        end_value = request.query_params.get("end_date")

        start_date = parse_date(start_value) if start_value else None
        end_date = parse_date(end_value) if end_value else None

        if start_value and not start_date:
            return Response(
                {"detail": "Invalid start_date. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if end_value and not end_date:
            return Response(
                {"detail": "Invalid end_date. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start_date and end_date and start_date > end_date:
            return Response(
                {"detail": "start_date cannot be after end_date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Orders within the selected date range.
        orders = Order.objects.all()

        if start_date:
            orders = orders.filter(created_at__date__gte=start_date)

        if end_date:
            orders = orders.filter(created_at__date__lte=end_date)

        # Order totals and average order value.
        order_summary = orders.aggregate(
            total_orders=Count("id"),
            delivered_orders=Count(
                "id",
                filter=Q(status=Order.Status.DELIVERED),
            ),
            cancelled_orders=Count(
                "id",
                filter=Q(status=Order.Status.CANCELLED),
            ),
            total_order_value=Sum("total_amount"),
        )

        total_orders = order_summary["total_orders"] or 0

        total_order_value = (
            order_summary.pop("total_order_value")
            or Decimal("0.00")
        )

        average_order_value = (
            total_order_value / total_orders
            if total_orders
            else Decimal("0.00")
        )

        # FoodSwift's demo commission rate is 20%.
        # Only payments marked as paid contribute to commission.
        commission_rate = Decimal("0.20")

        paid_orders = orders.filter(
            payment_status=Order.PaymentStatus.PAID
        )

        paid_summary = paid_orders.aggregate(
            paid_order_value=Sum("total_amount"),
            paid_food_subtotal=Sum("subtotal"),
        )

        paid_order_value = (
            paid_summary["paid_order_value"] or Decimal("0.00")
        )
        paid_food_subtotal = (
            paid_summary["paid_food_subtotal"] or Decimal("0.00")
        )

        # Commission excludes delivery fees.
        revenue = paid_food_subtotal * commission_rate
        restaurant_payable = paid_food_subtotal - revenue

        # Payment summary for the selected date range.
        refunded_amount = (
            orders.filter(
                payment_status=Order.PaymentStatus.REFUNDED
            ).aggregate(
                total=Sum("total_amount")
            )["total"] or Decimal("0.00")
        )

        payment_summary = {
            "paid_orders": paid_orders.count(),
            "pending_payments": orders.filter(
                payment_status=Order.PaymentStatus.PENDING
            ).count(),
            "failed_payments": orders.filter(
                payment_status=Order.PaymentStatus.FAILED
            ).count(),
            "refunded_amount": str(
                refunded_amount.quantize(Decimal("0.01"))
            ),
        }

        # Order status breakdown.
        status_counts = (
            orders.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )

        status_breakdown = {
            choice.value: 0 for choice in Order.Status
        }

        for item in status_counts:
            status_breakdown[item["status"]] = item["count"]

        # Registered users by role.
        customer_count = User.objects.filter(role="customer").count()

        users_by_role = {
            "customers": customer_count,
            "total_customers": customer_count,
            "restaurant_owners": User.objects.filter(
                role="restaurant_owner"
            ).count(),
            "delivery_partners": User.objects.filter(
                role="delivery_partner"
            ).count(),
            "total_users": User.objects.count(),
        }

        # Restaurant count.
        restaurant_count = Restaurant.objects.count()

        # Daily order and commission trends.
        if start_date or end_date:
            trend_start = start_date or end_date
            trend_end = end_date or start_date
        else:
            trend_start = today - timedelta(days=6)
            trend_end = today

        trend_orders = Order.objects.filter(
            created_at__date__gte=trend_start,
            created_at__date__lte=trend_end,
        )

        daily_rows = (
            trend_orders
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                orders=Count("id"),
                paid_food_subtotal=Sum(
                    "subtotal",
                    filter=Q(
                        payment_status=Order.PaymentStatus.PAID
                    ),
                ),
            )
            .order_by("day")
        )

        daily_counts = {
            row["day"].isoformat(): {
                "orders": row["orders"],
                "paid_food_subtotal": (
                    row["paid_food_subtotal"] or Decimal("0.00")
                ),
            }
            for row in daily_rows
        }

        daily_trend = []
        current_day = trend_start

        while current_day <= trend_end:
            day_key = current_day.isoformat()
            day_data = daily_counts.get(
                day_key,
                {
                    "orders": 0,
                    "paid_food_subtotal": Decimal("0.00"),
                },
            )

            day_revenue = (
                day_data["paid_food_subtotal"] * commission_rate
            )

            daily_trend.append({
                "date": day_key,
                "orders": day_data["orders"],
                "revenue": str(
                    day_revenue.quantize(Decimal("0.01"))
                ),
            })

            current_day += timedelta(days=1)

        # Response field names match the Admin Reports frontend.
        return Response({
            "date_range": {
                "start_date": (
                    start_date.isoformat() if start_date else None
                ),
                "end_date": (
                    end_date.isoformat() if end_date else None
                ),
            },
            "orders": {
                **order_summary,
                "average_order_value": str(
                    average_order_value.quantize(Decimal("0.01"))
                ),
                "revenue": str(
                    revenue.quantize(Decimal("0.01"))
                ),
                "total_revenue": str(
                    revenue.quantize(Decimal("0.01"))
                ),
                "commission_rate": "20%",
                "paid_orders": paid_orders.count(),
                "paid_order_value": str(
                    paid_order_value.quantize(Decimal("0.01"))
                ),
                "foodswift_commission": str(
                    revenue.quantize(Decimal("0.01"))
                ),
                "restaurant_payable": str(
                    restaurant_payable.quantize(Decimal("0.01"))
                ),
            },
            "users": users_by_role,
            "payments": payment_summary,
            "restaurants": {
                "total": restaurant_count,
                # Temporary fallback until the Restaurant model's
                # active/inactive field is confirmed.
                "active_restaurants": restaurant_count,
            },
            "status_breakdown": status_breakdown,
            "daily_trend": daily_trend,
        })
