import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
import urllib3

# Disable annoying SSL warnings for the FENEGOSIDA site
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def clean_and_find_prices(raw_html, metal_type):
    # Remove Rupee symbol, commas, and simplify spaces
    text = raw_html.replace('रु', '').replace(',', '').replace('\n', ' ')
    
    # Avoid years being mistaken for prices
    blacklisted = [2081, 2082, 2083, 2084, 2024, 2025, 2026]

    if metal_type == "gold":
        # Strategy: Find 'Fine' or 'Hallmark', but EXCLUDE 'Tejabi/Tajabi'
        # We look for the 6-digit number that appears after 'Fine' or 'Hallmark'
        gold_patterns = [
            r"(?:Fine|Hallmark|छापावाल).*?(\d{6})",
            r"(\d{6})" 
        ]
        
        # Remove Tajabi sections from text entirely to prevent accidental matching
        clean_text = re.sub(r"(?:Tejabi|Tajabi|तेजावी).*?\d+", "", text, flags=re.IGNORECASE)
        
        for pattern in gold_patterns:
            matches = re.findall(pattern, clean_text, re.IGNORECASE | re.DOTALL)
            valid = [int(m) for m in matches if int(m) not in blacklisted and 150000 <= int(m) <= 500000]
            if valid:
                return max(valid) # Return the highest (Fine Gold)

    else:
        # Silver Strategy: Look for the number after 'Silver'
        # We use a tighter range (4000-9000) to avoid years or 10-gram prices
        silver_patterns = [
            r"(?:Silver|चाँदी).*?(\d{4,5})",
            r"(\d{4,5})"
        ]
        for pattern in silver_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            valid = [int(m) for m in matches if int(m) not in blacklisted and 4000 <= int(m) <= 9000]
            if valid:
                return valid[0] # Return the first valid one near the label

    return 0

def get_live_prices():
    # Using 'https://fenegosida.org/' (no www) is often more stable for their SSL
    sources = [
        {"name": "FENEGOSIDA", "url": "https://fenegosida.org/"},
        {"name": "Ashesh", "url": "https://www.ashesh.com.np/gold/"}
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }

    for source in sources:
        try:
            # verify=False fixes the SSL/Hostname mismatch error
            r = requests.get(source['url'], headers=headers, timeout=20, verify=False)
            r.raise_for_status()
            
            soup = BeautifulSoup(r.text, 'html.parser')
            # Focus on the visible text
            page_content = soup.get_text(separator=' ')
            
            gold = clean_and_find_prices(page_content, "gold")
            silver = clean_and_find_prices(page_content, "silver")

            if gold > 100000 and silver > 3000:
                return gold, silver, source['name']
        except Exception as e:
            print(f"Source {source['name']} skipped: {e}")
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

    # Recovery logic
    if (new_gold == 0 or new_silver == 0) and history:
        new_gold = history[-1]['gold']
        new_silver = history[-1]['silver']
        src = f"Recovery (Last Known)"
    elif new_gold == 0:
        new_gold, new_silver, src = 306500, 5340, "Hard Fallback"

    # Set Nepal Time
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
    
    print(f"Final Result -> Gold: {new_gold}, Silver: {new_silver} ({src})")

if __name__ == "__main__":
    update()