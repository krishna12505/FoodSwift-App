from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Account


@admin.register(Account)
class AccountAdmin(UserAdmin):
    list_display = (
        "id",
        "username",
        "name",
        "email",
        "role",
        "is_staff",
    )

    search_fields = ("username","name","email")
    list_filter = ("role","is_staff","is_active")

    fieldsets = UserAdmin.fieldsets + (
        ("FoodSwift Details", {"fields":("name","role")}),
        )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("FoodSwift Details", {"fields":("name","email","role")}),
        )