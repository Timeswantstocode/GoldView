import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup

def get_last_known_prices(file_path):
    """Retrieves the most recent data from your JSON file so we don't use old fallbacks."""
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                history = json.load(f)
                if history:
                    last = history[-1]
                    return last['gold'], last['silver']
    except:
        pass
    return 304700, 5600  # Only used if the JSON file is totally empty

def get_live_prices(last_g, last_s):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    }
    
    # Start with last known prices
    gold, silver, status = last_g, last_s, "Last Known (Carry Over)"
    
    try:
        r = requests.get("https://www.fenegosida.org/", headers=headers, timeout=30)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            rows = soup.find_all('tr')
            
            for row in rows:
                text = row.get_text(separator=' ').lower().replace(',', '')
                # Find all numbers (including decimals) and clean them
                nums = [int(float(n)) for n in re.findall(r'\b\d+(?:\.\d+)?\b', text)]
                
                if "fine gold" in text:
                    # Filter for gold: usually > 150k for 10g or Tola
                    valid_gold = [n for n in nums if 150000 < n < 500000]
                    if valid_gold:
                        gold = max(valid_gold) # Always take Tola (highest)
                        status = "FENEGOSIDA Official"
                
                if "silver" in text:
                    # Filter for silver: ignore purity (999), look for price per Tola/10g
                    valid_silver = [n for n in nums if 3500 < n < 15000]
                    if valid_silver:
                        silver = max(valid_silver) # Always take Tola (highest)
                        status = "FENEGOSIDA Official"
    except Exception as e:
        print(f"Scrape Error: {e}")
        
    return gold, silver, status

def update():
    file = 'data.json'
    
    # 1. Get previous prices in case the website is down today
    last_g, last_s = get_last_known_prices(file)
    
    # 2. Try to get live prices
    gold, silver, src = get_live_prices(last_g, last_s)
    
    # 3. Handle History
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: history = []
    else: history = []

    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"), 
        "gold": gold, 
        "silver": silver, 
        "source": src
    }

    # Only update/append if we have valid data
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    # 4. Save and keep rolling 90 days
    with open(file, 'w') as f:
        json.dump(history[-90:], f, indent=4)
    
    print(f"Update: Gold {gold}, Silver {silver} via {src}")

if __name__ == "__main__":
    update()