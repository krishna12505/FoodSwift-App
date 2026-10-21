from django.conf import settings
from django.db import models


class FoodRating(models.Model):
    food_item = models.ForeignKey(
        "menu.MenuItem",
        on_delete=models.CASCADE,
        related_name="ratings",
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="food_ratings",
    )

    rating = models.PositiveSmallIntegerField()
    review = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["food_item", "customer"],
                name="unique_customer_food_rating",
            ),
            models.CheckConstraint(
                condition=models.Q(rating__gte=1, rating__lte=5),
                name="food_rating_between_1_and_5",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.food_item.name}: {self.rating}/5"
