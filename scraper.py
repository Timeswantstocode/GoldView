import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup

def get_live_prices():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    # Default fallbacks
    gold, silver, source = 304700, 5600, "Market Fallback"
    
    try:
        r = requests.get("https://www.fenegosida.org/", headers=headers, timeout=25)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')

        # Find all table rows - FENEGOSIDA puts prices in rows (tr)
        rows = soup.find_all('tr')
        
        extracted_gold = []
        extracted_silver = []

        for row in rows:
            row_text = row.get_text().lower()
            
            # Use regex to find numbers in this specific row
            # This handles commas and suffixes automatically
            nums = re.findall(r'(\d[\d,.]*)', row.get_text())
            clean_nums = []
            for n in nums:
                clean_n = n.replace(',', '').split('.')[0] # Remove commas and decimals
                if clean_n.isdigit():
                    clean_nums.append(int(clean_n))

            if not clean_nums:
                continue

            # Context-based matching: Is this row talking about Gold or Silver?
            if "gold" in row_text and "fine" in row_text:
                # Usually: [10_gram_price, tola_price]
                # We want the highest one in this row (Tola)
                extracted_gold.append(max(clean_nums))
            
            if "silver" in row_text:
                # Usually: [10_gram_price, tola_price]
                # We filter for numbers that look like silver prices
                valid_silver = [n for n in clean_nums if 3000 < n < 15000]
                if valid_silver:
                    extracted_silver.append(max(valid_silver))

        # Final Assignment
        if extracted_gold:
            gold = max(extracted_gold)
            source = "FENEGOSIDA Official"
        
        if extracted_silver:
            # We take the FIRST valid silver price found in a "Silver" row
            # to avoid picking up 9999 (purity) or other footer numbers
            silver = extracted_silver[0]

    except Exception as e:
        print(f"Scrape failed: {e}")
        
    return gold, silver, source

def update():
    gold, silver, src = get_live_prices()
    file = 'data.json'
    
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: history = []
    else: history = []

    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {"date": now.strftime("%Y-%m-%d %H:%M"), "gold": gold, "silver": silver, "source": src}

    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    with open(file, 'w') as f:
        json.dump(history[-30:], f, indent=4)
    
    print(f"Success: Gold {gold}, Silver {silver}")

if __name__ == "__main__":
    update()