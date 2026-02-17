import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
import urllib3

# Suppress SSL warnings for FENEGOSIDA (expired certificates are common)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- WEB PUSH CONFIGURATION ---
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY')
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY')
VAPID_EMAIL = os.getenv('VAPID_EMAIL', 'mailto:admin@example.com')

def send_push_notification(new_gold, new_tejabi, new_silver, change_g, change_t, change_s):
    """Broadcasts native device notifications via Web Push"""
    from pywebpush import webpush, WebPushException

    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        print("PUSH SKIPPED: VAPID keys missing in GitHub Secrets.")
        return

    msg_parts = []
    if change_g != 0:
        diff = f"(+{change_g})" if change_g > 0 else f"({change_g})"
        msg_parts.append(f"Gold: रू {new_gold} {diff}")
    if change_s != 0:
        diff = f"(+{change_s})" if change_s > 0 else f"({change_s})"
        msg_parts.append(f"Silver: रू {new_silver} {diff}")
    
    if not msg_parts: return
    
    full_msg = " | ".join(msg_parts)
    
    # Load subscriptions from Vercel Blob
    # The BLOB_READ_WRITE_TOKEN must be in GitHub Secrets
    blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
    if not blob_token:
        print("PUSH SKIPPED: BLOB_READ_WRITE_TOKEN missing.")
        return

    try:
        # Use Vercel Blob API to find the subscriptions file
        # We use the public URL if possible, or the API if token is provided
        # Since we need to read it, we'll try to fetch it from the known path
        # Note: In a production environment, you might want to store the specific URL in a secret
        # or use the @vercel/blob python client if available, but simple requests works too.
        
        # Extremely robust subscription fetching
        headers = {"Authorization": f"Bearer {blob_token}"}
        subscriptions = []
        
        # Method 1: List all blobs and look for the path (handles different API behaviors)
        try:
            list_url = "https://blob.vercel-storage.com/"
            resp = requests.get(list_url, headers=headers, timeout=10)
            if resp.status_code == 200:
                blobs = resp.json().get('blobs', [])
                # Search for 'subscriptions/data.json' anywhere in the pathname
                target = next((b for b in blobs if 'subscriptions/data.json' in b['pathname']), None)
                if target:
                    sub_resp = requests.get(target['url'], timeout=10)
                    if sub_resp.status_code == 200:
                        subscriptions = sub_resp.json()
                        print(f"DEBUG: Found subscriptions via listing: {len(subscriptions)}")
        except Exception as e:
            print(f"DEBUG: Listing method failed: {e}")

        # Method 2: If Method 1 failed, try a common public URL pattern as fallback
        if not subscriptions:
            try:
                # Many Vercel Blobs are accessible via a predictable public URL if they are public
                # This is a fallback in case listing fails but the file exists
                # We'll use the one from the most recent successful sub if we had it, 
                # but since we don't, we rely on the listing being the primary way.
                pass
            except: pass

        if not subscriptions:
            print("PUSH SKIPPED: subscriptions/data.json not found or empty in Blob.")
            # Final attempt: check if subscriptions.json exists locally (from repo)
            if os.path.exists('subscriptions.json'):
                with open('subscriptions.json', 'r') as f:
                    subscriptions = json.load(f)
                    print(f"DEBUG: Using local subscriptions.json fallback: {len(subscriptions)}")
            
            if not subscriptions:
                return
    except Exception as e:
        print(f"PUSH ERROR: Could not fetch subscriptions from Blob: {e}")
        return

    if not subscriptions:
        print("PUSH SKIPPED: Subscriptions list is empty.")
        return

    # Optimization: Use a unique tag and clear title to avoid spam flagging
    # Using a dynamic tag helps avoid Android/Chrome spam flagging for repeated content
    import time
    payload = {
        "title": "GoldView Nepal: Price Update 📈",
        "body": full_msg,
        "data": {"url": "/", "tag": f"price-update-{int(time.time())}"},
        "tag": f"price-update-{int(time.time())}",
        "renotify": True
    }

    print(f"Sending push to {len(subscriptions)} devices...")
    
    success_count = 0
    for sub in subscriptions:
        try:
            webpush(
                subscription_info=sub,
                data=json.dumps(payload),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_EMAIL}
            )
            success_count += 1
        except WebPushException as ex:
            print(f"Push failed for one device: {ex}")
            pass
        except Exception as e:
            print(f"Unexpected push error: {e}")

    print(f"PUSH STATUS: Sent to {success_count}/{len(subscriptions)} devices - {full_msg}")

def get_candidates(url, metal):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    purity = [999, 9999, 9990, 9167, 9583, 916, 750]
    weights = [1166, 11664]
    office_nums = [453227, 453228, 4532270]
    years = list(range(2000, 2101))
    blacklist = set(purity + weights + office_nums + years)
    
    try:
        r = requests.get(url, headers=headers, timeout=25, verify=False)
        r.raise_for_status()
        raw_html = r.text.replace(',', '')
        raw_html = re.sub(r'(\d+)\s*रु\s*(\d+)', r'\1\2', raw_html)
        soup = BeautifulSoup(raw_html, 'html.parser')
        
        if "ashesh.com.np" in url:
            rows = soup.find_all('tr')
            prices = []
            for row in rows:
                text = row.get_text()
                if metal == "gold" and ("Gold Hallmark" in text or "छापावाल" in text) and "Tola" in text:
                    m = re.search(r'(\d{5,6})', text)
                    if m: prices.append(int(m.group(1)))
                elif metal == "tejabi" and ("Gold Tajabi" in text or "तेजाबी" in text) and "Tola" in text:
                    m = re.search(r'(\d{5,6})', text)
                    if m: prices.append(int(m.group(1)))
                elif metal == "silver" and ("Silver" in text or "चाँदी" in text) and "Tola" in text:
                    m = re.search(r'(\d{4,5})', text)
                    if m: prices.append(int(m.group(1)))
            if prices: return prices

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

