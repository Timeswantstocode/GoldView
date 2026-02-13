import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup

def extract_price_from_text(text, metal_type):
    """
    Uses Regex to find numbers formatted like 150,000 or 150000 
    near keywords like 'Gold' or 'Silver'.
    """
    # 1. Define search patterns based on metal
    if metal_type == "gold":
        keywords = r"(?:Fine Gold|Gold|छापावाल सुन|सुन)"
        min_val, max_val = 100000, 500000
    else:
        keywords = r"(?:Silver|चाँदी)"
        min_val, max_val = 1000, 10000

    # 2. Look for the keyword, then find the first number within 100 characters of it
    # This pattern handles commas (150,000) and decimals (150000.00)
    pattern = keywords + r".{0,100}?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)"
    
    matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
    
    valid_prices = []
    for m in matches:
        clean_num = int(float(m.replace(',', '')))
        if min_val <= clean_num <= max_val:
            valid_prices.append(clean_num)
    
    return max(valid_prices) if valid_prices else 0

def get_live_prices():
    sources = [
        {
            "name": "FENEGOSIDA Official",
            "url": "https://www.fenegosida.org/",
            "timeout": 20
        },
        {
            "name": "Hamro Patro (Backup)",
            "url": "https://www.hamropatro.com/gold",
            "timeout": 20
        }
    ]

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }

    for source in sources:
        try:
            print(f"Attempting to scrape from: {source['name']}...")
            r = requests.get(source['url'], headers=headers, timeout=source['timeout'])
            r.raise_for_status()
            
            # Clean up the text: remove scripts/styles and collapse whitespace
            soup = BeautifulSoup(r.text, 'html.parser')
            for script in soup(["script", "style"]):
                script.decompose()
            full_text = soup.get_text(separator=' ')
            
            gold = extract_price_from_text(full_text, "gold")
            silver = extract_price_from_text(full_text, "silver")

            if gold > 0 and silver > 0:
                return gold, silver, source['name']
        except Exception as e:
            print(f"Source {source['name']} failed: {e}")
            continue # Try next source

    return 0, 0, "All Sources Failed"

def update():
    file = 'data.json'
    new_gold, new_silver, src = get_live_prices()
    
    # Load history
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f:
                history = json.load(f)
        except:
            pass

    # Carry over logic if scraping failed
    if (new_gold == 0 or new_silver == 0) and history:
        new_gold = history[-1]['gold']
        new_silver = history[-1]['silver']
        src = f"Carry Over ({src})"
    elif new_gold == 0:
        # Emergency Hardcoded values if even the file is missing
        new_gold, new_silver, src = 304500, 5200, "Emergency Fallback"

    # Set Nepal Time (+5:45)
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": new_gold,
        "silver": new_silver,
        "source": src
    }

    # Update today's entry if it exists, otherwise append
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    # Keep only last 30 days to prevent the file from getting too large
    history = history[-30:]

    with open(file, 'w') as f:
        json.dump(history, f, indent=4)
    
    print(f"Update Successful: Gold {new_gold}, Silver {new_silver} from {src}")

if __name__ == "__main__":
    update()