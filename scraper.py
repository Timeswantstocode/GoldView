import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
import urllib3

# Suppress SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- GITHUB SECRETS CONFIGURATION ---
# These are pulled from your GitHub Repository Secrets
ONESIGNAL_APP_ID = os.getenv('ONESIGNAL_APP_ID')
ONESIGNAL_REST_KEY = os.getenv('ONESIGNAL_REST_KEY')

def send_push_notification(new_gold, new_silver, change_g, change_s):
    """Sends native device notifications via OneSignal API"""
    if not ONESIGNAL_APP_ID or not ONESIGNAL_REST_KEY:
        print("PUSH SKIPPED: OneSignal keys missing in environment.")
        return

    # Create a descriptive message
    msg_parts = []
    if change_g != 0:
        dir_g = "increased" if change_g > 0 else "decreased"
        msg_parts.append(f"Gold {dir_g} by रू {abs(change_g)}")
    if change_s != 0:
        dir_s = "increased" if change_s > 0 else "decreased"
        msg_parts.append(f"Silver {dir_s} by रू {abs(change_s)}")
    
    full_msg = " & ".join(msg_parts) + f". New Rate: Gold रू {new_gold}."

    header = {
        "Content-Type": "application/json; charset=utf-8", 
        "Authorization": f"Basic {ONESIGNAL_REST_KEY}"
    }
    
    payload = {
        "app_id": ONESIGNAL_APP_ID,
        "included_segments": ["All"],
        "headings": {"en": "GoldView Price Alert 📈"},
        "contents": {"en": full_msg},
        "ios_badgeType": "Increase",
        "ios_badgeCount": 1,
        "priority": 10 # High priority for instant delivery
    }

    try:
        response = requests.post("https://onesignal.com/api/v1/notifications", headers=header, data=json.dumps(payload))
        if response.status_code == 200:
            print(f"PUSH SUCCESS: Sent '{full_msg}'")
        else:
            print(f"PUSH FAILED: {response.text}")
    except Exception as e:
        print(f"PUSH ERROR: {e}")

def get_candidates(url, metal):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'}
    try:
        r = requests.get(url, headers=headers, timeout=25, verify=False)
        # Clean HTML for better regex matching
        raw_html = r.text.replace(',', '')
        soup = BeautifulSoup(raw_html, 'html.parser')
        content = soup.get_text(separator=' ')
        
        pattern = r"(\d{6})" if metal == "gold" else r"(\d{4,5})"
        matches = re.findall(pattern, content)
        
        # Validation ranges
        valid = []
        for m in matches:
            val = int(m)
            if metal == "gold" and 100000 <= val <= 1000000:
                valid.append(val)
            elif metal == "silver" and 1000 <= val <= 15000:
                valid.append(val)
        return valid
    except: return []

def update():
    file = 'data.json'
    
    # 1. Fetch Candidates
    f_gold = get_candidates("https://fenegosida.org/", "gold")
    f_silver = get_candidates("https://fenegosida.org/", "silver")
    a_gold = get_candidates("https://www.ashesh.com.np/gold/", "gold")
    
    # 2. Extract best values
    final_gold = max(f_gold + a_gold) if (f_gold + a_gold) else 0
    final_silver = max(f_silver) if f_silver else 0

    # 3. Load History
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: pass

    # 4. Trigger Notification Logic
    if history and final_gold > 0:
        last_entry = history[-1]
        change_g = final_gold - last_entry['gold']
        change_s = final_silver - last_entry['silver']
        
        # Only notify if price actually changed
        if change_g != 0 or change_s != 0:
            send_push_notification(final_gold, final_silver, change_g, change_s)
        else:
            print("NO CHANGE: Prices are the same as the last record.")

    # 5. Handle Scraper Failure (Recovery)
    if final_gold == 0 and history:
        final_gold = history[-1]['gold']
        final_silver = history[-1]['silver']
        source = "Recovery (Last Known)"
    else:
        source = "FENEGOSIDA Official"

    # 6. Generate Entry
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": final_gold,
        "tejabi": int(final_gold * 0.9167),
        "silver": final_silver,
        "source": source
    }

    # 7. Update or Append
    if history and history[-1]['date'].startswith(now.strftime("%Y-%m-%d")):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    # 8. Save
    with open(file, 'w') as f:
        json.dump(history[-200:], f, indent=4)
    
    print(f"UPDATE COMPLETE: Gold {final_gold} via {source}")

if __name__ == "__main__":
    update()