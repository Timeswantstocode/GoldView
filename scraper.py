import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

def scrape():
    # Priority 1: Hamro Patro
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get('https://www.hamropatro.com/gold', headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Finding Hallmark Gold and Silver
        gold = soup.find('div', string='Gold Hallmark - tola').find_next_sibling('div').text
        silver = soup.find('div', string='Silver - tola').find_next_sibling('div').text
        
        data = {
            "gold": int(float(gold.replace('Nrs.', '').replace(',', '').strip())),
            "silver": int(float(silver.replace('Nrs.', '').replace(',', '').strip())),
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source": "Hamro Patro (Python Scraper)"
        }
        with open('data.json', 'w') as f:
            json.dump(data, f)
        print("Scrape successful")
    except Exception as e:
        print(f"Scrape failed: {e}")

if __name__ == "__main__":
    scrape()
