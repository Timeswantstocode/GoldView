const NE_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const NE_MONTHS = ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'];
const NE_DAYS = ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहिबार', 'शुक्रबार', 'शनिबार'];

const toNeNum = (n) => String(n).replace(/\d/g, (d) => NE_DIGITS[Number(d)]);

export const formatDate = (date, lang = 'en', { weekday = false, month = 'short' } = {}) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  if (lang === 'ne') {
    const parts = [];
    if (weekday) parts.push(NE_DAYS[date.getDay()]);
    parts.push(`${NE_MONTHS[date.getMonth()]} ${toNeNum(date.getDate())}, ${toNeNum(date.getFullYear())}`);
    return parts.join(', ');
  }
  return date.toLocaleDateString('en-US', {
    weekday: weekday ? 'long' : undefined,
    month,
    day: 'numeric',
    year: 'numeric'
  });
};