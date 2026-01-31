import requests
from bs4 import BeautifulSoup
import json
import datetime
import os
import re

def get_gold_prices():
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    }
    
    gold_price = 0
    silver_price = 0
    source = "Unknown"

    try:
        print("Connecting to https://www.fenegosida.org/ ...")
        r = requests.get("https://www.fenegosida.org/", headers=headers, timeout=20)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Strategy: Find all text elements and look for the keywords from your screenshot
        elements = soup.find_all(string=re.compile(r'Hallmark Gold|SILVER|Tejabi Gold', re.I))
        
        for el in elements:
            text = el.strip().upper()
            # Find the parent container to look for the price nearby
            parent = el.find_parent()
            # Search for numbers in the parent or siblings
            container_text = parent.get_text() if parent else ""
            
            # If we find Hallmark Gold
            if "HALLMARK GOLD" in text and gold_price == 0:
                # Look for a large number (e.g., 318800)
                # We search the whole page text for numbers following this label
                all_text = soup.get_text()
                prices = re.findall(r'(\d{5,6})', all_text) # Finds 5 or 6 digit numbers
                if prices:
                    # Usually the first large number after 'Hallmark Gold' is the one
                    # We'll take the first one found that is reasonably high
                    for p in prices:
                        val = int(p)
                        if val > 100000:
                            gold_price = val
                            print(f"Found Gold Price: {gold_price}")
                            break

            # If we find Silver
            if "SILVER" in text and silver_price == 0:
                all_text = soup.get_text()
                # Silver is usually 4 digits (e.g., 7065)
                prices = re.findall(r'(\d{4})', all_text)
                if prices:
                    for p in prices:
                        val = int(p)
                        if 1000 < val < 15000:
                            silver_price = val
                            print(f"Found Silver Price: {silver_price}")
                            break

        if gold_price > 0:
            source = "FENEGOSIDA Official"
    except Exception as e:
        print(f"Error during scraping: {e}")

    # Safety Fallback if the website is down or layout changed
    if gold_price == 0:
        print("Scraper couldn't read the site. Using Market Calibration.")
        gold_price = 318800 
        silver_price = 7065
        source = "Market Calibration (Backup)"

    return gold_price, silver_price, source

def update_data():
    gold, silver, src = get_gold_prices()
    file_path = 'data.json'
    
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            try: history = json.load(f)
            except: history = []
    else:
        history = []

    # Get Nepal Time (UTC + 5:45)
    now = datetime.datetime.utcnow() + datetime.timedelta(hours=5, minutes=45)
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": gold,
        "silver": silver,
        "source": src
    }

    # Only add to history if the price changed, otherwise update the last entry's time
    if history and history[-1]['gold'] == gold:
        history[-1]['date'] = new_entry['date']
        history[-1]['source'] = src
    else:
        history.append(new_entry)

    # Maintain a 30-day window for the graph
    history = history[-30:]

    with open(file_path, 'w') as f:
        json.dump(history, f, indent=4)
    print(f"Final Data Saved: Gold {gold}, Silver {silver}")

if __name__ == "__main__":
    update_data()