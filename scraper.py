import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup

def get_live_prices():
    # Use a standard Desktop User-Agent to avoid being flagged as a bot
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    # Fallbacks (Today's known prices as starting point)
    gold, silver, source = 304700, 5600, "Market Fallback"
    
    try:
        # Increase timeout and use a session for better reliability
        session = requests.Session()
        r = session.get("https://www.fenegosida.org/", headers=headers, timeout=25)
        r.raise_for_status()
        
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # 1. Clean the text: remove commas and extra whitespace
        # This turns "304,700" into "304700"
        page_text = soup.get_text().replace(',', '')
        
        # 2. Extract all numbers between 4 and 7 digits
        # Using \b word boundaries to ensure we don't catch parts of phone numbers
        all_nums = [int(n) for n in re.findall(r'\b\d{4,7}\b', page_text)]
        
        found_gold = []
        found_silver = []

        for val in all_nums:
            # Gold Logic: Usually between 150k (10g) and 400k (Tola)
            # We lower the floor to 150,000 to be safe
            if 150000 < val < 500000:
                found_gold.append(val)
            
            # Silver Logic: Price has dropped recently, so we lower the floor to 3,000
            if 3000 < val < 15000:
                found_silver.append(val)

        # 3. Validation
        if found_gold:
            # We take the MAX of found gold because the 'Tola' price 
            # is always higher than the '10 Gram' price.
            gold = max(found_gold)
            source = "FENEGOSIDA Official"
            
        if found_silver:
            # Similarly, if there are two silver prices, take the Tola (higher)
            silver = max(found_silver)

    except Exception as e:
        print(f"Scrape failed: {e}")
        # If it fails, it returns the hardcoded fallbacks
        
    return gold, silver, source

def update():
    gold, silver, src = get_live_prices()
    file = 'data.json'
    
    # Standard history loading
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: 
                history = json.load(f)
        except:
            history = []
    else: 
        history = []

    # Nepal Timezone Offset (UTC +5:45)
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"), 
        "gold": gold, 
        "silver": silver, 
        "source": src
    }

    # Update logic: prevent duplicate entries for the same day
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    # Save and keep only the last 30 entries
    with open(file, 'w') as f:
        json.dump(history[-30:], f, indent=4)
    
    print(f"Update successful: Gold {gold}, Silver {silver} ({src})")

if __name__ == "__main__":
    update()