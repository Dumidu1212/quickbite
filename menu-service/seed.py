# seed.py
#
# Populates menu-db with realistic test data for development and demos.
#
# IDEMPOTENT: Running this script twice does not create duplicates.
# It checks if data already exists before inserting.
#
# USAGE:
#   python seed.py
#
# DEMO CREDENTIALS created by this script:
#   5 restaurants across different cuisines
#   15 menu items (3 per restaurant)

import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI_MENU")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI_MENU not set in .env")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
db = client.get_database("menu-db")
restaurants_col = db.get_collection("restaurants")
menu_items_col = db.get_collection("menu_items")

RESTAURANTS = [
    {
        "name": "Mario's Pizzeria",
        "cuisine": "Italian",
        "address": "12 Galle Road, Colombo 03",
        "imageUrl": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
        "rating": 4.7,
        "isOpen": True,
        "deliveryTime": "25-35 min",
        "minimumOrder": 8.00,
    },
    {
        "name": "Dragon Noodle House",
        "cuisine": "Chinese",
        "address": "88 Union Place, Colombo 02",
        "imageUrl": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400",
        "rating": 4.5,
        "isOpen": True,
        "deliveryTime": "30-40 min",
        "minimumOrder": 10.00,
    },
    {
        "name": "Fiesta Tacos",
        "cuisine": "Mexican",
        "address": "45 Duplication Road, Colombo 04",
        "imageUrl": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400",
        "rating": 4.3,
        "isOpen": True,
        "deliveryTime": "20-30 min",
        "minimumOrder": 6.00,
    },
    {
        "name": "Burger Republic",
        "cuisine": "American",
        "address": "7 Flower Road, Colombo 07",
        "imageUrl": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
        "rating": 4.6,
        "isOpen": True,
        "deliveryTime": "15-25 min",
        "minimumOrder": 7.00,
    },
    {
        "name": "Spice Garden",
        "cuisine": "Sri Lankan",
        "address": "23 Bauddhaloka Mawatha, Colombo 07",
        "imageUrl": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",
        "rating": 4.8,
        "isOpen": True,
        "deliveryTime": "35-50 min",
        "minimumOrder": 5.00,
    },
]

# Menu items keyed by restaurant name — restaurantId filled in after insert
MENU_ITEMS = {
    "Mario's Pizzeria": [
        {
            "name": "Margherita Pizza",
            "description": "San Marzano tomatoes, fresh mozzarella, basil, olive oil",
            "price": 14.00,
            "category": "Mains",
            "isAvailable": True,
        },
        {
            "name": "Pasta Carbonara",
            "description": "Pancetta, egg, parmesan, black pepper, spaghetti",
            "price": 13.50,
            "category": "Mains",
            "isAvailable": True,
        },
        {
            "name": "Garlic Bread",
            "description": "Toasted sourdough with roasted garlic butter",
            "price": 4.50,
            "category": "Starters",
            "isAvailable": True,
        },
    ],
    "Dragon Noodle House": [
        {
            "name": "Dim Sum Basket",
            "description": "Assorted steamed dumplings with soy dipping sauce",
            "price": 9.50,
            "category": "Starters",
            "isAvailable": True,
        },
        {
            "name": "Beef Chow Mein",
            "description": "Wok-fried noodles with tender beef and vegetables",
            "price": 13.00,
            "category": "Mains",
            "isAvailable": True,
        },
        {
            "name": "Sweet & Sour Chicken",
            "description": "Crispy chicken in classic sweet and sour sauce",
            "price": 12.50,
            "category": "Mains",
            "isAvailable": True,
        },
    ],
    "Fiesta Tacos": [
        {
            "name": "Chicken Tacos (x3)",
            "description": "Grilled chicken, salsa, guacamole, cheddar in corn tortillas",
            "price": 10.50,
            "category": "Mains",
            "isAvailable": True,
        },
        {
            "name": "Nachos Grande",
            "description": "Tortilla chips, melted cheese, jalapeños, sour cream",
            "price": 8.00,
            "category": "Starters",
            "isAvailable": True,
        },
        {
            "name": "Churros",
            "description": "Fried dough pastry with cinnamon sugar and chocolate dip",
            "price": 5.50,
            "category": "Desserts",
            "isAvailable": True,
        },
    ],
    "Burger Republic": [
        {
            "name": "Classic Smash Burger",
            "description": "Double smash patty, American cheese, pickles, special sauce",
            "price": 12.00,
            "category": "Mains",
            "isAvailable": True,
        },
        {
            "name": "Loaded Fries",
            "description": "Crispy fries topped with cheese sauce, bacon, jalapeños",
            "price": 6.50,
            "category": "Sides",
            "isAvailable": True,
        },
        {
            "name": "Oreo Milkshake",
            "description": "Thick creamy milkshake with crushed Oreo cookies",
            "price": 5.00,
            "category": "Drinks",
            "isAvailable": True,
        },
    ],
    "Spice Garden": [
        {
            "name": "Rice and Curry",
            "description": "Steamed rice with dhal, fish curry, pol sambol, papadum",
            "price": 8.50,
            "category": "Mains",
            "isAvailable": True,
        },
        {
            "name": "Kottu Roti",
            "description": "Shredded roti with egg, vegetables and chicken, spiced gravy",
            "price": 9.00,
            "category": "Mains",
            "isAvailable": True,
        },
        {
            "name": "Watalappan",
            "description": "Traditional Sri Lankan coconut custard with jaggery and spices",
            "price": 4.00,
            "category": "Desserts",
            "isAvailable": True,
        },
    ],
}


async def seed():
    print("[Seed] Starting database seed...")

    # Check if already seeded — idempotency check
    existing = await restaurants_col.count_documents({})
    if existing > 0:
        print(f"[Seed] Database already has {existing} restaurants — skipping.")
        print("[Seed] To re-seed: drop the collections in MongoDB Atlas first.")
        return

    # Insert restaurants and collect their generated IDs
    restaurant_ids = {}
    for restaurant_data in RESTAURANTS:
        result = await restaurants_col.insert_one(restaurant_data)
        restaurant_ids[restaurant_data["name"]] = str(result.inserted_id)
        print(f"[Seed] Inserted restaurant: {restaurant_data['name']} → {result.inserted_id}")

    # Insert menu items with correct restaurantId references
    total_items = 0
    for restaurant_name, items in MENU_ITEMS.items():
        restaurant_id = restaurant_ids[restaurant_name]
        for item in items:
            item_with_id = {**item, "restaurantId": restaurant_id}
            result = await menu_items_col.insert_one(item_with_id)
            total_items += 1
            print(f"[Seed]   + {item['name']} → {result.inserted_id}")

    print(f"\n[Seed] Done. Inserted {len(RESTAURANTS)} restaurants and {total_items} menu items.")
    print("[Seed] MongoDB Atlas collections: restaurants, menu_items in menu-db")


if __name__ == "__main__":
    asyncio.run(seed())
