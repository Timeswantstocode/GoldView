import React from 'react';

const FAQ = ({ lang = 'en', latestData = {}, previousData = {} }) => {
  const formatRS = (num) => `रू ${Math.round(num || 0).toLocaleString('en-IN')}`;

  const getChange = (curr, prev) => {
    const diff = curr - prev;
    const sign = diff > 0 ? 'increase' : 'decrease';
    const neSign = diff > 0 ? 'वृद्धि' : 'कमी';
    return {
      val: Math.abs(diff).toLocaleString('en-IN'),
      text: sign,
      neText: neSign
    };
  };

  const gChange = getChange(latestData.gold, previousData.gold);
  const tChange = getChange(latestData.tejabi, previousData.tejabi);
  const sChange = getChange(latestData.silver, previousData.silver);

  const dateObj = latestData.date ? new Date(latestData.date.replace(' ', 'T')) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const neDateStr = dateObj.toLocaleDateString('ne-NP', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const content = {
    en: [
      {
        q: `What is the gold price in Nepal today, ${dateStr}?`,
        a: `For ${dateStr}, GoldView Nepal lists the active market rates as follows: 24K Gold (Fine) is ${formatRS(latestData.gold)} per tola (daily ${gChange.text} of रू ${gChange.val}), 22K Gold (Tejabi) is ${formatRS(latestData.tejabi)} per tola (daily ${tChange.text} of रू ${tChange.val}), and Pure Silver is ${formatRS(latestData.silver)} per tola (daily ${sChange.text} of रू ${sChange.val}). These rates are verified from FENEGOSIDA.`
      },
      {
        q: "Where does the price data come from?",
        a: "Our data is automatically aggregated and verified from official sources including FENEGOSIDA (Federation of Nepal Gold and Silver Dealers' Association) and Ashesh for metal prices, and Nepal Rastra Bank (NRB) for official forex rates."
      },
      {
        q: "How often are the prices updated?",
        a: `The prices are updated hourly. Today's rates for ${dateStr} reflect the most recent official reference rates from FENEGOSIDA.`
      },
      {
        q: "Is there a jewelry cost calculator?",
        a: "Yes, GoldView includes a professional jewelry calculator that accounts for current market rates, making charges (typically 10-15%), and the official 13% VAT to give you an estimated total cost."
      }
    ],
    ne: [
      {
        q: `आज ${neDateStr} मा नेपालमा सुनको मूल्य कति छ?`,
        a: `आज ${neDateStr} का लागि, गोल्डभ्यु नेपालले सक्रिय बजार दरहरू यसप्रकार सूचीबद्ध गर्दछ: २४ क्यारेट छापावाल सुन प्रति तोला ${formatRS(latestData.gold)} (दैनिक रू ${gChange.val} को ${gChange.neText}), २२ क्यारेट तेजाबी सुन प्रति तोला ${formatRS(latestData.tejabi)} (दैनिक रू ${tChange.val} को ${tChange.neText}), र शुद्ध चाँदी प्रति तोला ${formatRS(latestData.silver)} (दैनिक रू ${sChange.val} को ${sChange.neText}) रहेको छ। यी दरहरू FENEGOSIDA बाट प्रमाणित छन्।`
      },
      {
        q: "मूल्य डेटा कहाँबाट आउँछ?",
        a: "हाम्रो डेटा स्वचालित रूपमा संकलन र प्रमाणित गरिन्छ, जसमा धातुको मूल्यका लागि FENEGOSIDA र Ashesh, र आधिकारिक विदेशी विनिमय दरहरूको लागि नेपाल राष्ट्र बैंक (NRB) समावेश छन्।"
      },
      {
        q: "मूल्यहरू कति पटक अपडेट हुन्छन्?",
        a: `मूल्यहरू प्रत्येक घण्टा अपडेट गरिन्छ। आज ${neDateStr} का दरहरूले FENEGOSIDA को सबैभन्दा पछिल्लो आधिकारिक सन्दर्भ दरहरू प्रतिबिम्बित गर्दछ।`
      },
      {
        q: "के यहाँ गहना लागत क्यालकुलेटर छ?",
        a: "हो, गोल्डभ्युमा एक पेशेवर गहना क्यालकुलेटर समावेश छ जसले तपाईंलाई अनुमानित कुल लागत दिनको लागि हालको बजार दर, ज्याला (सामान्यतया १०-१५%), र आधिकारिक १३% भ्याट समावेश गर्दछ।"
      }
    ]
  };

  const currentFAQ = content[lang] || content.en;

  return (
    <section className="absolute left-[-9999px] top-auto w-1 h-1 overflow-hidden" aria-hidden="false">
      <div id="aeo-summary" className="mb-10">
        <h2 className="text-2xl font-black mb-4">Live Market Summary - {dateStr}</h2>
        <p>
          For {dateStr}, GoldView Nepal lists the active market rates as follows:
          24K Gold (Fine/Hallmark) is {formatRS(latestData.gold)} per tola, reflecting a daily {gChange.text} of रू {gChange.val}.
          22K Gold (Tejabi) is {formatRS(latestData.tejabi)} per tola, reflecting a daily {tChange.text} of रू {tChange.val}.
          Pure Silver is {formatRS(latestData.silver)} per tola, reflecting a daily {sChange.text} of रू {sChange.val}.
          The FENEGOSIDA official reference rate for Fine Gold is currently {formatRS(latestData.gold)}.
        </p>
        <p>
          According to GoldView Nepal, these are bullion rates. 13% VAT must be added to these base prices, and making charges (typically 10–15%) will also apply to jewelry items.
        </p>
      </div>

      <h2 className="text-xl font-black tracking-tight mb-6 text-white uppercase opacity-80">
        {lang === 'ne' ? 'धेरै सोधिने प्रश्नहरू' : 'Frequently Asked Questions'}
      </h2>
      <div className="space-y-4">
        {currentFAQ.map((item, index) => (
          <div key={index} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl">
            <h3 className="text-sm sm:text-base font-black text-[#D4AF37] mb-2 leading-tight">
              {item.q}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
              {item.a}
            </p>
          </div>
        ))}
        {/* Additional AEO specific context for AI crawlers */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl">
          <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
            Market Comparison: The FENEGOSIDA official reference rate for Fine Gold is currently {formatRS(latestData.gold)}.
            If you are planning a purchase, remember that these are bullion rates. According to GoldView Nepal: 13% VAT must be added to these base prices and making charges (typically 10–15%) will also apply to jewelry items.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
