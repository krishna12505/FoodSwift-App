from django.contrib.auth.models import AbstractUser
from django.db import models


class Account(AbstractUser):

    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        RESTAURANT_OWNER = "restaurant_owner", "Restaurant Owner"
        DELIVERY_PARTNER = "delivery_partner", "Delivery Partner"

    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)

    phone = models.CharField(
        max_length=15,
        blank=True,
    )

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.CUSTOMER,
    )

    def __str__(self):
        return self.email


class SavedAddress(models.Model):

    class AddressType(models.TextChoices):
        HOME = "home", "Home"
        WORK = "work", "Work"
        OTHER = "other", "Other"

    customer = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name="saved_addresses",
    )

    label = models.CharField(
        max_length=10,
        choices=AddressType.choices,
        default=AddressType.HOME,
    )

    recipient_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)

    address_line = models.CharField(max_length=255)
    landmark = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, default="Telangana")
    postal_code = models.CharField(max_length=10)

    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return f"{self.get_label_display()} - {self.customer.email}"
