/*
 * Copyright (c) 2024-2026 Timeswantstocode. All Rights Reserved.
 * This software is proprietary and may not be copied, modified, or distributed.
 * See LICENSE file for details.
 */

// Country flags via flag-icons (SVG). Emoji flags (e.g. 🇺🇸, 🇳🇵) are NOT
// rendered on Windows Chromium — they show as plain letter pairs (US, NP, ...).
// flag-icons draws real flag SVGs that work on every browser. The `.fi`
// class is em-based (width 1.333em), so sizes follow the font-size of the
// surrounding span, like the emoji flags they replace.
// The stylesheet is trimmed with sass to only bundle the flags we use.
// flag-icons keys are ISO country codes (us, gb, ...), so currency codes
// (USD, GBP, ...) are translated here before hitting the CSS.

// Currency code -> flag-icons country code
const CURRENCY_COUNTRY = {
  USD: 'us', INR: 'in', GBP: 'gb', AUD: 'au', JPY: 'jp',
  KRW: 'kr', AED: 'ae', EUR: 'eu', NPR: 'np',
};

const Flag = ({ code, className = '', rounded = true }) => {
  if (!code) return null;
  const c = CURRENCY_COUNTRY[String(code).toUpperCase()] || String(code).toLowerCase();
  return (
    <span
      className={`fi fi-${c} inline-block align-[-0.125em] ${rounded ? 'rounded-[3px] overflow-hidden' : ''} ${className}`}
      aria-hidden="true"
    />
  );
};

export default Flag;