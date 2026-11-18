import random 
import uuid ## uuid is universal unique identifier.
## this is generate the unique id by program to identify something without needing a manually creating the id

from django.core.cache import cache

# cache configuration

CAPTCHA_EXPIRY = 180
GRID_SIZE = 9

## avaiable captcha categories

CAPTCHA_CATEGORIES = {
    "car":"cars",
    "bicycle":"bicycles",
    "traffic_light":"traffic_lights"
}

def generate_captcha():

    challenge_id = str(uuid.uuid4())
    target = random.choice(CAPTCHA_CATEGORIES.keys())
    image_categories = []
    correct_count = random.randint(2,4)
    image_categories.extend([target]* correct_count)

    other_categories = [category for category in CAPTCHA_CATEGORIES if category != target]

    while len(image_categories) < GRID_SIZE:
        image_categories.append(random.choice(other_categories))

    random.shuffle(image_categories)

    #create image grid

    images = []

    for index, category in enumerate(image_categories):
        images.append({"id":index,"category":category,"image":f"/media/captcha/{CAPTCHA_CATEGORIES[category]}/{index + 1}.jpg"})

    # store correct answers securely in Django cache
    correct_ids = [ image["id"] for image in images if image["category"] == target]

    cache.set(f"captcha_{challenge_id}",{"target": target,"correct_ids": correct_ids},timeout=CAPTCHA_EXPIRY)

    return {
        "challenge_id":challenge_id,
        "question":f"Select all images containing {CAPTCHA_CATEGORIES[target]}",
        "image": [
            {
                "id": image["id"],
                "image":image["image"]
            }
            for image in images
        ]
    }


def verify_captcha(challenge_id,selected_ids):
    captcha_data = cache.get(f"captcha_{challenge_id}")

    if not captcha_data:
        return False

    try:
        selected_ids = {int(item) for item in selected_ids}
    except (TypeError,ValueError):
        return False

    correct_ids = set(captcha_data["correct_ids"])

    cache.delete(f"captcha_{challenge_id}")

    return selected_ids == correct_ids