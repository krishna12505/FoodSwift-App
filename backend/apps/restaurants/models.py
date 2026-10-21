
from django.conf import settings
from django.db import models


class Restaurant(models.Model):

    # Restaurant verification status
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending Verification"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        NEEDS_INFO = "needs_info", "More Information Required"

    # Restaurant owner
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="restaurants",
        limit_choices_to={"role": "restaurant_owner"},
    )

    # Basic restaurant details
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    cuisine = models.CharField(max_length=100)
    address = models.TextField()
    city = models.CharField(max_length=100, default="Hyderabad")
    image = models.URLField(blank=True)
    phone = models.CharField(max_length=15)

    # Business hours
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)

    # Restaurant availability
    is_open = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    # Admin verification
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )

    verification_notes = models.TextField(blank=True)

    verified_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
