import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup

def clean_and_find_prices(raw_html, metal_type):
    """
    The 'Digital Bulldozer': 
    Strips noise, removes the 'रु' symbol that trolls scrapers, 
    and finds the correct price by value magnitude.
    """
    # 1. Remove Rupee symbol, commas, and extra whitespace
    text = raw_html.replace('रु', '').replace(',', '').replace('\n', ' ')
    
    # 2. Focus on the Tola section (ignore 10gms/Tejabi 0s)
    if metal_type == "gold":
        # Look for 'Fine Gold' or '9999' followed by a number between 150k and 500k
        pattern = r"(?:FINE GOLD|9999|Fine Gold).*?(\d{5,6})"
        min_val, max_val = 150000, 500000
    else:
        # Look for 'Silver' followed by a number between 2k and 10k
        pattern = r"(?:SILVER|Silver).*?(\d{4,5})"
        min_val, max_val = 2000, 10000

    matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
    
    valid_prices = []
    for m in matches:
        val = int(m)
        if min_val <= val <= max_val:
            valid_prices.append(val)
            
    # Return the first valid price found (usually the top one in the UI)
    return valid_prices[0] if valid_prices else 0

def get_live_prices():
    # Priority 1: FENEGOSIDA, Priority 2: Ashesh (Backup)
    sources = [
        {"name": "FENEGOSIDA", "url": "https://www.fenegosida.org/"},
        {"name": "Ashesh", "url": "https://www.ashesh.com.np/gold/"}
    ]
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0'}

    for source in sources:
        try:
            r = requests.get(source['url'], headers=headers, timeout=25)
            r.raise_for_status()
            
            # Get text but use a separator to prevent 'Gold306500' merging
            soup = BeautifulSoup(r.text, 'html.parser')
            # Extract text from the body to avoid header/footer noise
            page_content = soup.get_text(separator=' ')
            
            gold = clean_and_find_prices(page_content, "gold")
            silver = clean_and_find_prices(page_content, "silver")

            if gold > 0 and silver > 0:
                return gold, silver, source['name']
        except Exception as e:
            print(f"Skipping {source['name']} due to error.")
            continue
            
    return 0, 0, "All Sources Failed"

def update():
    file = 'data.json'
    new_gold, new_silver, src = get_live_prices()
    
    # Load history
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: pass

    # AUTO-RECOVERY: If both sites fail, use yesterday's data
    if (new_gold == 0 or new_silver == 0) and history:
        new_gold = history[-1]['gold']
        new_silver = history[-1]['silver']
        src = f"Recovery (Last Known)"
    elif new_gold == 0:
        # Last resort fallback if file is also missing
        new_gold, new_silver, src = 306500, 5340, "Hard Fallback"

    # Nepal Time
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    
    entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": new_gold,
        "silver": new_silver,
        "source": src
    }

    # Update or Append
    today = now.strftime("%Y-%m-%d")
    if history and history[-1]['date'].startswith(today):
        history[-1] = entry
    else:
        history.append(entry)

    # Prevent file bloat
    with open(file, 'w') as f:
        json.dump(history[-100:], f, indent=4)
    
    print(f"Done: Gold {new_gold}, Silver {new_silver} ({src})")

if __name__ == "__main__":
    update()