
import os
import json
import re
from decimal import Decimal, InvalidOperation

from groq import Groq

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from apps.menu.models import MenuItem


# =========================================
# FOOD FILTER HELPERS
# =========================================

def get_budget_limit(message):
    """Extract maximum budget from customer message."""

    patterns = [
        r"(?:under|below|less than|up to|upto|within)\s*₹?\s*(\d+(?:\.\d+)?)",
        r"budget\s*(?:of|is)?\s*₹?\s*(\d+(?:\.\d+)?)",
        r"₹\s*(\d+(?:\.\d+)?)"
    ]

    for pattern in patterns:
        match = re.search(pattern, message.lower())

        if match:
            try:
                return Decimal(match.group(1))
            except InvalidOperation:
                return None

    return None


def get_food_type_filter(message):
    """Identify vegetarian or non-vegetarian preference."""

    message = message.lower()

    non_veg_patterns = [
        r"\bnon[\s-]?veg\b",
        r"\bnon[\s-]?vegetarian\b"
    ]

    for pattern in non_veg_patterns:
        if re.search(pattern, message):
            return "nonveg"

    veg_patterns = [
        r"\bveg\b",
        r"\bvegetarian\b"
    ]

    for pattern in veg_patterns:
        if re.search(pattern, message):
            return "veg"

    return None


def filter_menu_items(menu_data, message):
    """Apply customer budget and food preference filters."""

    budget = get_budget_limit(message)
    food_type = get_food_type_filter(message)

    filtered_items = []

    for item in menu_data:

        try:
            price = Decimal(item["price"])
        except (InvalidOperation, TypeError):
            continue

        # Budget filtering
        if budget is not None and price > budget:
            continue

        # Food type filtering
        item_type = item["food_type"].lower().strip()

        if food_type == "veg":

            if (
                "non" in item_type
                or "nonveg" in item_type
                or "non-veg" in item_type
                or "non vegetarian" in item_type
            ):
                continue

            if not (
                "veg" in item_type
                or "vegetarian" in item_type
            ):
                continue

        elif food_type == "nonveg":

            if not (
                "non" in item_type
                or "nonveg" in item_type
                or "non-veg" in item_type
                or "non vegetarian" in item_type
            ):
                continue

        filtered_items.append(item)

    return filtered_items


# =========================================
# DATABASE MENU
# =========================================

def get_available_menu():
    """Fetch real available dishes from FoodSwift database."""

    items = MenuItem.objects.filter(
        is_available=True,
        restaurant__is_active=True,
        restaurant__verification_status="approved"
    ).select_related(
        "restaurant"
    ).order_by("name")[:300]

    menu_data = []

    for item in items:

        menu_data.append({
            "id": item.id,
            "restaurant_id": item.restaurant_id,
            "name": item.name,
            "description": item.description or "",
            "category": item.category or "",
            "price": str(item.price),
            "food_type": item.food_type or "",
            "restaurant": item.restaurant.name,
        })

    return menu_data


# =========================================
# GROQ AI
# =========================================

def generate_groq_response(message, menu_data):
    """Understand customer requests using Groq AI."""

    api_key = os.getenv("GROQ_API_KEY")

    model = os.getenv(
        "GROQ_MODEL",
        "openai/gpt-oss-20b"
    )

    if not api_key:
        raise ValueError("GROQ_API_KEY is missing.")

    client = Groq(api_key=api_key)

    prompt = f"""
You are FoodSwift AI, a professional food ordering assistant.

CUSTOMER MESSAGE:
{message}

AVAILABLE FOOD ITEMS FROM DATABASE:
{json.dumps(menu_data, ensure_ascii=False)}

ALLOWED INTENTS:

greeting
food_search
add_to_cart
remove_from_cart
show_cart
update_quantity
clear_cart
order
tracking
address
payment
other

IMPORTANT RULES:

1. Recommend only food items present in the database.
2. Never invent food names, prices, restaurants or IDs.
3. Return only valid database item IDs.
4. Respect the customer's budget.
5. Respect vegetarian and non-vegetarian preferences.
6. For biryani requests, prioritize biryani items.
7. For exact dish requests, prioritize exact matches.
8. For restaurant requests, prioritize that restaurant.
9. For food recommendations, return at most 10 item IDs.
10. For add_to_cart, identify the requested food and quantity.
11. For remove_from_cart, identify the requested food.
12. For update_quantity, identify the food and desired quantity.
13. For show_cart, return an empty item_ids list.
14. For clear_cart, return an empty item_ids list.
15. For order, understand that the customer wants to proceed
    with ordering. Never claim an order was placed.
16. For tracking, understand the tracking request.
17. For greetings, return no item IDs.
18. If no matching dishes exist, explain politely.
19. Quantity must be an integer between 1 and 20.
20. If quantity is not mentioned, use 1.
21. Never claim that a cart or order has actually changed.
22. For non-food actions, return an empty item_ids list.
23. Use a friendly and professional tone.

Return JSON only in this format:

{{
    "reply": "Your conversational response",
    "intent": "food_search",
    "item_ids": [],
    "quantity": 1
}}
"""

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        response_format={
            "type": "json_object"
        },
        temperature=0.3,
        max_completion_tokens=1000
    )

    response_text = response.choices[0].message.content

    if not response_text:
        raise ValueError("Groq returned an empty response.")

    result = json.loads(response_text)

    if not isinstance(result, dict):
        raise ValueError("Invalid Groq response.")

    return result


