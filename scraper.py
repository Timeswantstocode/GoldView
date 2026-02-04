import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup

def get_live_prices():
    # Chrome-like headers to look like a real browser
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://www.google.com/'
    }
    
    # Default fallbacks (What you'll see if scraping fails)
    gold, silver, source = 304700, 5600, "Market Fallback"
    
    try:
        # 1. Fetch the page
        response = requests.get("https://www.fenegosida.org/", headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"Error: Website returned status {response.status_code}")
            return gold, silver, source

        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script/style tags so we don't scrape code by accident
        for script in soup(["script", "style"]):
            script.decompose()

        # 2. Get all rows or list items that might contain prices
        # We search for "Fine Gold" and "Silver" specifically
        content = soup.get_text(separator='|') # Use a separator to keep numbers distinct
        lines = content.split('|')

        found_gold_list = []
        found_silver_list = []

        for i, line in enumerate(lines):
            clean_line = line.lower().strip()
            
            # Look for Gold row
            if "fine gold" in clean_line:
                # Look at the next few "cells" for the price
                context = "".join(lines[i:i+5]).replace(',', '')
                prices = re.findall(r'\b\d{5,6}\b', context)
                if prices:
                    found_gold_list.append(int(prices[-1])) # Tola is usually the last number in the row

            # Look for Silver row
            if "silver" in clean_line and "fine" not in clean_line:
                context = "".join(lines[i:i+5]).replace(',', '')
                # Silver is usually 4 digits (e.g., 5600)
                prices = re.findall(r'\b\d{4,5}\b', context)
                # Filter out 999 or 9999 (purity)
                valid_silver = [int(p) for p in prices if 3000 < int(p) < 15000]
                if valid_silver:
                    found_silver_list.append(valid_silver[-1])

        # 3. Final Selection
        if found_gold_list:
            gold = max(found_gold_list)
            source = "FENEGOSIDA Official"
        
        if found_silver_list:
            # Pick the most likely silver price
            silver = found_silver_list[0]

    except Exception as e:
        print(f"Scraper encountered a major error: {e}")
        
    return gold, silver, source

def update():
    gold, silver, src = get_live_prices()
    file = 'data.json'
    
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: history = []
    else: history = []

    # Nepal Time (UTC+5:45)
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"), 
        "gold": gold, 
        "silver": silver, 
        "source": src
    }

    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    with open(file, 'w') as f:
        json.dump(history[-30:], f, indent=4)
    
    print(f"Result -> Gold: {gold}, Silver: {silver}, Source: {src}")

if __name__ == "__main__":
    update()