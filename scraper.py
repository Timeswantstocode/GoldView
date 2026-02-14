import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
import urllib3

# Suppress SSL warnings for FENEGOSIDA
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- GITHUB SECRETS ---
ONESIGNAL_APP_ID = os.getenv('ONESIGNAL_APP_ID')
ONESIGNAL_REST_KEY = os.getenv('ONESIGNAL_REST_KEY')

def send_push_notification(new_gold, new_silver, change_g, change_s):
    """Sends native device notifications via OneSignal API"""
    if not ONESIGNAL_APP_ID or not ONESIGNAL_REST_KEY:
        print("PUSH SKIPPED: Keys missing.")
        return

    msg_parts = []
    if change_g != 0:
        msg_parts.append(f"Gold {'increased' if change_g > 0 else 'decreased'} by रू {abs(change_g)}")
    if change_s != 0:
        msg_parts.append(f"Silver {'increased' if change_s > 0 else 'decreased'} by रू {abs(change_s)}")
    
    full_msg = " & ".join(msg_parts) + f". New Rate: रू {new_gold}."

    header = {"Content-Type": "application/json; charset=utf-8", "Authorization": f"Basic {ONESIGNAL_REST_KEY}"}
    payload = {
        "app_id": ONESIGNAL_APP_ID,
        "included_segments": ["All"],
        "headings": {"en": "GoldView Price Alert 📈"},
        "contents": {"en": full_msg},
        "priority": 10
    }
    try:
        requests.post("https://onesignal.com/api/v1/notifications", headers=header, data=json.dumps(payload), timeout=10)
        print(f"PUSH SUCCESS: {full_msg}")
    except Exception as e:
        print(f"PUSH ERROR: {e}")

def get_candidates(url, metal):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'}
    
    # --- ORIGINAL BLACKLIST LOGIC ---
    purity = [999, 9999, 9990, 9167, 9583, 916, 750]
    weights = [1166, 11664]
    office_nums = [453227, 453228, 4532270]
    years = list(range(2000, 2101))
    blacklist = set(purity + weights + office_nums + years)
    
    try:
        r = requests.get(url, headers=headers, timeout=25, verify=False)
        r.raise_for_status()
        
        # --- ORIGINAL RUPEE MERGING LOGIC ---
        raw_html = r.text.replace(',', '')
        raw_html = re.sub(r'(\d+)\s*रु\s*(\d+)', r'\1\2', raw_html)
        
        soup = BeautifulSoup(raw_html, 'html.parser')
        for junk in soup(["script", "style", "footer", "header", "nav"]):
            junk.decompose()
            
        content = soup.get_text(separator=' ')

        # --- ORIGINAL PROXIMITY REGEX LOGIC ---
        if metal == "gold":
            pattern = r"(?:FINE|Hallmark|Tola|छापावाल).{0,50}?(\d{6})"
            min_p, max_p = 150000, 1000000
        else:
            pattern = r"(?:SILVER|Tola|चाँदी).{0,50}?(\d{4,5})"
            min_p, max_p = 2000, 15000

        matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
        
        # Fallback to raw numbers
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

    # 2. Combine and pick Max
    all_gold = f_gold + a_gold
    all_silver = f_silver + a_silver
    final_gold = max(all_gold) if all_gold else 0
    
    # --- ORIGINAL SILVER-PARTIAL-GOLD SAFETY CHECK ---
    if final_gold > 0:
        partial_gold = final_gold // 10
        all_silver = [s for s in all_silver if s != partial_gold]

    final_silver = max(all_silver) if all_silver else 0

    # 3. Source Priority
    source_info = "None"
    if final_gold > 0:
        source_info = "FENEGOSIDA" if final_gold in f_gold else "Ashesh (Backup)"

    # 4. History Recovery & Notification Logic
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: pass

    if (final_gold == 0 or final_silver == 0) and history:
        final_gold = final_gold or history[-1]['gold']
        final_silver = final_silver or history[-1]['silver']
        source_info = "Recovery (Last Known)"
    elif history and final_gold > 0:
        # Trigger PUSH only if data is fresh and price actually changed
        last = history[-1]
        cg, cs = final_gold - last['gold'], final_silver - last['silver']
        if cg != 0 or cs != 0:
            send_push_notification(final_gold, final_silver, cg, cs)

    # 5. Generate Entry with Tejabi Math
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": final_gold,
        "tejabi": int(final_gold * 0.9167),
        "silver": final_silver,
        "source": source_info
    }

    # 6. Deduplication & Save (Last 200)
    today_str = now.strftime("%Y-%m-%d")
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    with open(file, 'w') as f:
        json.dump(history[-200:], f, indent=4)
    
    print(f"SUCCESS: Gold {final_gold} via {source_info}")

if __name__ == "__main__":
    update()