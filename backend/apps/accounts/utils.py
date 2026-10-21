
from django.core.mail import send_mail
from django.conf import settings


def send_welcome_email(account):
    subject = "Welcome to FoodSwift!"

    message = (
        f"Hi {account.name},\n\n"
        "Welcome to FoodSwift!\n"
        "Your account has been created successfully.\n\n"
        "Explore restaurants and enjoy ordering your favourite food.\n\n"
        "Regards,\n"
        "FoodSwift Team"
    )

    return send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [account.email],
        fail_silently=False,
    )
