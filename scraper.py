import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

# Configuration
API_KEY = '27882472c556bcacfdfb6062bb99771d'
TOLA_GRAMS = 11.6638
DUTY_RATE = 0.10  # 10% Custom Duty
BANK_MARGIN = 0.005 # 0.5% Bank Commission

def get_api_fallback():
    print("Trying API Fallback...")
    url = f"https://api.metalpriceapi.com/v1/latest?api_key={API_KEY}&base=NPR&currencies=XAU,XAG"
    res = requests.get(url).json()
    
    # Math: (Spot / Oz_to_Grams) * Tola_Grams * Duty * Margin
    gold_intl = res['rates']['NPRXAU']
    silver_intl = res['rates']['NPRXAG']
    
    calc_gold = (gold_intl / 31.1035) * TOLA_GRAMS * (1 + DUTY_RATE) * (1 + BANK_MARGIN)
    calc_silver = (silver_intl / 31.1035) * TOLA_GRAMS * (1 + DUTY_RATE) * (1 + BANK_MARGIN)
    
    return int(calc_gold), int(calc_silver), "API (Duty Adjusted)"

def scrape():
    headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'}
    
    # 1. Try Hamro Patro
    try:
        print("Trying Hamro Patro...")
        res = requests.get('https://www.hamropatro.com/gold', headers=headers, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        gold = soup.find('div', string='Gold Hallmark - tola').find_next_sibling('div').text
        silver = soup.find('div', string='Silver - tola').find_next_sibling('div').text
        return int(float(gold.replace('Nrs.', '').replace(',', '').strip())), int(float(silver.replace('Nrs.', '').replace(',', '').strip())), "Hamro Patro"
    except:
        print("Hamro Patro failed.")

    # 2. Try Ashesh
    try:
        print("Trying Ashesh...")
        res = requests.get('https://www.ashesh.com.np/gold/', headers=headers, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        # Ashesh uses specific IDs/Classes, usually contains text like "Fine Gold (24 K) Rs. 168,000"
        text = soup.get_text()
        import re
        gold_val = re.search(r'Fine Gold.*?Rs\.\s*([\d,]+)', text).group(1)
        silver_val = re.search(r'Silver.*?Rs\.\s*([\d,]+)', text).group(1)
        return int(gold_val.replace(',', '')), int(silver_val.replace(',', '')), "Ashesh.com"
    except:
        print("Ashesh failed.")

    # 3. Last Resort: API
    return get_api_fallback()

if __name__ == "__main__":
    g, s, src = scrape()
    result = {
        "gold": g,
        "silver": s,
        "source": src,
        "date": datetime.now().isoformat()
    }
    with open('data.json', 'w') as f:
        json.dump(result, f)
    print(f"Success: {src}")
