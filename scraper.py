import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
import urllib3

# Suppress SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- GITHUB SECRETS ---
ONESIGNAL_APP_ID = os.getenv('ONESIGNAL_APP_ID')
ONESIGNAL_REST_KEY = os.getenv('ONESIGNAL_REST_KEY')

def send_push_notification(new_gold, new_silver, change_g, change_s):
    if not ONESIGNAL_APP_ID or not ONESIGNAL_REST_KEY:
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
        requests.post("https://onesignal.com/api/v1/notifications", headers=header, data=json.dumps(payload))
    except: pass

def get_candidates(url, metal):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'}
    
    # --- THE NUMBER FILTER (Blacklist) ---
    purity = [999, 9999, 9990, 9167, 9583, 916, 750]
    weights = [1166, 11664]
    office_nums = [453227, 453228, 4532270]
    years = list(range(2000, 2101))
    blacklist = set(purity + weights + office_nums + years)
    
    try:
        r = requests.get(url, headers=headers, timeout=25, verify=False)
        raw_html = r.text.replace(',', '')
        soup = BeautifulSoup(raw_html, 'html.parser')
        for junk in soup(["script", "style", "footer", "header", "nav"]): junk.decompose()
        content = soup.get_text(separator=' ')

        pattern = r"(\d{6})" if metal == "gold" else r"(\d{4,5})"
        matches = re.findall(pattern, content)

        valid = []
        for m in matches:
            val = int(m)
            if val in blacklist: continue # Skip blacklisted numbers
            if metal == "gold" and 100000 <= val <= 1000000: valid.append(val)
            elif metal == "silver" and 1000 <= val <= 15000: valid.append(val)
        return valid
    except: return []

def update():
    file = 'data.json'
    f_gold = get_candidates("https://fenegosida.org/", "gold")
    f_silver = get_candidates("https://fenegosida.org/", "silver")
    a_gold = get_candidates("https://www.ashesh.com.np/gold/", "gold")
    
    final_gold = max(f_gold + a_gold) if (f_gold + a_gold) else 0
    final_silver = max(f_silver) if f_silver else 0

    history = []
    if os.path.exists(file):
        with open(file, 'r') as f: history = json.load(f)

    if history and final_gold > 0:
        last = history[-1]
        cg, cs = final_gold - last['gold'], final_silver - last['silver']
        if cg != 0 or cs != 0:
            send_push_notification(final_gold, final_silver, cg, cs)

    if final_gold == 0 and history:
        final_gold, final_silver = history[-1]['gold'], history[-1]['silver']
        source = "Recovery"
    else: source = "FENEGOSIDA Official"

    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": final_gold,
        "tejabi": int(final_gold * 0.9167),
        "silver": final_silver,
        "source": source
    }

    if history and history[-1]['date'].startswith(now.strftime("%Y-%m-%d")):
        history[-1] = new_entry
    else: history.append(new_entry)

    with open(file, 'w') as f: json.dump(history[-200:], f, indent=4)

if __name__ == "__main__":
    update()