import requests, json, datetime, os, re
from bs4 import BeautifulSoup

def get_live_prices():
    headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'}
    # Base fallback prices
    gold, silver, source = 318800, 7065, "Market Fallback"
    try:
        r = requests.get("https://www.fenegosida.org/", headers=headers, timeout=20)
        soup = BeautifulSoup(r.text, 'html.parser')
        text = soup.get_text()
        
        # Hunt for Gold (6 digits) and Silver (4 digits)
        nums = re.findall(r'(\d{4,6})', text)
        for n in nums:
            val = int(n)
            if 250000 < val < 500000: gold = val; source = "FENEGOSIDA Official"
            if 5000 < val < 15000: silver = val
    except: pass
    return gold, silver, source

def update():
    gold, silver, src = get_live_prices()
    file = 'data.json'
    if os.path.exists(file):
        with open(file, 'r') as f: history = json.load(f)
    else: history = []

    now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=45)
    today_str = now.strftime("%Y-%m-%d")
    
    new_entry = {"date": now.strftime("%Y-%m-%d %H:%M"), "gold": gold, "silver": silver, "source": src}

    # If today's data already exists, update it. If not, append it.
    if history and history[-1]['date'].startswith(today_str):
        history[-1] = new_entry
    else:
        history.append(new_entry)

    with open(file, 'w') as f:
        json.dump(history[-30:], f, indent=4) # Keep rolling 30 days

if __name__ == "__main__":
    update()