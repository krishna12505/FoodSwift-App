
from django.contrib.auth import get_user_model, authenticate
from rest_framework import serializers

from .models import SavedAddress

Account = get_user_model()


# Registration Serializer
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    class Meta:
        model = Account
        fields = ["id", "name", "email", "password", "role"]
        read_only_fields = ["id"]

    def validate_role(self, value):
        allowed_roles = [
            Account.Role.CUSTOMER,
            Account.Role.RESTAURANT_OWNER,
            Account.Role.DELIVERY_PARTNER,
        ]

        if value not in allowed_roles:
            raise serializers.ValidationError(
                "Invalid registration role."
            )

        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        account = Account(**validated_data)
        account.username = account.email
        account.set_password(password)
        account.save()
        return account


# Login Serializer
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data["email"].strip()
        password = data["password"]

        try:
            account = Account.objects.get(email__iexact=email)
        except Account.DoesNotExist:
            raise serializers.ValidationError({
                "email": "No account found with this email."
            })

        user = authenticate(
            username=account.username,
            password=password,
        )

        if user is None:
            raise serializers.ValidationError({
                "password": "Incorrect password."
            })

        if not user.is_active:
            raise serializers.ValidationError({
                "email": "This account is inactive."
            })

        data["user"] = user
        return data


# Profile Serializer
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "role",
        ]
        read_only_fields = ["id", "email", "role"]


# Change Password Serializer
class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        required=True
    )
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8
    )

    def validate_current_password(self, value):
        user = self.context["request"].user

        if not user.check_password(value):
            raise serializers.ValidationError(
                "Current password is incorrect."
            )

        return value

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password

        validate_password(value, self.context["request"].user)
        return value


# Saved Address Serializer
class SavedAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedAddress
        fields = [
            "id",
            "label",
            "recipient_name",
            "phone",
            "address_line",
            "landmark",
            "city",
            "state",
            "postal_code",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_phone(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Phone number is required."
            )

        return value
