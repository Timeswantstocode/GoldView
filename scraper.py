import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime

# Global Settings (2026 Nepal Policy)
API_KEY = '27882472c556bcacfdfb6062bb99771d'
TOLA_GRAMS = 11.6638
OZ_TO_GRAMS = 31.1035
DUTY_RATE = 1.10     # 10% Custom Duty multiplier
FIXED_MARGIN = 1000  # Bank & Federation Margin (NPR)

def fetch_api_fallback():
    print("Trying API with Formula: ((Intl/31.1035)*11.6638*Rate)*1.10 + Margins")
    try:
        url = f"https://api.metalpriceapi.com/v1/latest?api_key={API_KEY}&base=NPR&currencies=XAU,XAG"
        res = requests.get(url, timeout=10).json()
        
        rates = res.get('rates', {})
        gold_intl = rates.get('NPRXAU')
        silver_intl = rates.get('NPRXAG')

        def apply_nepal_formula(spot_price):
            # Formula: ((Price / 31.1035) * 11.6638) * 1.10 + Margin
            base_tola = (spot_price / OZ_TO_GRAMS) * TOLA_GRAMS
            nepal_price = (base_tola * DUTY_RATE) + FIXED_MARGIN
            return int(nepal_price)

        return apply_nepal_formula(gold_intl), apply_nepal_formula(silver_intl), "Global API (Formula Applied)"
    except Exception as e:
        print(f"API Error: {e}")
        return 339300, 7505, "System Cache"

def scrape():
    headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'}
    
    # 1. PRIMARY: FENEGOSIDA (Official)
    try:
        print("Scraping FENEGOSIDA Official...")
        res = requests.get('https://www.fenegosida.org.np/', headers=headers, timeout=15)
        soup = BeautifulSoup(res.text, 'html.parser')
        text = soup.get_text()
        
        # Looking for Fine Gold and Silver rates
        gold = re.search(r'Fine Gold.*?Rs\.\s*([\d,]+)', text, re.DOTALL).group(1)
        silver = re.search(r'Silver.*?Rs\.\s*([\d,]+)', text, re.DOTALL).group(1)
        return int(gold.replace(',', '')), int(silver.replace(',', '')), "FENEGOSIDA Official"
    except Exception as e:
        print(f"FENEGOSIDA failed: {e}")

    # 2. SECONDARY: Ashesh
    try:
        print("Scraping Ashesh...")
        res = requests.get('https://www.ashesh.com.np/gold/', headers=headers, timeout=10)
        text = BeautifulSoup(res.text, 'html.parser').get_text()
        gold = re.search(r'Fine gold 9999.*?([\d,]+)', text, re.DOTALL).group(1)
        silver = re.search(r'Silver.*?([\d,]+)', text, re.DOTALL).group(1)
        return int(gold.replace(',', '')), int(silver.replace(',', '')), "Ashesh.com"
    except:
        print("Ashesh failed.")

    # 3. FALLBACK: API Formula
    return fetch_api_fallback()

if __name__ == "__main__":
    g, s, src = scrape()
    data = {"gold": g, "silver": s, "source": src, "date": datetime.now().isoformat()}
    with open('data.json', 'w') as f:
        json.dump(data, f)
    print(f"Update Finished: {src}")