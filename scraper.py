import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
import urllib3

# Suppress SSL warnings for FENEGOSIDA (they often have expired certificates)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_candidates(url, metal):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'}
    
    # Blacklist non-price numbers
# --- GITHUB SECRETS CONFIGURATION ---
ONESIGNAL_APP_ID = os.getenv('ONESIGNAL_APP_ID')
ONESIGNAL_REST_KEY = os.getenv('ONESIGNAL_REST_KEY')

def send_push_notification(new_gold, new_silver, change_g, change_s):
    """Broadcasts native device notifications via OneSignal API"""
    if not ONESIGNAL_APP_ID or not ONESIGNAL_REST_KEY:
        print("PUSH SKIPPED: OneSignal keys missing in GitHub Secrets.")
        return

    # Constructing the message based on price movement
    msg_parts = []
    if change_g != 0:
        dir_g = "increased" if change_g > 0 else "decreased"
        msg_parts.append(f"Gold {dir_g} by रू {abs(change_g)}")
    if change_s != 0:
        dir_s = "increased" if change_s > 0 else "decreased"
        msg_parts.append(f"Silver {dir_s} by रू {abs(change_s)}")
    
    full_msg = " & ".join(msg_parts) + f". New Rate: रू {new_gold}."

    header = {
        "Content-Type": "application/json; charset=utf-8", 
        "Authorization": f"Basic {ONESIGNAL_REST_KEY}"
    }
    
    payload = {
        "app_id": ONESIGNAL_APP_ID,
        "included_segments": ["All"],
        "headings": {"en": "GoldView Price Alert 📈"},
        "contents": {"en": full_msg},
        "ios_badgeType": "Increase",
        "ios_badgeCount": 1,
        "priority": 10 
    }

    try:
        r = requests.post("https://onesignal.com/api/v1/notifications", headers=header, data=json.dumps(payload), timeout=15)
        print(f"PUSH STATUS: {r.status_code} - {full_msg}")
    except Exception as e:
        print(f"PUSH ERROR: {e}")

def get_candidates(url, metal):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'}
    
    # --- UNCOMPROMISED BLACKLIST LOGIC ---
    purity = [999, 9999, 9990, 9167, 9583, 916, 750]
    weights = [1166, 11664]
    office_nums = [453227, 453228, 4532270]
    years = list(range(2000, 2101))
    blacklist = set(purity + weights + office_nums + years)
    
    try:
        r = requests.get(url, headers=headers, timeout=25, verify=False)
        r.raise_for_status()
        
        # Merge split Rupee symbols
        # --- RUPEE MERGING & CLEANING ---
        raw_html = r.text.replace(',', '')
        raw_html = re.sub(r'(\d+)\s*रु\s*(\d+)', r'\1\2', raw_html)
        
        soup = BeautifulSoup(raw_html, 'html.parser')
        # Filter out junk
        for junk in soup(["script", "style", "footer", "header"]):
        # Filter out junk elements that contain misleading numbers
        for junk in soup(["script", "style", "footer", "header", "nav", "aside"]):
            junk.decompose()
            
        content = soup.get_text(separator=' ')

        if metal == "gold":
            # Gold range: 150k to 1M
            pattern = r"(?:FINE|Hallmark|Tola|छापावाल).{0,50}?(\d{6})"
            min_p, max_p = 150000, 1000000
        else:
            # Silver range: 2k to 15k (Prevents picking up partial gold prices like 30350)
        # --- KEYWORD PROXIMITY REGEX ---
        if metal == "gold":
            # Looking for 6 digit numbers (100k+) near gold keywords
            pattern = r"(?:FINE|Hallmark|Tola|छापावाल).{0,50}?(\d{6})"
            min_p, max_p = 150000, 1000000
        else:
            # Looking for 4-5 digit numbers near silver keywords
            pattern = r"(?:SILVER|Tola|चाँदी).{0,50}?(\d{4,5})"
            min_p, max_p = 2000, 15000

        matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
        
        # Fallback to raw numbers if no keywords found
        # Fallback to raw digit matching if proximity logic fails
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
    # 2. Combine and pick Max (Ensures Tola price vs 10g price)
    all_gold = f_gold + a_gold
    all_silver = f_silver + a_silver
    
    final_gold = max(all_gold) if all_gold else 0
    
    # Safety Check: Remove any Silver candidates that look like partial Gold prices
    # --- SILVER INTEGRITY SAFETY CHECK ---
    # Prevents picking up 10% of gold price (e.g. 15000) as silver price
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
    # 4. History Recovery & Change Detection
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: pass

    # Handle Failed Scraping
    if (final_gold == 0 or final_silver == 0) and history:
        final_gold = final_gold or history[-1]['gold']
        final_silver = final_silver or history[-1]['silver']
        source_info = f"Recovery (Last Known)"

    # 6. Save
        source_info = "Recovery (Last Known)"
    
    # Trigger PUSH Logic (Only if price changed and not in recovery mode)
    elif history and final_gold > 0:
        last = history[-1]
        change_g = final_gold - last['gold']
        change_s = final_silver - last['silver']
        
        if change_g != 0 or change_s != 0:
            send_push_notification(final_gold, final_silver, change_g, change_s)

    # 5. Tejabi Math (22K is 91.67% of 24K)
    tejabi_price = int(final_gold * 0.9167) if final_gold > 0 else 0

    # 6. Time Generation (Nepal Standard Time GMT+5:45)
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": final_gold,
        "tejabi": tejabi_price,
        "silver": final_silver,
        "source": source_info
    }

    # 7. Deduplication & Save
    # If a record for today already exists, update it. Otherwise, append.
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    # Keep last 200 entries for charts and sentiment
    with open(file, 'w') as f:
        json.dump(history[-100:], f, indent=4)
    
    print(f"SUCCESS: Gold {final_gold}, Silver {final_silver} via {source_info}")
    print(f"SUCCESS: Gold {final_gold}, Tejabi {tejabi_price}, Silver {final_silver} via {source_info}")

if __name__ == "__main__":
    update()