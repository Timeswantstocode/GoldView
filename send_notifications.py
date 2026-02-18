import json
import os
import requests
from pywebpush import webpush, WebPushException

# VAPID Keys - Load from environment
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "BK4UiqZsmzcWoQR_JFmuAhQQ2R7JQEIxC83Tppc8VxBwd4a3mXztqyv31Q9XJ3Ab6Yq_aqbExGlNMX2NP2j5zAQ")
VAPID_EMAIL = os.environ.get("VAPID_EMAIL", "mailto:timesbaral11@gmail.com")

# Validate VAPID configuration
print(f"DEBUG: VAPID_PRIVATE_KEY present: {bool(VAPID_PRIVATE_KEY)}")
print(f"DEBUG: VAPID_PUBLIC_KEY: {VAPID_PUBLIC_KEY[:20]}...")
print(f"DEBUG: VAPID_EMAIL: {VAPID_EMAIL}")

def send_web_push(subscription, data):
    """Send web push notification with proper VAPID configuration
    Returns: tuple (success: bool, failure_count: int)
    """
    try:
        print(f"DEBUG: Sending push to endpoint: {subscription.get('endpoint', 'unknown')[:50]}...")
        
        # Ensure VAPID claims include proper email format
        vapid_claims = {"sub": VAPID_EMAIL}
        
        webpush(
            subscription_info=subscription,
            data=json.dumps(data),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=vapid_claims
        )
        print(f"DEBUG: Push sent successfully")
        return (True, 0)  # Success, reset failure count to 0
    except WebPushException as ex:
        print(f"Push failed for one device: WebPushException: {ex}")
        # Extract more details from the exception
        if hasattr(ex, 'response') and ex.response:
            try:
                status_code = ex.response.status_code if hasattr(ex.response, 'status_code') else 0
                print(f"Response body: {ex.response.text if hasattr(ex.response, 'text') else 'N/A'}, Response status: {status_code}")
                # Increment failure count for any error
                current_count = subscription.get('failureCount', 0)
                new_count = current_count + 1
                if status_code in [410, 404]:
                    print(f"Subscription failed (HTTP {status_code}, count: {new_count})")
                return (False, new_count)
            except Exception:
                # If we can't parse the response, increment failure count
                print(f"Could not parse response details")
                current_count = subscription.get('failureCount', 0)
                return (False, current_count + 1)
        # No response available, increment failure count
        current_count = subscription.get('failureCount', 0)
        return (False, current_count + 1)
    except Exception as e:
        print(f"Unexpected push error: {type(e).__name__}: {e}")
        current_count = subscription.get('failureCount', 0)
        return (False, current_count + 1)

