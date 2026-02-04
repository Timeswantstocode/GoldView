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
        r = requests.get("https://www.fenegosida.org/", headers=headers, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')

        rows = soup.find_all('tr')
        
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 2: continue
            
            row_text = row.get_text().lower()
            
            row_nums = []
            for cell in cells:
                raw_val = cell.get_text().strip()
                # FIX: Split by decimal first so "5,600.00" becomes "5,600"
                val_no_decimal = raw_val.split('.')[0]
                # Now remove commas
                clean_val = re.sub(r'[^\d]', '', val_no_decimal)
                
                if clean_val.isdigit() and len(clean_val) >= 4:
                    row_nums.append(int(clean_val))

            # GOLD: Tola price is the highest in the 'fine gold' row
            if "fine gold" in row_text:
                if row_nums:
                    gold = max(row_nums)
                    status = "FENEGOSIDA Official"

            # SILVER: Tola price (5600) vs 10g price (4801)
            if "silver" in row_text:
                valid_silver = [n for n in row_nums if 3500 < n < 15000]
                if valid_silver:
                    silver = max(valid_silver)
                    status = "FENEGOSIDA Official"

    except Exception as e:
        print(f"Scrape error: {e}")

    return gold, silver, status

def update():
    file = 'data.json'
    new_gold, new_silver, src = get_live_prices()
    
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: history = []
    else:
        history = []

    # CARRY OVER LOGIC (Only if Scrape Failed)
    if (new_gold == 0 or new_silver == 0) and history:
        new_gold = history[-1]['gold']
        new_silver = history[-1]['silver']
        src = "Last Known (Carry Over)"
    elif new_gold == 0 or new_silver == 0:
        new_gold, new_silver, src = 304700, 5600, "Fallback"

    # TIME HANDLING (Nepal +5:45)
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": new_gold,
        "silver": new_silver,
        "source": src
    }

    if history and history[-1]['date'].startswith(today_str):
        # Update existing entry for today
        history[-1] = new_entry
    else:
        # Append new entry for a new day
        history.append(new_entry)

    with open(file, 'w') as f:
        json.dump(history, f, indent=4)
    
    print(f"Verified: Gold {new_gold}, Silver {new_silver} ({src})")

if __name__ == "__main__":
    update()