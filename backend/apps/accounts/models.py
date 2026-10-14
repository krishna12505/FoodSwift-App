from django.contrib.auth.models import AbstractUser
from django.db import models


class Account(AbstractUser):

    class Role(models.TextChoices):
        CUSTOMER = "customer","Customer"
        RESTAURANT_OWNER = "restaurant_owner","Restaurant Owner"
        DELIVERY_PARTNER = "delivery_partner", "Delivary Partner"

    
    name = models.CharField(max_length=100, blank=True)
    email = models.CharField(unique=True)
    role = models.CharField(
        max_length=30,
        choices = Role.choices,
        default = Role.CUSTOMER
    )


    def __str__(self):
        return self.username