def main():
    if not VAPID_PRIVATE_KEY:
        print("VAPID_PRIVATE_KEY not found in environment")
        return

    # Load data
    try:
        with open("public/data.json", "r") as f:
            price_data = json.load(f)
    except Exception as e:
        print(f"Error loading price data: {e}")
        return

    if len(price_data) < 2:
        print("Not enough data to calculate difference")
        return

    current = price_data[-1]
    previous = price_data[-2]

    # Check if any price changed
    if (current['gold'] == previous['gold'] and
        current['tejabi'] == previous['tejabi'] and
        current['silver'] == previous['silver']):
        print("PUSH SKIPPED: No price change detected between current and previous record.")
        return

    # Helper for calculating percentage change
    def get_change_str(curr, prev):
        diff = curr - prev
        pct = (diff / prev * 100) if prev != 0 else 0
        sign = '+' if diff >= 0 else ''
        return f"रू {curr:,} ({sign}{pct:.2f}%)"

    gold_str = f"Gold(24K): {get_change_str(current['gold'], previous['gold'])}"
    tejabi_str = f"Tejabi(22K): {get_change_str(current['tejabi'], previous['tejabi'])}"
    silver_str = f"Silver: {get_change_str(current['silver'], previous['silver'])}"

    notification_data = {
        "title": "Current Rates",
        "body": f"{gold_str}\n{tejabi_str}\n{silver_str}",
        "data": {
            "url": "https://www.goldview.tech/",
            "tag": "price-update"
        },
        "tag": "price-update",
        "icon": "/logo512.png",
        "badge": "/logo512.png"
    }

    # Load subscriptions from Vercel Blob
    blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
    if not blob_token:
        print("Error: BLOB_READ_WRITE_TOKEN missing")
        return

    subscriptions = []
    try:
        headers = {"Authorization": f"Bearer {blob_token}"}
        list_url = "https://blob.vercel-storage.com/"
        print(f"DEBUG: Fetching subscriptions from Blob...")
        resp = requests.get(list_url, headers=headers, timeout=10)
        if resp.status_code == 200:
            blobs = resp.json().get('blobs', [])
            target = next((b for b in blobs if 'subscriptions/data.json' in b['pathname']), None)
            if target:
                sub_resp = requests.get(target['url'], timeout=10)
                if sub_resp.status_code == 200:
                    subscriptions = sub_resp.json()
                    print(f"DEBUG: Successfully loaded {len(subscriptions)} subscriptions from Blob.")
        
        if not subscriptions:
            print("No subscriptions found in Blob, checking local fallback...")
            if os.path.exists('subscriptions.json'):
                with open('subscriptions.json', 'r') as f:
                    subscriptions = json.load(f)
                    print(f"DEBUG: Loaded {len(subscriptions)} subscriptions from local file.")
    except Exception as e:
        print(f"Error loading subscriptions: {e}")
        return

    if not subscriptions:
        print("PUSH SKIPPED: No subscriptions available.")
        return

    print(f"Sending push to {len(subscriptions)} devices...")
    FAILURE_THRESHOLD = 6  # Remove subscription after 6 consecutive failures
    success_count = 0
    failed_count = 0
    updated_subscriptions = []  # Track subscriptions with updated failure counts
    
    for sub in subscriptions:
        # Skip dummy/test endpoints but ensure failureCount is initialized
        endpoint = sub.get('endpoint', '')
        if 'dummy' in endpoint.lower() or not endpoint:
            print(f"DEBUG: Skipping dummy/invalid endpoint")
            sub['failureCount'] = sub.get('failureCount', 0)
            updated_subscriptions.append(sub)
            continue
            
        success, new_failure_count = send_web_push(sub, notification_data)
        if success:
            success_count += 1
            sub['failureCount'] = 0  # Reset on success
            updated_subscriptions.append(sub)
        else:
            failed_count += 1
            sub['failureCount'] = new_failure_count
            if new_failure_count < FAILURE_THRESHOLD:
                updated_subscriptions.append(sub)
                print(f"DEBUG: Subscription kept (failures: {new_failure_count}/{FAILURE_THRESHOLD})")
            else:
                print(f"DEBUG: Removing subscription after {new_failure_count} consecutive failures")

    print(f"PUSH STATUS: Sent to {success_count} active devices.")
    if failed_count > 0:
        print(f"PUSH STATUS: Failed for {failed_count} devices (may be expired subscriptions).")
    
    # Save updated subscriptions with failure counts
    removed_count = len(subscriptions) - len(updated_subscriptions)
    if removed_count > 0:
        print(f"Removed {removed_count} subscription(s) after {FAILURE_THRESHOLD}+ consecutive failures")
    
    # Always save to persist failure counts
    if len(updated_subscriptions) != len(subscriptions) or any(s.get('failureCount', 0) > 0 for s in updated_subscriptions):
        try:
            headers = {"Authorization": f"Bearer {blob_token}", "Content-Type": "application/json"}
            put_url = "https://blob.vercel-storage.com/subscriptions/data.json"
            put_resp = requests.put(put_url, headers=headers, data=json.dumps(updated_subscriptions, indent=2), timeout=10)
            if put_resp.status_code in [200, 201]:
                print(f"DEBUG: Successfully updated subscriptions. Total: {len(updated_subscriptions)}")
            else:
                print(f"DEBUG: Failed to update subscriptions: {put_resp.status_code}")
        except Exception as e:
            print(f"ERROR: Failed to update subscriptions: {e}")

if __name__ == "__main__":
    main()
