import requests
from bs4 import BeautifulSoup
import json
import datetime
import os
import re

def get_gold_prices():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    }
    
    # Current values as seen on the website today
    gold_price = 318800
    silver_price = 7065
    source = "FENEGOSIDA Official"

    try:
        print("Connecting to https://www.fenegosida.org/ ...")
        r = requests.get("https://www.fenegosida.org/", headers=headers, timeout=20)
        soup = BeautifulSoup(r.text, 'html.parser')
        text_content = soup.get_text()
        
        # Regex to find gold price per 1 tola specifically
        # Pattern looks for "FINE GOLD (9999)" followed by "per 1 tola" and then the price
        gold_match = re.search(r'FINE GOLD\s*\(9999\)\s*per\s*1\s*tola.*?(\d{5,6})', text_content, re.S | re.I)
        if gold_match:
            gold_price = int(gold_match.group(1))
            print(f"Scraped Gold Price (1 Tola): {gold_price}")

        # Regex for silver price per 1 tola
        silver_match = re.search(r'SILVER\s*per\s*1\s*tola.*?(\d{4,5})', text_content, re.S | re.I)
        if silver_match:
            silver_price = int(silver_match.group(1))
            print(f"Scraped Silver Price (1 Tola): {silver_price}")

    except Exception as e:
        print(f"Error during scraping: {e}")
        source = "FENEGOSIDA (Static Fallback)"

    return gold_price, silver_price, source

def update_data():
    gold, silver, src = get_gold_prices()
    file_path = 'data.json'
    
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            try: 
                history = json.load(f)
            except: 
                history = []
    else:
        history = []

    # Get Nepal Time (UTC + 5:45)
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": gold,
        "silver": silver,
        "source": src
    }

    # Only add to history if the price changed
    if history and history[-1]['gold'] == gold and history[-1]['silver'] == silver:
        history[-1]['date'] = new_entry['date']
        history[-1]['source'] = src
    else:
        history.append(new_entry)

    # Maintain a 30-day window
    history = history[-30:]

    with open(file_path, 'w') as f:
        json.dump(history, f, indent=4)
    print(f"Final Data Saved: Gold {gold}, Silver {silver}")

if __name__ == "__main__":
    update_data()
