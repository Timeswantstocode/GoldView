import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
import urllib3

# Suppress SSL warnings for FENEGOSIDA (expired certificates are common)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- GITHUB SECRETS CONFIGURATION ---
ONESIGNAL_APP_ID = os.getenv('ONESIGNAL_APP_ID')
ONESIGNAL_REST_KEY = os.getenv('ONESIGNAL_REST_KEY')

def send_push_notification(new_gold, new_silver, change_g, change_s):
    """Broadcasts native device notifications via OneSignal API"""
    if not ONESIGNAL_APP_ID or not ONESIGNAL_REST_KEY:
        print("PUSH SKIPPED: OneSignal keys missing in GitHub Secrets.")
        return

    # Construct the alert message
    msg_parts = []
    if change_g != 0:
        direction = "increased" if change_g > 0 else "decreased"
        msg_parts.append(f"Gold {direction} by रू {abs(change_g)}")
    if change_s != 0:
        direction = "increased" if change_s > 0 else "decreased"
        msg_parts.append(f"Silver {direction} by रू {abs(change_s)}")
    
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
    
    # --- UNCOMPROMISED BLACKLIST ---
    purity = [999, 9999, 9990, 9167, 9583, 916, 750]
    weights = [1166, 11664]
    office_nums = [453227, 453228, 4532270]
    years = list(range(2000, 2101))
    blacklist = set(purity + weights + office_nums + years)
    
    try:
        r = requests.get(url, headers=headers, timeout=25, verify=False)
        r.raise_for_status()
        
        raw_html = r.text.replace(',', '')
        # Handle cases where prices might be split or have spaces
        raw_html = re.sub(r'(\d+)\s*रु\s*(\d+)', r'\1\2', raw_html)
        
        soup = BeautifulSoup(raw_html, 'html.parser')
        
        # Special handling for Ashesh Widget
        if "ashesh.com.np" in url and "widget.php" in url:
            rows = soup.find_all('tr')
            prices = []
            for row in rows:
                text = row.get_text()
                if metal == "gold" and "Gold Hallmark" in text and "Tola" in text:
                    m = re.search(r'(\d{5,6})', text)
                    if m: prices.append(int(m.group(1)))
                elif metal == "tejabi" and "Gold Tajabi" in text and "Tola" in text:
                    m = re.search(r'(\d{5,6})', text)
                    if m: prices.append(int(m.group(1)))
                elif metal == "silver" and "Silver" in text and "Tola" in text:
                    m = re.search(r'(\d{4,5})', text)
                    if m: prices.append(int(m.group(1)))
            if prices: return prices

        # General scraping logic
        for junk in soup(["script", "style", "footer", "header", "nav", "aside"]):
            junk.decompose()
            
        content = soup.get_text(separator=' ')

        if metal == "gold":
            pattern = r"(?:FINE|Hallmark|Tola|छापावाल).{0,50}?(\d{6})"
            min_p, max_p = 100000, 1000000
        elif metal == "tejabi":
            pattern = r"(?:Tejabi|तेजाबी|Tola).{0,50}?(\d{6})"
            min_p, max_p = 100000, 1000000
        else:
            pattern = r"(?:SILVER|Tola|चाँदी).{0,50}?(\d{4,5})"
            min_p, max_p = 1000, 15000

        matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
        
        if not matches:
            raw_p = r"(\d{6})" if metal in ["gold", "tejabi"] else r"(\d{4,5})"
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
    widget_url = "https://www.ashesh.com.np/gold/widget.php?api=521224q192"
    
    f_gold = get_candidates("https://fenegosida.org/", "gold")
    f_silver = get_candidates("https://fenegosida.org/", "silver")
    
    a_gold = get_candidates(widget_url, "gold")
    a_tejabi = get_candidates(widget_url, "tejabi")
    a_silver = get_candidates(widget_url, "silver")

    # 2. Pick Maximum / Best Source
    all_gold = f_gold + a_gold
    all_silver = f_silver + a_silver
    
    final_gold = max(all_gold) if all_gold else 0
    final_silver = max(all_silver) if all_silver else 0
    
    # Tejabi logic: Use scraped value if available, else fallback to calculation
    if a_tejabi:
        final_tejabi = max(a_tejabi)
    else:
        final_tejabi = int(final_gold * 0.9167) if final_gold > 0 else 0

    # 3. Source Attribution
    source_info = "None"
    if final_gold > 0:
        source_info = "FENEGOSIDA" if final_gold in f_gold else "Ashesh (Backup)"

    # 4. History Handling
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: history = json.load(f)
        except: pass

    if (final_gold == 0 or final_silver == 0) and history:
        final_gold = final_gold or history[-1]['gold']
        final_silver = final_silver or history[-1]['silver']
        final_tejabi = final_tejabi or history[-1].get('tejabi', int(final_gold * 0.9167))
        source_info = "Recovery (Last Known)"
    
    elif history and final_gold > 0:
        last = history[-1]
        change_g = final_gold - last['gold']
        change_s = final_silver - last['silver']
        
        if change_g != 0 or change_s != 0:
            send_push_notification(final_gold, final_silver, change_g, change_s)

    # 5. Generate Entry
    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": final_gold,
        "tejabi": final_tejabi,
        "silver": final_silver,
        "source": source_info
    }

    # 6. Deduplication
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    # Maintain 200 data points
    with open(file, 'w') as f:
        json.dump(history[-200:], f, indent=4)
    
    print(f"SUCCESS: Gold {final_gold}, Tejabi {final_tejabi}, Silver {final_silver} via {source_info}")

if __name__ == "__main__":
    update()
