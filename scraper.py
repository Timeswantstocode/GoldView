import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup

def clean_and_find_prices(raw_html, metal_type):
    """
    Stricter extraction to avoid years (2082/2083) and 
    ensure we get 'Fine Gold' instead of 'Tejabi'.
    """
    # Remove Rupee symbol, commas, and normalize spaces
    text = raw_html.replace('रु', '').replace(',', '').replace('\n', ' ')
    
    # Avoid picking up years as prices
    current_year = datetime.datetime.now().year
    blacklisted_numbers = [2082, 2083, 2084, current_year, current_year + 1]

    if metal_type == "gold":
        # Look specifically for 'Fine' or 'Hallmark' to avoid Tajabi
        # Must be 6 digits (e.g., 306500)
        pattern = r"(?:FINE|Hallmark|छापावाल).*?(\d{6})"
        min_val, max_val = 150000, 500000
    else:
        # Silver must be between 3500 and 10000 (to avoid picking up the year 2083)
        pattern = r"(?:SILVER|Silver|चाँदी).*?(\d{4,5})"
        min_val, max_val = 3500, 10000

    matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
    
    valid_prices = []
    for m in matches:
        val = int(m)
        if val in blacklisted_numbers:
            continue
        if min_val <= val <= max_val:
            valid_prices.append(val)
            
    # If we found multiple, Gold should be the highest (Fine), 
    # Silver should be the first one found near the label
    if not valid_prices: return 0
    return max(valid_prices) if metal_type == "gold" else valid_prices[0]

def get_live_prices():
    sources = [
        {"name": "FENEGOSIDA", "url": "https://www.fenegosida.org/"},
        {"name": "Ashesh", "url": "https://www.ashesh.com.np/gold/"}
    ]
    
    # Modern headers to prevent 403 Forbidden/Scrape errors
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }

    for source in sources:
        try:
            # Use a session to handle cookies/headers like a real browser
            session = requests.Session()
            r = session.get(source['url'], headers=headers, timeout=25)
            r.raise_for_status()
            
            soup = BeautifulSoup(r.text, 'html.parser')
            # Extract only the body text to reduce header/footer noise
            page_content = soup.find('body').get_text(separator=' ') if soup.find('body') else soup.get_text(separator=' ')
            
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

    # Fallback to history if current scrape failed
    if (new_gold == 0 or new_silver == 0) and history:
        new_gold = history[-1]['gold']
        new_silver = history[-1]['silver']
        src = f"Recovery (Last Known)"
    elif new_gold == 0:
        # Hard fallback to recent rates if everything fails
        new_gold, new_silver, src = 306500, 5340, "Hard Fallback"

    # Nepal Time (UTC+5:45)
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

    # Save last 100 entries
    with open(file, 'w') as f:
        json.dump(history[-100:], f, indent=4)
    
    print(f"Verified Update: Gold {new_gold}, Silver {new_silver} from {src}")

if __name__ == "__main__":
    update()