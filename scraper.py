import requests
import json
import datetime
import os
import re
from bs4 import BeautifulSoup
from typing import Tuple, Optional, Dict, List
import logging

# Set up logging

logging.basicConfig(
level=logging.INFO,
format=’%(asctime)s - %(levelname)s - %(message)s’
)
logger = logging.getLogger(**name**)

class PriceScraper:
“”“Scraper for gold and silver prices from FENEGOSIDA”””

```
# Default fallback prices
FALLBACK_GOLD = 304700
FALLBACK_SILVER = 5600
FALLBACK_SOURCE = "Market Fallback"

# Price validation ranges
GOLD_MIN = 250000
GOLD_MAX = 400000
SILVER_MIN = 3000
SILVER_MAX = 15000

# Request configuration
TIMEOUT = 30
BASE_URL = "https://www.fenegosida.org/"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://www.google.com/'
}

def __init__(self):
    self.session = requests.Session()
    self.session.headers.update(self.HEADERS)

def fetch_page(self) -> Optional[str]:
    """Fetch the webpage content with retry logic"""
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Fetching page (attempt {attempt + 1}/{max_retries})...")
            response = self.session.get(
                self.BASE_URL, 
                timeout=self.TIMEOUT,
                allow_redirects=True
            )
            response.raise_for_status()
            
            logger.info(f"Successfully fetched page (status: {response.status_code})")
            return response.text
            
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout on attempt {attempt + 1}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed on attempt {attempt + 1}: {e}")
        
        if attempt < max_retries - 1:
            logger.info("Retrying in 2 seconds...")
            import time
            time.sleep(2)
    
    logger.error("All fetch attempts failed")
    return None

def extract_prices_from_soup(self, soup: BeautifulSoup) -> Tuple[List[int], List[int]]:
    """Extract gold and silver prices from parsed HTML"""
    
    # Remove unwanted elements
    for element in soup(["script", "style", "noscript", "iframe"]):
        element.decompose()
    
    gold_prices = []
    silver_prices = []
    
    # Strategy 1: Look for table rows
    tables = soup.find_all('table')
    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            row_text = row.get_text(separator=' ', strip=True).lower()
            cells = row.find_all(['td', 'th'])
            
            if 'fine gold' in row_text or 'gold' in row_text:
                prices = self._extract_numbers_from_cells(cells)
                gold_candidates = [p for p in prices if self.GOLD_MIN <= p <= self.GOLD_MAX]
                gold_prices.extend(gold_candidates)
            
            if 'silver' in row_text and 'fine' not in row_text:
                prices = self._extract_numbers_from_cells(cells)
                silver_candidates = [p for p in prices if self.SILVER_MIN <= p <= self.SILVER_MAX]
                silver_prices.extend(silver_candidates)
    
    # Strategy 2: Look for divs/spans with price classes
    price_containers = soup.find_all(['div', 'span', 'p'], class_=re.compile(r'price|rate|value', re.I))
    for container in price_containers:
        text = container.get_text(strip=True).lower()
        
        if 'gold' in text:
            numbers = self._extract_numbers_from_text(container.get_text())
            gold_candidates = [n for n in numbers if self.GOLD_MIN <= n <= self.GOLD_MAX]
            gold_prices.extend(gold_candidates)
        
        if 'silver' in text:
            numbers = self._extract_numbers_from_text(container.get_text())
            silver_candidates = [n for n in numbers if self.SILVER_MIN <= n <= self.SILVER_MAX]
            silver_prices.extend(silver_candidates)
    
    # Strategy 3: Text-based search (your original approach, improved)
    text_content = soup.get_text(separator='|')
    lines = [line.strip() for line in text_content.split('|') if line.strip()]
    
    for i, line in enumerate(lines):
        clean_line = line.lower()
        
        # Look for gold prices
        if 'fine gold' in clean_line or ('gold' in clean_line and '999' in clean_line):
            # Get context (current line + next few)
            context = ' '.join(lines[i:min(i+5, len(lines))])
            numbers = self._extract_numbers_from_text(context)
            gold_candidates = [n for n in numbers if self.GOLD_MIN <= n <= self.GOLD_MAX]
            gold_prices.extend(gold_candidates)
        
        # Look for silver prices
        if 'silver' in clean_line and 'gold' not in clean_line:
            context = ' '.join(lines[i:min(i+5, len(lines))])
            numbers = self._extract_numbers_from_text(context)
            silver_candidates = [n for n in numbers if self.SILVER_MIN <= n <= self.SILVER_MAX]
            silver_prices.extend(silver_candidates)
    
    return gold_prices, silver_prices

def _extract_numbers_from_cells(self, cells) -> List[int]:
    """Extract valid numbers from table cells"""
    numbers = []
    for cell in cells:
        text = cell.get_text(strip=True)
        nums = self._extract_numbers_from_text(text)
        numbers.extend(nums)
    return numbers

def _extract_numbers_from_text(self, text: str) -> List[int]:
    """Extract numbers from text, handling commas and various formats"""
    # Remove commas and clean the text
    cleaned = text.replace(',', '').replace('Rs.', '').replace('NPR', '')
    
    # Find all number sequences
    pattern = r'\b\d{4,6}\b'
    matches = re.findall(pattern, cleaned)
    
    # Convert to integers and filter out purity markers (999, 9999)
    numbers = []
    for match in matches:
        try:
            num = int(match)
            # Skip purity indicators
            if num not in [999, 9999]:
                numbers.append(num)
        except ValueError:
            continue
    
    return numbers

def select_best_price(self, prices: List[int], price_type: str = "gold") -> Optional[int]:
    """Select the most likely correct price from candidates"""
    if not prices:
        return None
    
    # Remove duplicates while preserving order
    unique_prices = list(dict.fromkeys(prices))
    
    if len(unique_prices) == 1:
        return unique_prices[0]
    
    # For multiple candidates, prefer the most common one
    from collections import Counter
    price_counts = Counter(prices)
    most_common = price_counts.most_common(1)[0][0]
    
    logger.info(f"Found multiple {price_type} prices: {unique_prices}, selected: {most_common}")
    return most_common

def get_live_prices(self) -> Tuple[int, int, str]:
    """Main method to scrape and return prices"""
    
    # Fetch the page
    html_content = self.fetch_page()
    if not html_content:
        logger.warning("Using fallback prices due to fetch failure")
        return self.FALLBACK_GOLD, self.FALLBACK_SILVER, self.FALLBACK_SOURCE
    
    # Parse HTML
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
    except Exception as e:
        logger.error(f"Failed to parse HTML: {e}")
        return self.FALLBACK_GOLD, self.FALLBACK_SILVER, self.FALLBACK_SOURCE
    
    # Extract prices
    gold_prices, silver_prices = self.extract_prices_from_soup(soup)
    
    # Select best prices
    gold = self.select_best_price(gold_prices, "gold") or self.FALLBACK_GOLD
    silver = self.select_best_price(silver_prices, "silver") or self.FALLBACK_SILVER
    
    # Determine source
    source = "FENEGOSIDA Official" if (gold_prices and silver_prices) else "Partial Scrape"
    if not gold_prices and not silver_prices:
        source = self.FALLBACK_SOURCE
        gold = self.FALLBACK_GOLD
        silver = self.FALLBACK_SILVER
    
    logger.info(f"Scraped prices - Gold: {gold}, Silver: {silver}, Source: {source}")
    return gold, silver, source
```

