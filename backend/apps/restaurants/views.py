
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.parsers import (
    JSONParser,
    FormParser,
    MultiPartParser,
)
from rest_framework.permissions import (
    IsAuthenticated,
    IsAdminUser,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Restaurant
from .serializers import (
    RestaurantSerializer,
    AdminRestaurantCreateSerializer,
)
from .permissions import (
    IsRestaurantOwner,
    IsRestaurantOwnerOrReadOnly,
)


# Public restaurant listing and owner restaurant creation
class RestaurantListCreateView(generics.ListCreateAPIView):
    serializer_class = RestaurantSerializer
    permission_classes = [IsRestaurantOwnerOrReadOnly]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_queryset(self):
        return Restaurant.objects.filter(
            is_active=True,
            verification_status=Restaurant.VerificationStatus.APPROVED,
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            is_active=False,
            verification_status=Restaurant.VerificationStatus.PENDING,
            verification_notes="",
            verified_at=None,
        )


# Owner: send restaurant details to admin by email
class RestaurantRegistrationEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if getattr(user, "role", None) != "restaurant_owner":
            return Response(
                {"detail": "Only restaurant owners can submit restaurant details."},
                status=status.HTTP_403_FORBIDDEN,
            )

        required_fields = [
            "name",
            "cuisine",
            "address",
            "city",
            "phone",
        ]

        for field in required_fields:
            value = request.data.get(field, "")
            if not isinstance(value, str) or not value.strip():
                return Response(
                    {"detail": f"{field} is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        name = request.data["name"].strip()
        cuisine = request.data["cuisine"].strip()
        address = request.data["address"].strip()
        city = request.data["city"].strip()
        phone = request.data["phone"].strip()
        description = request.data.get("description", "")
        image = request.data.get("image", "")
        opening_time = request.data.get("opening_time", "")
        closing_time = request.data.get("closing_time", "")

        # Only accept text fields to avoid malformed email content.
        optional_fields = {
            "description": description,
            "image": image,
            "opening_time": opening_time,
            "closing_time": closing_time,
        }
        for field, value in optional_fields.items():
            if not isinstance(value, str):
                return Response(
                    {"detail": f"{field} must be text."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        admin_email = getattr(
            settings, "RESTAURANT_REQUEST_EMAIL", ""
        )

        if not admin_email:
            return Response(
                {
                    "detail": (
                        "Restaurant request email is not configured. "
                        "Set RESTAURANT_REQUEST_EMAIL in settings."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        subject = f"FoodSwift Restaurant Registration Request: {name}"

        message = f"""
A restaurant registration request has been submitted through FoodSwift.

RESTAURANT OWNER
Name: {user.name}
Email: {user.email}
Account ID: {user.id}

RESTAURANT DETAILS
Restaurant name: {name}
Cuisine: {cuisine}
Address: {address}
City: {city}
Phone: {phone}
Description: {description.strip() or "Not provided"}
Image URL: {image.strip() or "Not provided"}
Opening time: {opening_time.strip() or "Not provided"}
Closing time: {closing_time.strip() or "Not provided"}

NEXT STEP
Please review the details. If approved, create the official restaurant
record and complete verification through the FoodSwift Admin Dashboard.
"""

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[admin_email],
                fail_silently=False,
            )
        except Exception:
            # Avoid exposing SMTP credentials or internal error details.
            return Response(
                {
                    "detail": (
                        "The email could not be sent. "
                        "Please check the email configuration and try again."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": "Restaurant details emailed to the admin successfully."},
            status=status.HTTP_200_OK,
        )


# List restaurants belonging to the logged-in owner
class MyRestaurantsView(generics.ListAPIView):
    serializer_class = RestaurantSerializer
    permission_classes = [IsAuthenticated, IsRestaurantOwner]

    def get_queryset(self):
        return Restaurant.objects.filter(
            owner=self.request.user
        ).order_by("-created_at")


# Retrieve, update, or delete a restaurant
class RestaurantDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RestaurantSerializer
    permission_classes = [IsRestaurantOwnerOrReadOnly]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_queryset(self):
        user = self.request.user

        approved = Q(
            is_active=True,
            verification_status=Restaurant.VerificationStatus.APPROVED,
        )

        if user.is_authenticated and user.is_staff:
            return Restaurant.objects.all()

        if user.is_authenticated:
            return Restaurant.objects.filter(
                approved | Q(owner=user)
            ).distinct()

        return Restaurant.objects.filter(approved)


# Admin: list all restaurants and create official restaurant records
class AdminRestaurantListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        restaurants = (
            Restaurant.objects.select_related("owner")
            .all()
            .order_by("-created_at")
        )

        restaurant_data = [
            {
                "id": restaurant.id,
                "name": restaurant.name,
                "description": restaurant.description,
                "cuisine": restaurant.cuisine,
                "address": restaurant.address,
                "city": restaurant.city,
                "image": restaurant.image,
                "phone": restaurant.phone,
                "opening_time": (
                    restaurant.opening_time.strftime("%H:%M")
                    if restaurant.opening_time else None
                ),
                "closing_time": (
                    restaurant.closing_time.strftime("%H:%M")
                    if restaurant.closing_time else None
                ),
                "is_open": restaurant.is_open,
                "is_active": restaurant.is_active,
                "verification_status": restaurant.verification_status,
                "verification_notes": restaurant.verification_notes,
                "verified_at": restaurant.verified_at,
                "created_at": restaurant.created_at,
                "owner": {
                    "id": restaurant.owner.id,
                    "name": restaurant.owner.name,
                    "email": restaurant.owner.email,
                },
            }
            for restaurant in restaurants
        ]

        return Response(restaurant_data)

    def post(self, request):
        serializer = AdminRestaurantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        restaurant = serializer.save()

        return Response(
            AdminRestaurantCreateSerializer(restaurant).data,
            status=status.HTTP_201_CREATED,
        )


# Admin: approve, reject, or request more information
class AdminRestaurantVerificationView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            restaurant = Restaurant.objects.get(pk=pk)
        except Restaurant.DoesNotExist:
            return Response(
                {"detail": "Restaurant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get("verification_status")
        notes = request.data.get("verification_notes", "")

        allowed_statuses = [
            Restaurant.VerificationStatus.APPROVED,
            Restaurant.VerificationStatus.REJECTED,
            Restaurant.VerificationStatus.NEEDS_INFO,
        ]

        if new_status not in allowed_statuses:
            return Response(
                {
                    "verification_status": [
                        "Choose approved, rejected, or needs_info."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(notes, str):
            return Response(
                {"verification_notes": ["Must be text."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            new_status in [
                Restaurant.VerificationStatus.REJECTED,
                Restaurant.VerificationStatus.NEEDS_INFO,
            ]
            and not notes.strip()
        ):
            return Response(
                {
                    "verification_notes": [
                        "Provide a reason or instructions."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        restaurant.verification_status = new_status
        restaurant.verification_notes = notes.strip()

        if new_status == Restaurant.VerificationStatus.APPROVED:
            restaurant.verified_at = timezone.now()
            restaurant.is_active = True
        else:
            restaurant.verified_at = None
            restaurant.is_active = False

        restaurant.save(
            update_fields=[
                "verification_status",
                "verification_notes",
                "verified_at",
                "is_active",
                "updated_at",
            ]
        )

        return Response({
            "message": "Restaurant verification updated.",
            "restaurant_id": restaurant.id,
            "name": restaurant.name,
            "verification_status": restaurant.verification_status,
            "verification_notes": restaurant.verification_notes,
            "verified_at": restaurant.verified_at,
            "is_active": restaurant.is_active,
        })


# Backward-compatible admin creation endpoint
class AdminRestaurantCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = AdminRestaurantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        restaurant = serializer.save()

        return Response(
            AdminRestaurantCreateSerializer(restaurant).data,
            status=status.HTTP_201_CREATED,
        )