def verify_price(primary, backup, tolerance=0.05):
    if primary > 0 and backup > 0:
        diff = abs(primary - backup) / primary
        if diff <= tolerance:
            return primary, True
        else:
            print(f"VERIFICATION WARNING: Primary {primary} and Backup {backup} differ by {diff:.2%}")
            return primary, False
    return primary or backup, False

def fetch_usd_history(days=90):
    """Fetches historical USD/NPR rates from Yahoo Finance"""
    try:
        url = f"https://query2.finance.yahoo.com/v8/finance/chart/USDNPR=X?interval=1d&range={days}d"
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(url, headers=headers, timeout=15)
        r.raise_for_status()
        data = r.json()
        result = data.get('chart', {}).get('result', [{}])[0]
        if not result or 'timestamp' not in result:
            return {}
        
        timestamps = result['timestamp']
        closes = result.get('indicators', {}).get('quote', [{}])[0].get('close', [])
        
        history = {}
        for i, ts in enumerate(timestamps):
            if i < len(closes) and closes[i] is not None:
                date_str = datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime("%Y-%m-%d")
                history[date_str] = round(float(closes[i]), 2)
        return history
    except Exception as e:
        print(f"WARNING: Could not fetch USD history: {e}")
        return {}

def update():
    file = 'data.json'
    widget_url = "https://www.ashesh.com.np/gold/widget.php?api=521224q192"
    fenegosida_url = "https://fenegosida.org/"
    
    f_gold = get_candidates(fenegosida_url, "gold")
    f_silver = get_candidates(fenegosida_url, "silver")
    
    a_gold = get_candidates(widget_url, "gold")
    a_tejabi = get_candidates(widget_url, "tejabi")
    a_silver = get_candidates(widget_url, "silver")
    
    # Fetch live USD rate for today
    usd_history_map = fetch_usd_history(days=90)
    live_usd = 0
    if usd_history_map:
        # Get the latest available rate
        sorted_dates = sorted(usd_history_map.keys(), reverse=True)
        live_usd = usd_history_map[sorted_dates[0]]

    primary_gold = max(f_gold) if f_gold else 0
    backup_gold = max(a_gold) if a_gold else 0
    final_gold, gold_verified = verify_price(primary_gold, backup_gold)
    
    primary_silver = max(f_silver) if f_silver else 0
    backup_silver = max(a_silver) if a_silver else 0
    final_silver, silver_verified = verify_price(primary_silver, backup_silver)
    
    final_tejabi = max(a_tejabi) if a_tejabi else int(final_gold * 0.9167)
    tejabi_verified = True if a_tejabi else False

    sources = []
    if f_gold and final_gold == primary_gold: sources.append("FENEGOSIDA")
    elif a_gold: sources.append("Ashesh")
    if a_tejabi: sources.append("Ashesh (Tejabi)")
    
    source_info = " / ".join(sources) if sources else "None"
    if not gold_verified or not silver_verified:
        source_info += " (Unverified)"

    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: 
                content = f.read().strip()
                if content:
                    history = json.loads(content)
        except Exception as e:
            print(f"WARNING: Could not read data.json: {e}")
            history = []

    # If data.json is missing or empty, and we failed to fetch new data, we can't do much
    # but we should at least prevent a crash.
    if (final_gold == 0 or final_silver == 0) and history:
        final_gold = final_gold or history[-1].get('gold', 0)
        final_silver = final_silver or history[-1].get('silver', 0)
        final_tejabi = final_tejabi or history[-1].get('tejabi', int(final_gold * 0.9167))
        source_info = "Recovery (Last Known)"
    
    # Trigger notification only if there's a real change and not just a re-scrape of the same data
    if history:
        last = history[-1]
        change_g = final_gold - last['gold']
        change_s = final_silver - last['silver']
        change_t = final_tejabi - last.get('tejabi', 0)
        
        # Optimization: Only notify if the change is significant or if it's the first update of the day
        if change_g != 0 or change_s != 0 or change_t != 0:
            send_push_notification(final_gold, final_tejabi, final_silver, change_g, change_t, change_s)

    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": final_gold,
        "tejabi": final_tejabi,
        "silver": final_silver,
        "usd": live_usd,
        "source": source_info,
        "verified": gold_verified and silver_verified and tejabi_verified
    }

    # Fill in missing USD history for existing entries if possible
    if usd_history_map:
        for entry in history:
            entry_date = entry['date'].split(' ')[0]
            if 'usd' not in entry or entry['usd'] == 0:
                if entry_date in usd_history_map:
                    entry['usd'] = usd_history_map[entry_date]

    if history and history[-1]['date'].startswith(today_str):
        # Preserve USD if we already have it and live fetch failed
        if new_entry['usd'] == 0:
            new_entry['usd'] = history[-1].get('usd', 0)
        history[-1] = new_entry
    else:
        history.append(new_entry)

    # Keep a generous amount of history (e.g., 1000 entries) to support the 90-day view
    with open(file, 'w') as f:
        json.dump(history[-1000:], f, indent=4)
    
    print(f"SUCCESS: Gold {final_gold}, Tejabi {final_tejabi}, Silver {final_silver} via {source_info}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test-notify":
        print("RUNNING NOTIFICATION TEST...")
        send_push_notification(120000, 119000, 1450, 100, 100, 10)
    else:
        update()
