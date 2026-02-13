import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
import urllib3

# Suppress SSL warnings for sites with broken certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def extract_from_text(text, metal):
    """
    Finds potential prices using keywords and broad ranges.
    """
    # Blacklist common non-price numbers (Purity, Grams, Years)
    blacklist = [999, 9999, 1166, 11664, 2081, 2082, 2083, 2084, 2025, 2026]
    
    # 1. Clean the text (remove commas, handle Rupee symbol gaps)
    text = text.replace(',', '')
    text = re.sub(r'(\d)\s+रु\s+(\d)', r'\1\2', text) # Merge "306 रु 500"
    text = text.replace('रु', ' ')

    if metal == "gold":
        # Look for Hallmark/Fine to avoid Tejabi. 
        # Range: 100k to 1 Million (Future proofing)
        patterns = [r"(?:Fine|Hallmark|छापावाल).{0,50}?(\d{6})", r"(\d{6})"]
        min_p, max_p = 100000, 1000000
    else:
        # Range: 1k to 50k (Future proofing)
        patterns = [r"(?:Silver|चाँदी).{0,50}?(\d{4,5})", r"(\d{4,5})"]
        min_p, max_p = 1000, 50000

    found_values = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
        for m in matches:
            val = int(m)
            if val in blacklist: continue
            if min_p <= val <= max_p:
                found_values.append(val)
    
    # Return the first one found near a keyword, or the highest if multiple
    return found_values[0] if found_values else 0

def get_data_from_url(url, name):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'}
    try:
        r = requests.get(url, headers=headers, timeout=20, verify=False)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')
        # Clean script/styles to avoid noise
        for s in soup(["script", "style"]): s.decompose()
        content = " ".join(soup.get_text(separator=' ').split())
        
        g = extract_from_text(content, "gold")
        s = extract_from_text(content, "silver")
        return g, s
    except Exception as e:
        print(f"Log: {name} connection failed.")
        return 0, 0

def update():
    file = 'data.json'
    
    # 1. Scrape both sources
    f_gold, f_silver = get_data_from_url("https://fenegosida.org/", "FENEGOSIDA")
    a_gold, a_silver = get_data_from_url("https://www.ashesh.com.np/gold/", "Ashesh")
    
    # 2. Log findings for transparency
    print(f"Log - FENEGOSIDA Findings: Gold={f_gold}, Silver={f_silver}")
    print(f"Log - Ashesh Findings: Gold={a_gold}, Silver={a_silver}")

    # 3. Decision Logic (Cross-Check)
    final_gold, final_silver = 0, 0
    source_info = ""

    # Gold Cross-Check
    if f_gold > 0 and a_gold > 0:
        # If they are within 5% of each other, they are likely correct
        if abs(f_gold - a_gold) / max(f_gold, a_gold) < 0.05:
            final_gold = f_gold
            source_info = "Verified (Both)"
        else:
            final_gold = max(f_gold, a_gold) # Usually the Tola price
            source_info = "Price Mismatch (Used Max)"
    else:
        final_gold = f_gold or a_gold
        source_info = "Single Source"

    # Silver Cross-Check
    if f_silver > 0 and a_silver > 0:
        if abs(f_silver - a_silver) / max(f_silver, a_silver) < 0.10:
            final_silver = f_silver
        else:
            # Avoid picking 2083 or 9999 by checking common silver bounds
            # If one is in the 'likely' range (~5k) and other isn't, pick likely
            final_silver = f_silver if 4500 < f_silver < 8000 else a_silver
    else:
        final_silver = f_silver or a_silver

    # 4. History Recovery
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: pass

    if (final_gold == 0 or final_silver == 0) and history:
        final_gold = final_gold or history[-1]['gold']
        final_silver = final_silver or history[-1]['silver']
        source_info = "Recovery (Carry Over)"
    elif final_gold == 0:
        final_gold, final_silver, source_info = 306500, 5340, "Emergency Fallback"

    # 5. Save Data
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": final_gold,
        "silver": final_silver,
        "source": source_info
    }

    if history and history[-1]['date'].startswith(now.strftime("%Y-%m-%d")):
        history[-1] = entry
    else:
        history.append(entry)

    with open(file, 'w') as f:
        json.dump(history[-100:], f, indent=4)
    
    print(f"FINAL VERIFIED RESULT: Gold {final_gold}, Silver {final_silver} ({source_info})")

if __name__ == "__main__":
    update()