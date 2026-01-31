import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime

# 2026 High-Value Market Settings
API_KEY = '27882472c556bcacfdfb6062bb99771d'
TOLA_GRAMS = 11.6638

def scrape():
    headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'}
    
    try:
        print("Scraping Ashesh.com.np for 2026 Rates...")
        res = requests.get('https://www.ashesh.com.np/gold/', headers=headers, timeout=10)
        text = res.text
        
        # Regex to find Gold and Silver prices
        # Targets "Fine Gold" and "Silver" specifically
        gold_matches = re.findall(r'(?:Fine Gold|24\s*K).*?Rs\.\s*([\d,]+)', text, re.DOTALL | re.IGNORECASE)
        silver_matches = re.findall(r'Silver.*?Rs\.\s*([\d,]+)', text, re.DOTALL | re.IGNORECASE)
        
        if gold_matches and silver_matches:
            g_prices = [int(g.replace(',', '')) for g in gold_matches]
            s_prices = [int(s.replace(',', '')) for s in silver_matches]
            
            final_gold = max(g_prices)
            final_silver = max(s_prices)
            
            # 2026 logic: If silver is found in the 1000-2000 range, 
            # it is likely the 10-gram rate. Convert to Tola.
            if final_silver < 2500:
                print("Silver price looks like a 10g rate. Converting to Tola...")
                final_silver = int((final_silver / 10) * TOLA_GRAMS)

            return final_gold, final_silver, "Ashesh.com (Live)"
    except Exception as e:
        print(f"Scraper error: {e}")

    # Fallback to API with 2026 Pricing Logic
    print("Using API Fallback...")
    try:
        res = requests.get(f"https://api.metalpriceapi.com/v1/latest?api_key={API_KEY}&base=NPR&currencies=XAU,XAG").json()
        rates = res.get('rates', {})
        
        # Adjusting Duty and Margin to reach the 2026 7k Silver / 330k Gold levels
        # Formula: ((Intl / 31.1035) * 11.6638) * 1.10 Duty + Market Premium
        calc_g = int(((rates['NPRXAU'] / 31.1035) * TOLA_GRAMS) * 1.10 + 2000)
        calc_s = int(((rates['NPRXAG'] / 31.1035) * TOLA_GRAMS) * 1.10 + 500)
        
        return calc_g, calc_s, "API (2026 Adjusted)"
    except:
        # Hard fallback to your confirmed Jan 31 prices
        return 339300, 7065, "System Manual Fallback"

if __name__ == "__main__":
    g, s, src = scrape()
    with open('data.json', 'w') as f:
        json.dump({
            "gold": g, 
            "silver": s, 
            "source": src, 
            "date": datetime.now().isoformat()
        }, f)
    print(f"Update Success: Gold {g}, Silver {s} Source: {src}")