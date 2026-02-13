import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
import urllib3

# Ignore SSL warnings for FENEGOSIDA
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def clean_and_find_prices(raw_html, metal_type):
    # 1. Digital Bulldozer: Remove the 'रु' and commas, but also handle spaces like '306 रु 500'
    # We remove 'रु' and then collapse any spaces between numbers to merge split prices
    text = raw_html.replace('रु', '').replace(',', '')
    text = re.sub(r'(\d)\s+(\d)', r'\1\2', text) # Merge "306 500" into "306500"
    
    # Avoid years/dates being mistaken for prices
    blacklisted = [2081, 2082, 2083, 2084, 2024, 2025, 2026]

    if metal_type == "gold":
        # Target Tola Gold (usually 150k - 500k)
        # We look for 6-digit numbers
        pattern = r"(\d{6})"
        min_val, max_val = 150000, 500000
    else:
        # Target Tola Silver (usually 4.5k - 9k)
        # 10 gram silver is usually < 4.5k, so we set min to 4800
        pattern = r"(\d{4,5})"
        min_val, max_val = 4800, 10000

    matches = re.findall(pattern, text)
    
    valid_prices = []
    for m in matches:
        val = int(m)
        if val in blacklisted: continue
        if min_val <= val <= max_val:
            valid_prices.append(val)
            
    # CRITICAL: Always take the MAX price to ensure we get 'Tola' and not '10 Grams'
    if not valid_prices:
        return 0
    return max(valid_prices)

def get_live_prices():
    sources = [
        {"name": "FENEGOSIDA", "url": "https://fenegosida.org/"},
        {"name": "Ashesh", "url": "https://www.ashesh.com.np/gold/"}
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }

    for source in sources:
        try:
            # verify=False handles the SSL certificate issue
            r = requests.get(source['url'], headers=headers, timeout=20, verify=False)
            r.raise_for_status()
            
            soup = BeautifulSoup(r.text, 'html.parser')
            # Get text with space separator to keep numbers distinct
            page_content = soup.get_text(separator=' ')
            
            gold = clean_and_find_prices(page_content, "gold")
            silver = clean_and_find_prices(page_content, "silver")

            if gold > 0 and silver > 0:
                return gold, silver, source['name']
        except Exception as e:
            print(f"Source {source['name']} failed: {e}")
            continue
            
    return 0, 0, "Failed"

def update():
    file = 'data.json'
    new_gold, new_silver, src = get_live_prices()
    
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: pass

    # If scraping failed, don't update with 0, use last known
    if (new_gold == 0 or new_silver == 0) and history:
        new_gold = history[-1]['gold']
        new_silver = history[-1]['silver']
        src = f"Recovery (Last Known)"
    elif new_gold == 0:
        new_gold, new_silver, src = 303500, 5340, "Default Fallback"

    # Nepal Time
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    
    entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": new_gold,
        "silver": new_silver,
        "source": src
    }

    today = now.strftime("%Y-%m-%d")
    if history and history[-1]['date'].startswith(today):
        history[-1] = entry
    else:
        history.append(entry)

    with open(file, 'w') as f:
        json.dump(history[-100:], f, indent=4)
    
    print(f"Success -> Gold: {new_gold}, Silver: {new_silver} ({src})")

if __name__ == "__main__":
    update()