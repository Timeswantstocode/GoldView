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
    
    gold, silver, status = 0, 0, "Failed"
    
    try:
        # 1. Fetch the page
        r = requests.get("https://www.fenegosida.org/", headers=headers, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')

        # 2. Get all text fragments from the page
        # This ignores HTML tags and looks at the actual words/numbers
        fragments = [s.strip() for s in soup.get_text(separator='|').split('|') if s.strip()]
        
        found_gold = []
        found_silver = []

        for i, text in enumerate(fragments):
            clean_text = text.lower()
            
            # Look for the word GOLD
            if "gold" in clean_text and "fine" in clean_text:
                # Look at the next 5 fragments for a price (150k - 500k)
                for j in range(i, i + 6):
                    if j < len(fragments):
                        num = re.sub(r'[^\d]', '', fragments[j].split('.')[0])
                        if num.isdigit() and 150000 < int(num) < 500000:
                            found_gold.append(int(num))

            # Look for the word SILVER
            if "silver" in clean_text:
                # Look at the next 5 fragments for a price (3000 - 15000)
                for j in range(i, i + 6):
                    if j < len(fragments):
                        num = re.sub(r'[^\d]', '', fragments[j].split('.')[0])
                        if num.isdigit() and 3000 < int(num) < 15000:
                            found_silver.append(int(num))

        # 3. Assign the best matches (highest number is always the 'Tola' price)
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
    
    # Load previous history
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: history = []
    else:
        history = []

    # SELF-HEALING: If scraping failed today, use the last entry's values
    if (new_gold == 0 or new_silver == 0) and history:
        new_gold = history[-1]['gold']
        new_silver = history[-1]['silver']
        # We keep the source as "Carry Over" so you know it's old data
        src = "Last Known (Carry Over)"
    elif new_gold == 0 or new_silver == 0:
        # Only happens if the very first run fails
        new_gold, new_silver, src = 304700, 5600, "Fallback"

    # Set Time (Nepal)
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": new_gold,
        "silver": new_silver,
        "source": src
    }

    # If today's entry already exists, update it; otherwise, append.
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    # Save full history (no limits)
    with open(file, 'w') as f:
        json.dump(history, f, indent=4)
    
    print(f"Final Output: Gold {new_gold}, Silver {new_silver} ({src})")

if __name__ == "__main__":
    update()