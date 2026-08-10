# Copyright (c) 2024-2026 Timeswantstocode. All Rights Reserved.
# This software is proprietary and may not be copied, modified, or distributed.
# See LICENSE file for details.

import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
import time
import urllib3

# Suppress SSL warnings for FENEGOSIDA (expired certificates are common)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- WEB PUSH CONFIGURATION ---
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY')
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', 'BK4UiqZsmzcWoQR_JFmuAhQQ2R7JQEIxC83Tppc8VxBwd4a3mXztqyv31Q9XJ3Ab6Yq_aqbExGlNMX2NP2j5zAQ')
VAPID_EMAIL = os.getenv('VAPID_EMAIL', 'mailto:timesbaral11@gmail.com')

def format_indian(n):
    """Formats an integer according to the Indian numbering system (e.g., 1,23,45,678)"""
    is_neg = n < 0
    s = str(abs(n))
    if len(s) <= 3:
        res = s
    else:
        last_three = s[-3:]
        remaining = s[:-3]
        parts = []
        while remaining:
            parts.append(remaining[-2:])
            remaining = remaining[:-2]
        res = ",".join(reversed(parts)) + "," + last_three
    return "-" + res if is_neg else res

def send_push_notification(new_gold, new_tejabi, new_silver, change_g, change_t, change_s):
    """Broadcasts native device notifications via Web Push"""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        print("PUSH SKIPPED: VAPID keys missing in GitHub Secrets.")
        return

    if change_g == 0 and change_t == 0 and change_s == 0:
        print("PUSH SKIPPED: No price change detected.")
        return

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        print("PUSH SKIPPED: pywebpush not installed.")
        return

    # Helper for calculating percentage change
    def get_change_str(curr, diff):
        prev = curr - diff
        pct = (diff / prev * 100) if prev != 0 else 0
        sign = '+' if diff >= 0 else ''
        return f"रू {format_indian(curr)} ({sign}{pct:.2f}%)"

    gold_str = f"Gold(24K): {get_change_str(new_gold, change_g)}"
    tejabi_str = f"Tejabi(22K): {get_change_str(new_tejabi, change_t)}"
    silver_str = f"Silver: {get_change_str(new_silver, change_s)}"
    
    full_msg = f"{gold_str}\n{tejabi_str}\n{silver_str}"
    
    blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
    if not blob_token:
        print("PUSH SKIPPED: BLOB_READ_WRITE_TOKEN missing.")
        return

    subscriptions = []
    try:
        headers = {"Authorization": f"Bearer {blob_token}"}
        list_url = "https://blob.vercel-storage.com"
        resp = requests.get(list_url, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            blobs = resp.json().get('blobs', [])
            target = next((b for b in blobs if b['pathname'] == 'subscriptions/data.json'), None)
            
            if target:
                sub_resp = requests.get(target['url'], timeout=10)
                if sub_resp.status_code == 200:
                    subscriptions = sub_resp.json()
                    print(f"DEBUG: Successfully loaded {len(subscriptions)} subscriptions from Blob.")
            else:
                print("DEBUG: 'subscriptions/data.json' not found in Blob storage. Initializing with dummy data.")
                # Initialize with dummy data if not exists
                dummy_data = [{"endpoint":"https://fcm.googleapis.com/fcm/send/dummy-endpoint","keys":{"p256dh":"dummy-p256dh","auth":"dummy-auth"}}]
                put_url = "https://blob.vercel-storage.com/subscriptions/data.json"
                put_resp = requests.put(put_url, headers=headers, data=json.dumps(dummy_data), timeout=10)
                if put_resp.status_code in [200, 201]:
                    print("DEBUG: Successfully initialized 'subscriptions/data.json' in Blob.")
                    subscriptions = dummy_data
                else:
                    print(f"DEBUG: Failed to initialize Blob data: {put_resp.status_code}")
        else:
            print(f"DEBUG: Blob API returned error {resp.status_code}")

        if not subscriptions and os.path.exists('subscriptions.json'):
            with open('subscriptions.json', 'r') as f:
                subscriptions = json.load(f)
                print(f"DEBUG: Using local subscriptions.json fallback: {len(subscriptions)}")
                
    except Exception as e:
        print(f"PUSH ERROR: Could not fetch subscriptions: {e}")

    if not subscriptions:
        print("PUSH SKIPPED: No subscribers found.")
        return

    payload = {
        "title": "Current Rates",
        "body": full_msg,
        "icon": "/logo512.png",
        "badge": "/logo512.png",
        "data": {"url": "/", "tag": "price-update"},
        "tag": "price-update",
        "renotify": True
    }

    print(f"Sending push to {len(subscriptions)} devices...")
    
    FAILURE_THRESHOLD = 6  # Remove subscription after 6 consecutive failures
    success_count = 0
    updated_subscriptions = []  # Track subscriptions with updated failure counts
    has_changes = False  # Track if any failure counts changed
    
    for sub in subscriptions:
        # Skip dummy endpoints but ensure failureCount is initialized
        if "dummy-endpoint" in sub.get('endpoint', ''):
            if 'failureCount' not in sub:
                sub['failureCount'] = 0
            updated_subscriptions.append(sub)
            continue
        
        try:
            # Ensure proper VAPID claims format
            vapid_claims = {"sub": VAPID_EMAIL}
            
            webpush(
                subscription_info=sub,
                data=json.dumps(payload),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=vapid_claims
            )
            success_count += 1
            # Reset failure count on success
            if sub.get('failureCount', 0) != 0:
                has_changes = True
                sub['failureCount'] = 0
            updated_subscriptions.append(sub)
        except WebPushException as ex:
            print(f"Push failed for one device: WebPushException: {ex}")
            # Increment failure count for any push failure
            failure_count = sub.get('failureCount', 0) + 1
            sub['failureCount'] = failure_count
            has_changes = True
            
            # Log response details if available
            if hasattr(ex, 'response') and ex.response:
                try:
                    status_code = ex.response.status_code if hasattr(ex.response, 'status_code') else 0
                    print(f"Response body: {ex.response.text}, Response {ex.response.json()}")
                    print(f"Subscription failed (HTTP {status_code}, count: {failure_count}/{FAILURE_THRESHOLD})")
                except Exception:
                    print(f"Could not parse response details (failure count: {failure_count})")
            else:
                print(f"No response available (failure count: {failure_count})")
            
            # Keep subscription only if below threshold
            if failure_count < FAILURE_THRESHOLD:
                updated_subscriptions.append(sub)
            else:
                print(f"Removing subscription after {failure_count} consecutive failures")
        except Exception as e:
            print(f"Unexpected push error: {type(e).__name__}: {e}")
            # For unexpected errors, increment failure count
            failure_count = sub.get('failureCount', 0) + 1
            sub['failureCount'] = failure_count
            has_changes = True
            print(f"Failure count: {failure_count}/{FAILURE_THRESHOLD}")
            if failure_count < FAILURE_THRESHOLD:
                updated_subscriptions.append(sub)

    print(f"PUSH STATUS: Sent to {success_count} active devices.")
    
    # Save updated subscriptions with failure counts
    removed_count = len(subscriptions) - len(updated_subscriptions)
    if removed_count > 0:
        print(f"Removed {removed_count} subscription(s) after {FAILURE_THRESHOLD}+ consecutive failures")
    
    # Save if there are changes (removals or failure count updates)
    if removed_count > 0 or has_changes:
        try:
            headers_with_ct = {"Authorization": f"Bearer {blob_token}", "Content-Type": "application/json"}
            put_url = "https://blob.vercel-storage.com/subscriptions/data.json"
            put_resp = requests.put(put_url, headers=headers_with_ct, data=json.dumps(updated_subscriptions, indent=2), timeout=10)
            if put_resp.status_code in [200, 201]:
                print(f"DEBUG: Successfully updated subscriptions. Total: {len(updated_subscriptions)}")
            else:
                print(f"DEBUG: Failed to update subscriptions: {put_resp.status_code}")
        except Exception as e:
            print(f"ERROR: Failed to update subscriptions: {e}")

# Currencies tracked in the data history.
# INR is excluded per requirement: it is a fixed 1.6 NPR peg official rate.
TRACKED_CURRENCIES = ['USD', 'GBP', 'AUD', 'JPY', 'KRW', 'AED', 'EUR']

FENEGOSIDA_API = 'https://api.fenegosida.org/api/website/v1/Dashboard/today'
NRB_APP_RATE = 'https://www.nrb.org.np/api/forex/v1/app-rate'
NRB_HISTORY = 'https://www.nrb.org.np/api/forex/v1/rates'

def fetch_fenegosida():
    """Fetches today's rates from the FENEGOSIDA JSON API (no HTML/UI dependency)."""
    headers = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}
    for attempt in range(3):
        try:
            r = requests.get(FENEGOSIDA_API, headers=headers, timeout=25, verify=False)
            r.raise_for_status()
            data = r.json()
            result = {'gold': 0, 'silver': 0, 'usd': 0}
            if not isinstance(data, list):
                return result
            for item in data:
                if not isinstance(item, dict):
                    continue
                label = str(item.get('rateType', ''))
                value = item.get('todayBaseRatePerGram')
                try:
                    value = float(value)
                except (TypeError, ValueError):
                    continue
                if 'छापावाल' in label and 'तोला' in label:
                    result['gold'] = int(round(value))
                elif 'चाँदी' in label and 'तोला' in label:
                    result['silver'] = int(round(value))
                elif 'ollar' in label:
                    result['usd'] = round(value, 2)
            return result
        except Exception as e:
            print(f"DEBUG: Attempt {attempt+1} failed for FENEGOSIDA API: {e}")
            if attempt < 2:
                time.sleep(5)
    return {'gold': 0, 'silver': 0, 'usd': 0}

