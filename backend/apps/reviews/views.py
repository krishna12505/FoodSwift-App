
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.menu.models import MenuItem
from .models import FoodRating
from .serializers import FoodRatingSerializer
from django.db.models import Avg, Count, Q
from rest_framework.permissions import IsAdminUser


class FoodRatingView(APIView):

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]

        return [IsAuthenticated()]

    def get(self, request, food_item_id):
        food_item = get_object_or_404(
            MenuItem,
            id=food_item_id,
        )

        ratings = FoodRating.objects.filter(
            food_item=food_item
        ).select_related("customer")

        summary = ratings.aggregate(
            average_rating=Avg("rating"),
            rating_count=Count("id"),
        )

        serializer = FoodRatingSerializer(
            ratings,
            many=True,
        )

        return Response({
            "food_item_id": food_item.id,
            "food_item_name": food_item.name,
            "average_rating": round(
                summary["average_rating"] or 0, 1
            ),
            "rating_count": summary["rating_count"],
            "reviews": serializer.data,
        })

    def post(self, request, food_item_id):
        if getattr(request.user, "role", None) != "customer":
            return Response(
                {"detail": "Only customers can rate food items."},
                status=status.HTTP_403_FORBIDDEN,
            )

        food_item = get_object_or_404(
            MenuItem,
            id=food_item_id,
        )

        serializer = FoodRatingSerializer(
            data={
                **request.data,
                "food_item": food_item.id,
            }
        )

        serializer.is_valid(raise_exception=True)

        rating, created = FoodRating.objects.update_or_create(
            food_item=food_item,
            customer=request.user,
            defaults={
                "rating": serializer.validated_data["rating"],
                "review": serializer.validated_data.get(
                    "review", ""
                ),
            },
        )

        response_serializer = FoodRatingSerializer(rating)

        return Response(
            {
                "message": (
                    "Rating submitted successfully."
                    if created
                    else "Rating updated successfully."
                ),
                "rating": response_serializer.data,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )

    
class AdminFoodRatingListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        ratings = FoodRating.objects.select_related(
            "customer",
            "food_item",
        ).all()

        # Search by customer, email, food item, or review text.
        search = request.query_params.get("search", "").strip()
        if search:
            ratings = ratings.filter(
                Q(customer__name__icontains=search)
                | Q(customer__email__icontains=search)
                | Q(food_item__name__icontains=search)
                | Q(review__icontains=search)
            )

        # Optional filter: ?rating=5
        rating_value = request.query_params.get("rating", "").strip()
        if rating_value:
            if rating_value not in {"1", "2", "3", "4", "5"}:
                return Response(
                    {"detail": "Rating must be between 1 and 5."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            ratings = ratings.filter(rating=int(rating_value))

        summary = ratings.aggregate(
            average_rating=Avg("rating"),
            total_reviews=Count("id"),
        )

        serializer = FoodRatingSerializer(ratings, many=True)

        return Response({
            "total_reviews": summary["total_reviews"],
            "average_rating": round(
                summary["average_rating"] or 0, 1
            ),
            "reviews": serializer.data,
        })


class AdminFoodRatingDetailView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, rating_id):
        rating = get_object_or_404(FoodRating, id=rating_id)
        rating.delete()

        return Response(
            {"message": "Review deleted successfully."},
            status=status.HTTP_200_OK,
        )
