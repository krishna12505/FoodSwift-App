from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Restaurant

User = get_user_model()


class RestaurantSerializer(serializers.ModelSerializer):
    """
    Used for restaurant-owner and public restaurant APIs.
    Owners cannot modify admin-controlled verification fields.
    """

    class Meta:
        model = Restaurant

        fields = [
            "id",
            "owner",
            "name",
            "description",
            "cuisine",
            "address",
            "city",
            "image",
            "phone",
            "opening_time",
            "closing_time",
            "is_open",
            "is_active",
            "verification_status",
            "verification_notes",
            "verified_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "owner",
            "is_active",
            "verification_status",
            "verification_notes",
            "verified_at",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Restaurant name cannot be empty."
            )

        return value

    def validate_phone(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Phone number is required."
            )

        return value

    def validate(self, data):
        opening_time = data.get("opening_time")
        closing_time = data.get("closing_time")

        if (
            opening_time is not None
            and closing_time is not None
            and opening_time == closing_time
        ):
            raise serializers.ValidationError({
                "closing_time": (
                    "Opening and closing times cannot be identical."
                )
            })

        return data


class AdminRestaurantCreateSerializer(
    serializers.ModelSerializer
):

    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            role="restaurant_owner"
        )
    )

    class Meta:
        model = Restaurant

        fields = [
            "id",
            "owner",
            "name",
            "description",
            "cuisine",
            "address",
            "city",
            "image",
            "phone",
            "opening_time",
            "closing_time",
            "is_open",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Restaurant name cannot be empty."
            )

        return value

    def validate_phone(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Phone number is required."
            )

        return value

    def validate(self, data):
        opening_time = data.get("opening_time")
        closing_time = data.get("closing_time")

        if (
            opening_time is not None
            and closing_time is not None
            and opening_time == closing_time
        ):
            raise serializers.ValidationError({
                "closing_time": (
                    "Opening and closing times cannot be identical."
                )
            })

        return data

    def create(self, validated_data):
        return Restaurant.objects.create(
            **validated_data,
            is_active=False,
            verification_status=(
                Restaurant.VerificationStatus.PENDING
            ),
            verification_notes="",
            verified_at=None,
        )