def fetch_nrb_currencies(days=95):
    """Fetches NPR buy/sell rates for TRACKED_CURRENCIES.
    Returns (live_map, history_map) where:
      live_map: {code: {buy, sell, unit}} for today
      history_map: {date: {code: {buy, sell, unit}}} for the last `days` days
    """
    headers = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}
    history_map = {}
    live_map = {}

    try:
        r = requests.get(NRB_APP_RATE, headers=headers, timeout=25, verify=False)
        r.raise_for_status()
        data = r.json()
        if isinstance(data, list) and data:
            data = data[0]
        for row in (data.get('rates') or []):
            code = row.get('iso3')
            if code not in TRACKED_CURRENCIES:
                continue
            try:
                live_map[code] = {
                    'buy': float(row.get('buy')),
                    'sell': float(row.get('sell')),
                    'unit': int(row.get('unit') or 1)
                }
            except (TypeError, ValueError):
                continue
    except Exception as e:
        print(f"WARNING: NRB app-rate failed: {e}")

    try:
        end = datetime.date.today()
        start = end - datetime.timedelta(days=days)
        url = f"{NRB_HISTORY}?from={start}&to={end}&per_page=100&page=1"
        r = requests.get(url, headers=headers, timeout=30, verify=False)
        r.raise_for_status()
        payload = (r.json().get('data') or {}).get('payload') or []
        for day in payload:
            date_key = str(day.get('date', ''))[:10]
            if not date_key:
                continue
            day_map = {}
            for row in (day.get('rates') or []):
                cur = row.get('currency') or {}
                code = cur.get('iso3')
                if code not in TRACKED_CURRENCIES:
                    continue
                try:
                    day_map[code] = {
                        'buy': float(row.get('buy')),
                        'sell': float(row.get('sell')),
                        'unit': int(cur.get('unit') or 1)
                    }
                except (TypeError, ValueError):
                    continue
            if day_map:
                history_map[date_key] = day_map
    except Exception as e:
        print(f"WARNING: NRB history failed: {e}")

    return live_map, history_map

