
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Account


@admin.register(Account)
class AccountAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("FoodSwift Details", {"fields": ("name",)}),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ("FoodSwift Details", {"fields": ("name",)}),
    )