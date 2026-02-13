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
    
    # Blacklist non-price numbers
    purity = [999, 9999, 9990, 9167, 9583, 916, 750]
    weights = [1166, 11664]
    office_nums = [453227, 453228, 4532270]
    years = list(range(2000, 2101))
    blacklist = set(purity + weights + office_nums + years)
    
    try:
        r = requests.get(url, headers=headers, timeout=25, verify=False)
        r.raise_for_status()
        
        # Merge split Rupee symbols
        raw_html = r.text.replace(',', '')
        raw_html = re.sub(r'(\d+)\s*रु\s*(\d+)', r'\1\2', raw_html)
        
        soup = BeautifulSoup(raw_html, 'html.parser')
        # Filter out junk
        for junk in soup(["script", "style", "footer", "header"]):
            junk.decompose()
            
        content = soup.get_text(separator=' ')

        if metal == "gold":
            # Gold range: 150k to 1M
            pattern = r"(?:FINE|Hallmark|Tola|छापावाल).{0,50}?(\d{6})"
            min_p, max_p = 150000, 1000000
        else:
            # Silver range: 2k to 15k (Prevents picking up partial gold prices like 30350)
            pattern = r"(?:SILVER|Tola|चाँदी).{0,50}?(\d{4,5})"
            min_p, max_p = 2000, 15000

        matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
        
        # Fallback to raw numbers if no keywords found
        if not matches:
            raw_p = r"(\d{6})" if metal == "gold" else r"(\d{4,5})"
            matches = re.findall(raw_p, content)

        valid = []
        for m in matches:
            val = int(m)
            if val in blacklist: continue
            if min_p <= val <= max_p:
                valid.append(val)
        
        return valid
    except:
        return []

def update():
    file = 'data.json'
    
    # 1. Scrape Candidates
    f_gold = get_candidates("https://fenegosida.org/", "gold")
    f_silver = get_candidates("https://fenegosida.org/", "silver")
    a_gold = get_candidates("https://www.ashesh.com.np/gold/", "gold")
    a_silver = get_candidates("https://www.ashesh.com.np/gold/", "silver")

    # 2. Log Findings
    print(f"DEBUG - FENEGOSIDA: Gold {f_gold}, Silver {f_silver}")
    print(f"DEBUG - Ashesh: Gold {a_gold}, Silver {a_silver}")

    # 3. Combine and pick Max
    # Max rule ensures we get Tola price over 10g price
    all_gold = f_gold + a_gold
    all_silver = f_silver + a_silver
    
    final_gold = max(all_gold) if all_gold else 0
    
    # Safety Check: Remove any Silver candidates that look like partial Gold prices
    if final_gold > 0:
        partial_gold = final_gold // 10
        all_silver = [s for s in all_silver if s != partial_gold]

    final_silver = max(all_silver) if all_silver else 0

    # 4. Source Priority (FENEGOSIDA primary)
    source_info = "None"
    if final_gold > 0:
        if final_gold in f_gold:
            source_info = "FENEGOSIDA"
        else:
            source_info = "Ashesh (Backup)"

    # 5. Recovery
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: pass

    if (final_gold == 0 or final_silver == 0) and history:
        final_gold = final_gold or history[-1]['gold']
        final_silver = final_silver or history[-1]['silver']
        source_info = f"Recovery (Last Known)"

    # 6. Save
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": final_gold,
        "silver": final_silver,
        "source": source_info
    }

    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    with open(file, 'w') as f:
        json.dump(history[-100:], f, indent=4)
    
    print(f"SUCCESS: Gold {final_gold}, Silver {final_silver} via {source_info}")

if __name__ == "__main__":
    update()