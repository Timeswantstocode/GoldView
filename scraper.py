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
    """
    Scrapes a URL and returns a list of all numbers fitting the criteria.
    """
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'}
    # Blacklist non-price numbers (Purity, weight, years)
    blacklist = [999, 9999, 1166, 11664, 2082, 2083, 2084, 2025, 2026]
    
    try:
        # verify=False is used for FENEGOSIDA's certificate issues
        r = requests.get(url, headers=headers, timeout=25, verify=False)
        r.raise_for_status()
        
        # 1. Clean the text: remove commas and merge Rupee symbol gaps (306 रु 500 -> 306500)
        raw_text = r.text.replace(',', '')
        raw_text = re.sub(r'(\d+)\s*रु\s*(\d+)', r'\1\2', raw_text)
        
        # 2. Extract visible text
        soup = BeautifulSoup(raw_text, 'html.parser')
        content = soup.get_text(separator=' ')

        if metal == "gold":
            pattern = r"(\d{6})" # Target 6-digit numbers
            min_p, max_p = 150000, 600000
        else:
            pattern = r"(\d{4,5})" # Target 4-5 digit numbers
            min_p, max_p = 2000, 20000 # Min 4800 ignores 10-gram price (~4200)

        matches = re.findall(pattern, content)
        valid = [int(m) for m in matches if int(m) not in blacklist and min_p <= int(m) <= max_p]
        return valid
    except Exception as e:
        # Return empty list on failure so the failover logic can kick in
        return []

def update():
    file = 'data.json'
    
    # 1. Scrape Candidates
    f_gold = get_candidates("https://fenegosida.org/", "gold")
    f_silver = get_candidates("https://fenegosida.org/", "silver")
    
    a_gold = get_candidates("https://www.ashesh.com.np/gold/", "gold")
    a_silver = get_candidates("https://www.ashesh.com.np/gold/", "silver")

    # 2. Log findings for GitHub console
    print(f"DEBUG - FENEGOSIDA: Gold {f_gold}, Silver {f_silver}")
    print(f"DEBUG - Ashesh: Gold {a_gold}, Silver {a_silver}")

    # 3. Combine and pick Absolute Maximum
    all_gold = f_gold + a_gold
    all_silver = f_silver + a_silver

    final_gold = max(all_gold) if all_gold else 0
    final_silver = max(all_silver) if all_silver else 0

    # 4. Determine Source (Priority Logic)
    source_info = "Failed"
    if final_gold > 0:
        # If the highest price found exists on FENEGOSIDA, credit them first
        if final_gold in f_gold:
            source_info = "FENEGOSIDA"
        # If it only exists on Ashesh (because FENEGOSIDA failed or had a lower price)
        else:
            source_info = "Ashesh (Backup)"

    # 5. History / Carry-Over Logic
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: pass

    if (final_gold == 0 or final_silver == 0) and history:
        final_gold = final_gold or history[-1]['gold']
        final_silver = final_silver or history[-1]['silver']
        source_info = f"Recovery (Last Known)"
    elif final_gold == 0:
        # Emergency default if first time run and all sites fail
        final_gold, final_silver, source_info = 303500, 5340, "Hard Fallback"

    # 6. Save final result
    # Nepal Time (UTC+5:45)
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": final_gold,
        "silver": final_silver,
        "source": source_info
    }

    # If today's data already exists, update it. Else append.
    today_str = now.strftime("%Y-%m-%d")
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    with open(file, 'w') as f:
        json.dump(history[-100:], f, indent=4)
    
    print(f"FINAL RESULT: Gold {final_gold}, Silver {final_silver} via {source_info}")

if __name__ == "__main__":
    update()