import json
import os
import requests
from pywebpush import webpush, WebPushException

# VAPID Keys
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY = "BK4UiqZsmzcWoQR_JFmuAhQQ2R7JQEIxC83Tppc8VxBwd4a3mXztqyv31Q9XJ3Ab6Yq_aqbExGlNMX2NP2j5zAQ"
VAPID_CLAIMS = {
    "sub": "mailto:admin@viewgold.vercel.app"
}

def send_web_push(subscription, data):
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(data),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        return True
    except WebPushException as ex:
        print(f"Web Push Error: {ex}")
        return False

def main():
    if not VAPID_PRIVATE_KEY:
        print("VAPID_PRIVATE_KEY not found in environment")
        return

    # Load data
    try:
        with open("data.json", "r") as f:
            price_data = json.load(f)
    except Exception as e:
        print(f"Error loading price data: {e}")
        return

    if len(price_data) < 2:
        print("Not enough data to calculate difference")
        return

    current = price_data[-1]
    previous = price_data[-2]

    # Calculate differences
    gold_diff = current["gold"] - previous["gold"]
    silver_diff = current["silver"] - previous["silver"]

    gold_str = f"Gold: Rs. {current['gold']:,} ({'+' if gold_diff >= 0 else ''}{gold_diff:,})"
    silver_str = f"Silver: Rs. {current['silver']:,} ({'+' if silver_diff >= 0 else ''}{silver_diff:,})"

    notification_data = {
        "title": "GoldView Price Update 🔔",
        "body": f"{gold_str}\n{silver_str}",
        "data": {
            "url": "https://viewgold.vercel.app"
        }
    }

    # Load subscriptions
    # In a real app, these would be in a database. 
    # Here we use the subscriptions.json file if it exists.
    try:
        if os.path.exists("subscriptions.json"):
            with open("subscriptions.json", "r") as f:
                subscriptions = json.load(f)
        else:
            print("No subscriptions found")
            return
    except Exception as e:
        print(f"Error loading subscriptions: {e}")
        return

    print(f"Sending notifications to {len(subscriptions)} users...")
    success_count = 0
    for sub in subscriptions:
        if send_web_push(sub, notification_data):
            success_count += 1

    print(f"Successfully sent {success_count}/{len(subscriptions)} notifications")

if __name__ == "__main__":
    main()
