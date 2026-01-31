import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup

def clean_price(text):
    """
    Extracts the first valid integer from a string.
    e.g., "Rs 1,45,000/-" -> 145000
    """
    # Remove commas and non-digit characters (except numbers)
    # This regex finds a sequence of digits that might be separated by commas
    match = re.search(r'(\d{1,3}(,\d{3})*|\d+)', text)
    if match:
        # Remove commas and convert to int
        clean_str = match.group(0).replace(',', '')
        return int(clean_str)
    return None

def get_live_prices():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Default fallback values
    gold, silver, source = 318800, 7065, "Market Fallback"
    
    try:
        r = requests.get("https://www.fenegosida.org/", headers=headers, timeout=20)
        r.raise_for_status() # Raises error if site is down (404/500)
        
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # --- LOGIC UPGRADE: Search by Keyword, not just random numbers ---
        
        # 1. Find the Gold Section
        # We look for the text "Fine Gold" (case insensitive)
        gold_label = soup.find(string=re.compile("Fine Gold", re.I))
        if gold_label:
            # Usually the price is in the parent div or the next sibling
            # We grab the text of the parent container to be safe
            container_text = gold_label.find_parent().get_text()
            extracted_gold = clean_price(container_text)
            
            # Validation: Verify it is a realistic price (e.g., > 1 Lakh)
            if extracted_gold and 100000 < extracted_gold < 500000:
                gold = extracted_gold
                source = "FENEGOSIDA Official"

        # 2. Find the Silver Section
        silver_label = soup.find(string=re.compile("Silver", re.I))
        if silver_label:
            container_text = silver_label.find_parent().get_text()
            extracted_silver = clean_price(container_text)
            
            if extracted_silver and 1000 < extracted_silver < 20000:
                silver = extracted_silver

    except Exception as e:
        print(f"Scraping Error: {e}")
        # We stick to the fallback values defined at the top
        pass

    return gold, silver, source

def update():
    gold, silver, src = get_live_prices()
    file = 'data.json'
    
    # --- LOGIC UPGRADE: Safety Check for Corrupt File ---
    history = []
    if os.path.exists(file):
        try:
            # Don't crash if file is empty
            if os.path.getsize(file) > 0: 
                with open(file, 'r') as f: 
                    history = json.load(f)
        except json.JSONDecodeError:
            print("Warning: data.json was corrupted. Starting fresh.")
            history = [] 

    # Nepal Time Logic
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"), 
        "gold": gold, 
        "silver": silver, 
        "source": src
    }

    # Update Logic
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry # Update today's existing entry
    else:
        history.append(new_entry) # Start new day

    # Write Mode (Safe)
    with open(file, 'w') as f:
        json.dump(history[-30:], f, indent=4) # Keep last 30 entries
    
    print(f"Success: Updated {today_str} | Gold: {gold}")

if __name__ == "__main__":
    update()
