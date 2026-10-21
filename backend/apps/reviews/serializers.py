
from rest_framework import serializers
from .models import FoodRating


class FoodRatingSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.name",
        read_only=True,
    )

    customer_email = serializers.EmailField(
        source="customer.email",
        read_only=True,
    )

    food_item_name = serializers.CharField(
        source="food_item.name",
        read_only=True,
    )

    class Meta:
        model = FoodRating
        fields = [
            "id",
            "food_item",
            "food_item_name",
            "customer",
            "customer_name",
            "customer_email",
            "rating",
            "review",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "customer",
            "customer_name",
            "customer_email",
            "food_item_name",
            "created_at",
            "updated_at",
        ]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5 stars."
            )
        return value
