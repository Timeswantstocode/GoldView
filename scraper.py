import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
import urllib3

# Suppress SSL warnings for FENEGOSIDA
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_candidates(url, metal):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'}
    
    # 1. THE ULTIMATE BLACKLIST
    # Purity levels
    purity = [999, 9999, 9990, 9167, 9583, 916, 750]
    # Conversion weights (1 Tola = 11.66g)
    weights = [1166, 11664, 10, 100, 11]
    # Known Phone/Office Numbers (from FENEGOSIDA footer)
    office_nums = [453227, 453228, 4532270]
    # Calendar Years (Covers 2000-2100 for both AD and BS)
    years = list(range(2000, 2101))
    
    blacklist = set(purity + weights + office_nums + years)
    
    try:
        r = requests.get(url, headers=headers, timeout=25, verify=False)
        r.raise_for_status()
        
        # Clean text: remove commas and merge Rupee symbol gaps (e.g. 306 रु 500)
        raw_html = r.text.replace(',', '')
        raw_html = re.sub(r'(\d+)\s*रु\s*(\d+)', r'\1\2', raw_html)
        
        soup = BeautifulSoup(raw_html, 'html.parser')
        # Remove junk tags that contain irrelevant numbers
        for junk in soup(["script", "style", "footer", "header"]):
            junk.decompose()
            
        content = soup.get_text(separator=' ')

        # 2. PROXIMITY ANCHOR LOGIC
        # We look for a price ONLY if it follows a keyword within 50 characters.
        # This prevents picking up dates from the top or phone numbers from the bottom.
        if metal == "gold":
            # Focus on 6-digit numbers near "Fine" or "Tola"
            pattern = r"(?:FINE|Hallmark|Tola|छापावाल).{0,50}?(\d{6})"
            min_p, max_p = 100000, 1000000
        else:
            # Focus on 4-5 digit numbers near "Silver" or "Tola"
            pattern = r"(?:SILVER|Tola|चाँदी).{0,50}?(\d{4,5})"
            min_p, max_p = 2000, 50000

        matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
        
        # 3. Validation
        valid = []
        for m in matches:
            val = int(m)
            if val in blacklist:
                continue
            if min_p <= val <= max_p:
                valid.append(val)
        
        return valid
    except:
        return []

def update():
    file = 'data.json'
    
    # Scrape both
    f_gold = get_candidates("https://fenegosida.org/", "gold")
    f_silver = get_candidates("https://fenegosida.org/", "silver")
    a_gold = get_candidates("https://www.ashesh.com.np/gold/", "gold")
    a_silver = get_candidates("https://www.ashesh.com.np/gold/", "silver")

    # LOG FINDINGS (Check these in your GitHub Actions Log)
    print(f"DEBUG - FENEGOSIDA: Gold {f_gold}, Silver {f_silver}")
    print(f"DEBUG - Ashesh: Gold {a_gold}, Silver {a_silver}")

    # COMBINE & PICK MAX (Guarantees Tola price over 10g price)
    all_gold = f_gold + a_gold
    all_silver = f_silver + a_silver
    
    final_gold = max(all_gold) if all_gold else 0
    final_silver = max(all_silver) if all_silver else 0

    # PRIORITY SOURCE LOGIC
    source_info = "None"
    if final_gold > 0:
        if final_gold in f_gold:
            source_info = "FENEGOSIDA" # Priority
        else:
            source_info = "Ashesh (Backup)"

    # RECOVERY FROM JSON
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: pass

    if (final_gold == 0 or final_silver == 0) and history:
        final_gold = final_gold or history[-1]['gold']
        final_silver = final_silver or history[-1]['silver']
        source_info = f"Recovery (Last Known)"

    # TIME SETUP
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": final_gold,
        "silver": final_silver,
        "source": source_info
    }

    # Update or Append
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    with open(file, 'w') as f:
        json.dump(history[-100:], f, indent=4)
    
    print(f"SUCCESS: Gold {final_gold}, Silver {final_silver} via {source_info}")

if __name__ == "__main__":
    update()