# =========================================
# CHATBOT API
# =========================================

class ChatbotMessageView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        message = request.data.get("message", "")

        if not isinstance(message, str):
            return Response(
                {"error": "Message must be text."},
                status=status.HTTP_400_BAD_REQUEST
            )

        message = message.strip()

        if not message:
            return Response(
                {"error": "Please enter a message."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(message) > 2000:
            return Response(
                {"error": "Message cannot exceed 2000 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            # 1. Fetch real database menu
            all_menu_items = get_available_menu()

            # 2. Apply budget and food preference filters
            menu_data = filter_menu_items(
                all_menu_items,
                message
            )

            # 3. Handle empty filtered results
            if not menu_data:

                return Response(
                    {
                        "reply": (
                            "Sorry, I couldn't find available dishes "
                            "matching your budget or food preference. "
                            "Would you like to try another budget or category?"
                        ),
                        "intent": "food_search",
                        "quantity": 1,
                        "menu_items": []
                    },
                    status=status.HTTP_200_OK
                )

            # 4. Ask Groq to understand customer intent
            ai_result = generate_groq_response(
                message,
                menu_data
            )

            # 5. Validate returned item IDs
            valid_items = {
                item["id"]: item
                for item in menu_data
            }

            selected_ids = ai_result.get("item_ids", [])

            if not isinstance(selected_ids, list):
                selected_ids = []

            selected_items = []
            seen_ids = set()

            for item_id in selected_ids:

                try:
                    item_id = int(item_id)
                except (TypeError, ValueError):
                    continue

                if item_id in seen_ids:
                    continue

                if item_id in valid_items:

                    item = valid_items[item_id]

                    selected_items.append({
                        **item,
                        "available": True,
                        "url": (
                            f"/menu?restaurant={item['restaurant_id']}"
                            f"&item={item['id']}"
                        )
                    })

                    seen_ids.add(item_id)

                if len(selected_items) >= 10:
                    break

            # 6. Validate intent
            intent = ai_result.get("intent", "other")

            allowed_intents = {
                "greeting",
                "food_search",
                "add_to_cart",
                "remove_from_cart",
                "show_cart",
                "update_quantity",
                "clear_cart",
                "order",
                "tracking",
                "address",
                "payment",
                "other"
            }

            if intent not in allowed_intents:
                intent = "other"

            # 7. Validate quantity
            try:
                quantity = int(ai_result.get("quantity", 1))
            except (TypeError, ValueError):
                quantity = 1

            quantity = max(1, min(quantity, 20))

            # 8. Return response to React
            reply = ai_result.get(
                "reply",
                "How can I help you today?"
            )

            if not isinstance(reply, str):
                reply = "How can I help you today?"

            return Response(
                {
                    "reply": reply,
                    "intent": intent,
                    "quantity": quantity,
                    "menu_items": selected_items
                },
                status=status.HTTP_200_OK
            )

        except Exception as error:

            print("FoodSwift Groq Error:", str(error))

            error_message = str(error).lower()

            if (
                "429" in error_message
                or "rate_limit" in error_message
                or "quota" in error_message
            ):

                return Response(
                    {
                        "reply": (
                            "Our AI assistant has temporarily "
                            "reached its usage limit. Please try again later."
                        ),
                        "menu_items": [],
                        "error": "GROQ_RATE_LIMIT_EXCEEDED"
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            return Response(
                {
                    "reply": (
                        "I'm temporarily unable to connect to "
                        "FoodSwift AI. Please try again."
                    ),
                    "menu_items": [],
                    "error": "GROQ_SERVICE_ERROR"
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
