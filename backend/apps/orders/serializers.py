
from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.restaurants.models import Restaurant
from apps.menu.models import MenuItem
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "id",
            "menu_item",
            "item_name",
            "unit_price",
            "quantity",
            "line_total",
        )
        read_only_fields = (
            "id",
            "item_name",
            "unit_price",
            "line_total",
        )


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "restaurant",
            "items",
            "delivery_address",
            "customer_phone",
            "subtotal",
            "delivery_fee",
            "total_amount",
            "status",
            "payment_method",
            "payment_status",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "subtotal",
            "delivery_fee",
            "total_amount",
            "status",
            "payment_status",
            "created_at",
            "updated_at",
        )

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError(
                "Add at least one food item to your order."
            )

        seen = set()

        for item in items:
            menu_item_id = item["menu_item"].pk

            if menu_item_id in seen:
                raise serializers.ValidationError(
                    "Each food item should appear only once. "
                    "Increase its quantity instead."
                )

            seen.add(menu_item_id)

            if item["quantity"] < 1:
                raise serializers.ValidationError(
                    "Quantity must be at least 1."
                )

        return items

    def validate(self, attrs):
        restaurant = attrs["restaurant"]
        items = attrs["items"]

        if not restaurant.is_active or not restaurant.is_open:
            raise serializers.ValidationError({
                "restaurant": "This restaurant is currently unavailable."
            })

        for item in items:
            food = item["menu_item"]

            if food.restaurant_id != restaurant.id:
                raise serializers.ValidationError({
                    "items": (
                        f"{food.name} does not belong to "
                        f"{restaurant.name}."
                    )
                })

            if hasattr(food, "is_available") and not food.is_available:
                raise serializers.ValidationError({
                    "items": f"{food.name} is currently unavailable."
                })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        customer = self.context["request"].user

        subtotal = Decimal("0.00")

        for item_data in items_data:
            food = item_data["menu_item"]
            quantity = item_data["quantity"]
            subtotal += food.price * quantity

        delivery_fee = Decimal("40.00")
        total_amount = subtotal + delivery_fee

        order = Order.objects.create(
            customer=customer,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total_amount=total_amount,
            **validated_data,
        )

        for item_data in items_data:
            food = item_data["menu_item"]
            quantity = item_data["quantity"]
            unit_price = food.price

            OrderItem.objects.create(
                order=order,
                menu_item=food,
                item_name=food.name,
                unit_price=unit_price,
                quantity=quantity,
                line_total=unit_price * quantity,
            )

        return order
