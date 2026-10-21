from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import update_session_auth_hash
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .utils import send_welcome_email
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer,LoginSerializer,ProfileSerializer,ChangePasswordSerializer
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.core.exceptions import ValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework.exceptions import PermissionDenied
from django.db import transaction
from .models import SavedAddress
from .serializers import SavedAddressSerializer

from rest_framework_simplejwt.tokens import RefreshToken

# Register View page


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        account = serializer.save()

        # Send welcome email after successful registration
        send_welcome_email(account)

        return Response(
            {
                "message": "Account registered successfully",
                "id": account.id,
                "name": account.name,
                "email": account.email,
                "role": account.role,
            },
            status=status.HTTP_201_CREATED,
        )

## login View Page

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        account = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(account)

        return Response(
            {
                "message": "Login successful",
                "user": {
                    "id": account.id,
                    "name": account.name,
                    "email": account.email,
                    "role": account.role,
                },
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            },
            status=status.HTTP_200_OK,
        )

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self,request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)
    
    def patch(self, request):
        serializer = ProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

## change password view
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request}
        )

        if serializer.is_valid():
            request.user.set_password(
                serializer.validated_data["new_password"]
            )
            request.user.save()

            update_session_auth_hash(
                request,
                request.user
            )

            return Response(
                {"message": "Password changed successfully."},
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=400,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(
                {"message": "Logged out successfully."},
                status=200,
            )

        except TokenError as error:
            print("JWT logout error:", str(error))
            return Response(
                {"error": str(error)},
                status=400,
            )

Account = get_user_model()


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            "total_users": Account.objects.count(),
            "total_customers": Account.objects.filter(
                role="customer"
            ).count(),
            "total_restaurant_owners": Account.objects.filter(
                role="restaurant_owner"
            ).count(),
            "total_delivery_partners": Account.objects.filter(
                role="delivery_partner"
            ).count(),
        })

    
class AdminUsersListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = Account.objects.all().order_by("-id")

        user_data = [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
            }
            for user in users
        ]

        return Response(user_data)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip().lower()

        if not email:
            return Response(
                {"message": "Please enter your email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        users = User.objects.filter(
            email__iexact=email,
            is_active=True,
        )

        # Use a generic response to avoid revealing registered emails.
        if users.exists():
            for user in users:
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)

                reset_link = (
                    f"{settings.FRONTEND_URL.rstrip('/')}"
                    f"/reset-password/{uid}/{token}"
                )

                subject = "Reset Your FoodSwift Password"

                message = (
                    f"Hello {user.name or user.email},\n\n"
                    "We received a request to reset your FoodSwift password.\n\n"
                    f"Reset your password using this link:\n{reset_link}\n\n"
                    "If you did not request this, you can ignore this email.\n\n"
                    "FoodSwift Team"
                )

                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )

        return Response(
            {
                "message": (
                    "If an account exists with that email, "
                    "a password reset link has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not all([uid, token, new_password, confirm_password]):
            return Response(
                {"message": "All fields are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {"message": "Passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            User = get_user_model()
            user = User.objects.get(pk=user_id, is_active=True)
        except (
            TypeError,
            ValueError,
            OverflowError,
            ValidationError,
            User.DoesNotExist,
        ):
            return Response(
                {"message": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"message": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except ValidationError as error:
            return Response(
                {"message": error.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {"message": "Password reset successfully. Please log in."},
            status=status.HTTP_200_OK,
        )


# ==========================================
# SAVED ADDRESSES API
# ==========================================

class SavedAddressListCreateView(generics.ListCreateAPIView):
    serializer_class = SavedAddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != "customer":
            raise PermissionDenied(
                "Only customers can manage saved addresses."
            )

        return SavedAddress.objects.filter(
            customer=self.request.user
        ).order_by("-is_default", "-created_at")

    def perform_create(self, serializer):
        user = self.request.user

        if user.role != "customer":
            raise PermissionDenied(
                "Only customers can manage saved addresses."
            )

        make_default = serializer.validated_data.get(
            "is_default", False
        )

        # The first saved address becomes the default automatically.
        has_addresses = SavedAddress.objects.filter(
            customer=user
        ).exists()

        if not has_addresses:
            make_default = True

        # Only one address per customer can be the default.
        with transaction.atomic():
            if make_default:
                SavedAddress.objects.filter(
                    customer=user,
                    is_default=True,
                ).update(is_default=False)

            serializer.save(
                customer=user,
                is_default=make_default,
            )


class SavedAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SavedAddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != "customer":
            raise PermissionDenied(
                "Only customers can manage saved addresses."
            )

        # Restrict access to addresses owned by the logged-in customer.
        return SavedAddress.objects.filter(
            customer=self.request.user
        )

    def perform_update(self, serializer):
        user = self.request.user
        make_default = serializer.validated_data.get(
            "is_default",
            serializer.instance.is_default,
        )

        with transaction.atomic():
            if make_default:
                SavedAddress.objects.filter(
                    customer=user,
                    is_default=True,
                ).exclude(
                    pk=serializer.instance.pk
                ).update(is_default=False)

            serializer.save(customer=user)

    def perform_destroy(self, instance):
        instance.delete()
