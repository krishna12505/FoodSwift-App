from django.contrib import admin
from .models import MenuItem


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "restaurant",
        "category",
        "price",
        "food_type",
        "is_available",
    )

    list_filter = (
        "category",
        "food_type",
        "is_available",
    )

    search_fields = (
        "name",
        "restaurant__name",
        "category",
    )

    list_editable = ("price", "is_available")