class PriceDataManager:
“”“Manages price data storage and history”””

```
def __init__(self, filepath: str = 'data.json', max_history: int = 30):
    self.filepath = filepath
    self.max_history = max_history

def load_history(self) -> List[Dict]:
    """Load price history from JSON file"""
    if not os.path.exists(self.filepath):
        logger.info("No existing data file, starting fresh")
        return []
    
    try:
        with open(self.filepath, 'r', encoding='utf-8') as f:
            history = json.load(f)
            logger.info(f"Loaded {len(history)} historical entries")
            return history
    except (json.JSONDecodeError, IOError) as e:
        logger.error(f"Failed to load history: {e}")
        return []

def save_history(self, history: List[Dict]) -> bool:
    """Save price history to JSON file"""
    try:
        # Keep only the most recent entries
        trimmed_history = history[-self.max_history:]
        
        with open(self.filepath, 'w', encoding='utf-8') as f:
            json.dump(trimmed_history, f, indent=4, ensure_ascii=False)
        
        logger.info(f"Saved {len(trimmed_history)} entries to {self.filepath}")
        return True
    except IOError as e:
        logger.error(f"Failed to save history: {e}")
        return False

def add_entry(self, gold: int, silver: int, source: str) -> bool:
    """Add a new price entry, updating today's entry if it exists"""
    history = self.load_history()
    
    # Get current Nepal time (UTC+5:45)
    nepal_offset = datetime.timedelta(hours=5, minutes=45)
    nepal_time = datetime.datetime.now(datetime.timezone.utc) + nepal_offset
    
    timestamp = nepal_time.strftime("%Y-%m-%d %H:%M")
    today_str = nepal_time.strftime("%Y-%m-%d")
    
    new_entry = {
        "date": timestamp,
        "gold": gold,
        "silver": silver,
        "source": source
    }
    
    # Update or append entry
    if history and history[-1]['date'].startswith(today_str):
        logger.info("Updating today's existing entry")
        history[-1] = new_entry
    else:
        logger.info("Adding new entry for today")
        history.append(new_entry)
    
    return self.save_history(history)
```

def main():
“”“Main execution function”””
logger.info(“Starting price update process…”)

```
try:
    # Scrape prices
    scraper = PriceScraper()
    gold, silver, source = scraper.get_live_prices()
    
    # Save data
    data_manager = PriceDataManager()
    success = data_manager.add_entry(gold, silver, source)
    
    if success:
        print(f"✓ Update successful - Gold: {gold:,}, Silver: {silver:,}, Source: {source}")
        logger.info("Update process completed successfully")
    else:
        print(f"⚠ Update completed with warnings - Gold: {gold:,}, Silver: {silver:,}")
        logger.warning("Data saved with issues")
        
except Exception as e:
    logger.error(f"Unexpected error in main: {e}", exc_info=True)
    print(f"✗ Update failed: {e}")
```

if **name** == “**main**”:
main()