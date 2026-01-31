import requests
from bs4 import BeautifulSoup
import json
import datetime
import os

def get_gold_prices():
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    }
    
    # Placeholder for prices
    gold_price = 0
    silver_price = 0
    source = "Unknown"

    # 1. Try FENEGOSIDA (Official)
    try:
        r = requests.get("https://www.fenegosida.org/", headers=headers, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        # Logic to find price in their specific table
        gold_price = int(soup.find(id="f-gold-hallmark").text.replace(',', ''))
        silver_price = int(soup.find(id="f-silver").text.replace(',', ''))
        source = "FENEGOSIDA"
    except:
        # 2. Try Fallback: Global API with Nepal Formula
        try:
            # MetalPriceAPI (Replace with your API key if you have one)
            r = requests.get("https://api.metalpriceapi.com/v1/latest?api_key=YOUR_KEY&base=USD&currencies=XAU,XAG", timeout=10)
            data = r.json()
            # 2026 Formula Logic
            # (Intl Price per Oz / 31.1035) * 11.6638 * 1.10 (Duty) * 1.01 (Margin)
            usd_to_npr = 135 # Estimated exchange rate
            gold_oz_usd = data['rates']['XAU']
            gold_price = round(((gold_oz_usd / 31.1035) * 11.6638 * 1.10 * usd_to_npr) * 1.01)
            
            silver_oz_usd = data['rates']['XAG']
            silver_price = round(((silver_oz_usd / 31.1035) * 11.6638 * 1.10 * usd_to_npr) * 1.01)
            source = "Global API (Calculated)"
        except:
            source = "Manual Entry/Error"

    return gold_price, silver_price, source

# Data Persistence Logic
def update_data():
    gold, silver, src = get_gold_prices()
    
    # Prevent saving 0 if scraping fails
    if gold == 0: return

    file_path = 'data.json'
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            history = json.load(f)
    else:
        history = []

    new_entry = {
        "date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "gold": gold,
        "silver": silver,
        "source": src
    }

    # Only add if date is different or history is empty
    if not history or history[-1]['date'] != new_entry['date']:
        history.append(new_entry)

    # Keep only last 30 entries
    history = history[-30:]

    with open(file_path, 'w') as f:
        json.dump(history, f, indent=4)

if __name__ == "__main__":
    update_data()