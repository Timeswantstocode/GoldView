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
    
    # Return 0, 0 if scrape fails so the update function knows to use "Last Known"
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
            
            # Extract numbers from each cell individually to avoid merging them
            row_nums = []
            for cell in cells:
                # Remove commas and non-digits
                val = re.sub(r'[^\d]', '', cell.get_text())
                if val.isdigit() and len(val) >= 4:
                    row_nums.append(int(val))

            # GOLD: Tola price (304k) is always higher than 10g price (~261k)
            if "fine gold" in row_text:
                if row_nums:
                    gold = max(row_nums)
                    status = "FENEGOSIDA Official"

            # SILVER: Tola price (5600) is always higher than 10g price (4801)
            # Filter range: 3500-15000 (Ignores 999 purity and phone numbers)
            if "silver" in row_text:
                valid_silver = [n for n in row_nums if 3500 < n < 15000]
                if valid_silver:
                    silver = max(valid_silver)
                    status = "FENEGOSIDA Official"

    except Exception as e:
        print(f"Scrape attempt failed: {e}")

    return gold, silver, status

def update():
    file = 'data.json'
    
    # 1. Try to get new data
    new_gold, new_silver, src = get_live_prices()
    
    # 2. Load the entire history
    if os.path.exists(file):
        try:
            with open(file, 'r') as f:
                history = json.load(f)
        except:
            history = []
    else:
        history = []

    # 3. SELF-HEALING CARRY OVER
    # If the website is down (0) or data is missing, use the last entry in the file
    if (new_gold == 0 or new_silver == 0) and history:
        new_gold = history[-1]['gold']
        new_silver = history[-1]['silver']
        src = "Last Known (Carry Over)"
    elif new_gold == 0 or new_silver == 0:
        # Only happens if JSON is empty AND website is down
        new_gold, new_silver, src = 304700, 5600, "Emergency Fallback"

    # 4. Handle Time (Nepal UTC +5:45)
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": new_gold,
        "silver": new_silver,
        "source": src
    }

    # 5. Update logic
    # If today's entry already exists, update it. Otherwise, add a new one.
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    # 6. Save EVERYTHING (Removed the [-90:] limit)
    with open(file, 'w') as f:
        json.dump(history, f, indent=4)
    
    print(f"Updated: Gold {new_gold}, Silver {new_silver} ({src})")

if __name__ == "__main__":
    update()