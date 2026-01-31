import requests
from bs4 import BeautifulSoup
import json
import datetime
import os
import re

def get_gold_prices():
    headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'}
    gold, silver, source = 318800, 7065, "Static Fallback"
    try:
        r = requests.get("https://www.fenegosida.org/", headers=headers, timeout=20)
        soup = BeautifulSoup(r.text, 'html.parser')
        text = soup.get_text()
        
        # Look for "Hallmark Gold" or "Fine Gold" and the 6-digit number near it
        g_match = re.findall(r'(\d{5,6})', text)
        for val in g_match:
            if 300000 < int(val) < 350000: # Reality check for 2026 prices
                gold = int(val)
                source = "FENEGOSIDA Official"
                break
        
        # Look for Silver
        s_match = re.findall(r'(\d{4})', text)
        for val in s_match:
            if 6000 < int(val) < 8000: # Reality check for Silver Tola
                silver = int(val)
                break
    except: pass
    return gold, silver, source

def update_data():
    gold, silver, src = get_gold_prices()
    file_path = 'data.json'
    history = []
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            try: history = json.load(f)
            except: pass

    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    new_entry = {"date": now.strftime("%Y-%m-%d %H:%M"), "gold": gold, "silver": silver, "source": src}
    
    if not history or history[-1]['gold'] != gold:
        history.append(new_entry)
    else:
        history[-1]['date'] = new_entry['date']

    with open(file_path, 'w') as f:
        json.dump(history[-30:], f, indent=4)

if __name__ == "__main__":
    update_data()