def get_candidates(url, metal):
    headers = {'User-Agent': 'Mozilla/5.0'}
    purity = [999, 9999, 9990, 9167, 9583, 916, 750]
    weights = [1166, 11664]
    office_nums = [453227, 453228, 4532270]
    years = list(range(2000, 2101))
    blacklist = set(purity + weights + office_nums + years)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            r = requests.get(url, headers=headers, timeout=25, verify=False)
            r.raise_for_status()
            raw_html = r.text.replace(',', '')
            raw_html = re.sub(r'\s+', ' ', raw_html)
            
            soup = BeautifulSoup(raw_html, 'html.parser')
            
            if "ashesh.com.np" in url:
                rows = soup.find_all('div', class_='country')
                prices = []
                for row in rows:
                    text = row.get_text(separator=' ')
                    if "Tola" in text:
                        if metal == "gold" and ("Gold Hallmark" in text or "छापावाल" in text):
                            m = re.search(r'(\d{5,6})', text)
                            if m: prices.append(int(m.group(1)))
                        elif metal == "tejabi" and ("Gold Tajabi" in text or "Gold Tejabi" in text or "तेजाबी" in text):
                            m = re.search(r'(\d{5,6})', text)
                            if m: prices.append(int(m.group(1)))
                        elif metal == "silver" and ("Silver" in text or "चाँदी" in text):
                            m = re.search(r'(\d{4,5})', text)
                            if m: prices.append(int(m.group(1)))
                if prices: return prices

            for junk in soup(["script", "style", "footer", "header", "nav", "aside"]):
                junk.decompose()
            content = soup.get_text(separator=' ')

            if metal == "gold":
                pattern = r"(?:FINE|Hallmark|Tola|छापावाल).{0,100}?(\d{5,6})"
                min_p, max_p = 100000, 1000000
            elif metal == "tejabi":
                pattern = r"(?:Tejabi|Tajabi|तेजाबी|Tola).{0,100}?(\d{5,6})"
                min_p, max_p = 100000, 1000000
            else:
                pattern = r"(?:SILVER|Tola|चाँदी).{0,100}?(\d{4,5})"
                min_p, max_p = 1000, 15000

            matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
            if not matches:
                raw_p = r"(\d{5,6})" if metal in ["gold", "tejabi"] else r"(\d{4,5})"
                matches = re.findall(raw_p, content)

            valid = []
            for m in matches:
                val = int(m)
                if val in blacklist: continue
                if min_p <= val <= max_p:
                    valid.append(val)
            if valid: return valid
            
            # If no valid prices found but request was successful, don't retry, just return empty
            return []
            
        except Exception as e:
            print(f"DEBUG: Attempt {attempt+1} failed for {url} ({metal}): {e}")
            if attempt < max_retries - 1:
                time.sleep(5)
            else:
                print(f"ERROR: All {max_retries} attempts failed for {url}")
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
    file = 'public/data.json'
    timestamp = int(time.time())
    widget_url = f"https://www.ashesh.com.np/gold/widget.php?api=521224q192&t={timestamp}"

    f_data = fetch_fenegosida()
    f_gold = [f_data['gold']] if f_data['gold'] > 0 else []
    f_silver = [f_data['silver']] if f_data['silver'] > 0 else []
    f_usd = f_data['usd']

    a_gold = get_candidates(widget_url, "gold")
    a_tejabi = get_candidates(widget_url, "tejabi")
    a_silver = get_candidates(widget_url, "silver")

    live_currencies, currency_history = fetch_nrb_currencies(days=95)
    
    usd_history_map = fetch_usd_history(days=90)
    live_usd = 0
    if usd_history_map:
        sorted_dates = sorted(usd_history_map.keys(), reverse=True)
        live_usd = usd_history_map[sorted_dates[0]]

    # Prefer FENEGOSIDA's own dollar rate, then NRB, then Yahoo as last resort
    if f_usd > 0:
        live_usd = f_usd
    elif 'USD' in live_currencies:
        live_usd = live_currencies['USD']['sell']

    primary_gold = max(f_gold) if f_gold else 0
    backup_gold = max(a_gold) if a_gold else 0
    final_gold, gold_verified = verify_price(primary_gold, backup_gold)
    
    primary_silver = max(f_silver) if f_silver else 0
    backup_silver = max(a_silver) if a_silver else 0
    final_silver, silver_verified = verify_price(primary_silver, backup_silver)
    
    # Tejabi logic: Prioritize Ashesh (FENEGOSIDA's new site no longer publishes tejabi)
    backup_tejabi = max(a_tejabi) if a_tejabi else 0
    
    if backup_tejabi > 0:
        final_tejabi = backup_tejabi
        tejabi_verified = True
        tejabi_source = "Ashesh (Tejabi)"
    else:
        final_tejabi = int(final_gold * 0.991)
        tejabi_verified = False
        tejabi_source = "Calculated"

    sources = []
    if f_gold and final_gold == primary_gold: sources.append("FENEGOSIDA")
    elif a_gold: sources.append("Ashesh")
    sources.append(tejabi_source)
    
    source_info = " / ".join(sources) if sources else "None"
    
    history = []
    if os.path.exists(file):
        try:
            with open(file, 'r') as f: 
                content = f.read().strip()
                if content:
                    history = json.loads(content)
        except:
            history = []

    if (final_gold == 0 or final_silver == 0) and history:
        final_gold = final_gold or history[-1].get('gold', 0)
        final_silver = final_silver or history[-1].get('silver', 0)
        final_tejabi = final_tejabi or history[-1].get('tejabi', int(final_gold * 0.991))
        source_info = "Recovery (Last Known)"
    
    # NOTIFICATION LOGIC: Compare with the very last saved record
    if history:
        last = history[-1]
        change_g = final_gold - last['gold']
        change_s = final_silver - last['silver']
        change_t = final_tejabi - last.get('tejabi', 0)
        
        # Only trigger if at least one value changed
        if change_g != 0 or change_s != 0 or change_t != 0:
            send_push_notification(final_gold, final_tejabi, final_silver, change_g, change_t, change_s)
        else:
            print("INFO: No price change since last scrape. Skipping notification.")

    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    # Build today's currency list (all TRACKED_CURRENCIES from NRB; skip
    # entries missing from the live feed and leave INR out - it's a fixed peg)
    today_currencies = []
    today_key = today_str
    day_history = currency_history.get(today_key, {})
    fallback_day = None
    if day_history:
        fallback_day = day_history
    else:
        # If NRB hasn't published today yet, use yesterday's row
        for key in sorted(currency_history.keys(), reverse=True):
            if key < today_key:
                fallback_day = currency_history[key]
                break
    for code in TRACKED_CURRENCIES:
        if code in live_currencies:
            today_currencies.append({'code': code, **live_currencies[code]})
        else:
            prev = (fallback_day or {}).get(code)
            if prev:
                today_currencies.append({'code': code, **prev})

    # Backfill currency history into past entries (up to 3 months)
    backfilled = 0
    for entry in history:
        date_key = str(entry.get('date', ''))[:10]
        if 'currencies' in entry:
            continue
        day_map = currency_history.get(date_key)
        if not day_map:
            continue
        entry['currencies'] = [{'code': code, **day_map[code]} for code in TRACKED_CURRENCIES if code in day_map]
        backfilled += 1
    if backfilled:
        print(f"INFO: Backfilled currency history into {backfilled} past entries")

    new_entry = {
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "gold": final_gold,
        "tejabi": final_tejabi,
        "silver": final_silver,
        "usd": live_usd,
        "currencies": today_currencies,
        "source": source_info,
        "verified": gold_verified and silver_verified and tejabi_verified
    }

    if history and history[-1]['date'].startswith(today_str):
        if new_entry['usd'] == 0:
            new_entry['usd'] = history[-1].get('usd', 0)
        if not new_entry['currencies']:
            new_entry['currencies'] = history[-1].get('currencies', [])
        history[-1] = new_entry
    else:
        history.append(new_entry)

    with open(file, 'w') as f:
        json.dump(history[-1000:], f, indent=4)
    
    print(f"SUCCESS: Gold {final_gold} (tola), Tejabi {final_tejabi} (tola), Silver {final_silver} (tola), USD {live_usd} via {source_info}")
    if live_currencies:
        print(f"INFO: Stored {len(today_currencies)} currency rates for today")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test-notify":
        print("RUNNING NOTIFICATION TEST...")
        send_push_notification(120000, 119000, 1450, 100, 100, 10)
    else:
        update()
