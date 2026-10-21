from django.contrib import admin

from .models import Restaurant


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "name",
        "owner",
        "cuisine",
        "city",
        "phone",
        "is_open",
        "is_active",
        "created_at",
    )

    list_filter = (
        "cuisine",
        "city",
        "is_open",
        "is_active",
    )

    search_fields = ("name","owner__email","cuisine","city","phone",)

    readonly_fields = ("created_at","updated_at",)

    ordering = ("-created_at",)
