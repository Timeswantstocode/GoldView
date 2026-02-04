import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup

def get_live_prices():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    }
    
    # We use 0, 0 to detect if the scrape actually worked
    gold, silver, status = 0, 0, "Failed"
    
    try:
        r = requests.get("https://www.fenegosida.org/", headers=headers, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')

        # Split text into fragments to handle messy HTML
        fragments = [s.strip() for s in soup.get_text(separator='|').split('|') if s.strip()]
        
        found_gold = []
        found_silver = []

        # Blacklist common non-price numbers like purity or weight
        # 999 and 9999 are almost always purity levels
        blacklist = [999, 9999, 10, 11]

        for i, text in enumerate(fragments):
            clean_text = text.lower()
            
            # --- GOLD SEARCH ---
            if "gold" in clean_text and "fine" in clean_text:
                for j in range(i, i + 7): # Check next 7 fragments
                    if j < len(fragments):
                        # Extract only digits, ignoring decimals
                        num_str = re.sub(r'[^\d]', '', fragments[j].split('.')[0])
                        if num_str.isdigit():
                            val = int(num_str)
                            if 150000 < val < 500000 and val not in blacklist:
                                found_gold.append(val)

            # --- SILVER SEARCH ---
            if "silver" in clean_text:
                for j in range(i, i + 7):
                    if j < len(fragments):
                        num_str = re.sub(r'[^\d]', '', fragments[j].split('.')[0])
                        if num_str.isdigit():
                            val = int(num_str)
                            # Silver range tightened to avoid picking up 9999
                            if 3000 < val < 9000 and val not in blacklist:
                                found_silver.append(val)

        if found_gold:
            gold = max(found_gold)
            status = "FENEGOSIDA Official"
        
        if found_silver:
            silver = max(found_silver)

    except Exception as e:
        print(f"Scrape Error: {e}")

    return gold, silver, status

def update():
    file = 'data.json'
    new_gold, new_silver, src = get_live_prices()
    
    # Load history
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: history = []
    else:
        history = []

    # SELF-HEALING: Carry over logic
    if (new_gold == 0 or new_silver == 0) and history:
        new_gold = history[-1]['gold']
        new_silver = history[-1]['silver']
        src = "Last Known (Carry Over)"
    elif new_gold == 0 or new_silver == 0:
        # Emergency fallbacks if file is empty
        new_gold, new_silver, src = 304700, 5600, "Fallback"

    # Set Nepal Time (+5:45)
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": new_gold,
        "silver": new_silver,
        "source": src
    }

    # Update today's entry or add new day
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    with open(file, 'w') as f:
        json.dump(history, f, indent=4)
    
    print(f"Verified Update: Gold {new_gold}, Silver {new_silver} ({src})")

if __name__ == "__main__":
    update()