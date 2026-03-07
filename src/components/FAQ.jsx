import React from 'react';

const FAQ = ({ lang = 'en' }) => {
  const content = {
    en: [
      {
        q: "What is the gold price in Nepal today?",
        a: "Gold prices in Nepal fluctuate daily based on international market trends and local demand. You can find the real-time rates for 24K Chhapawal Gold and 22K Tejabi Gold on our dashboard."
      },
      {
        q: "Where does the price data come from?",
        a: "Our data is automatically aggregated and verified from official sources including FENEGOSIDA (Federation of Nepal Gold and Silver Dealers' Association) and Ashesh for metal prices, and Nepal Rastra Bank (NRB) for official forex rates."
      },
      {
        q: "How often are the prices updated?",
        a: "The prices are updated every hour to ensure you have the most accurate and recent market information available in Nepal."
      },
      {
        q: "Is there a jewelry cost calculator?",
        a: "Yes, GoldView includes a professional jewelry calculator that accounts for current market rates, making charges, and the official 13% VAT to give you an estimated total cost."
      }
    ],
    ne: [
      {
        q: "आज नेपालमा सुनको मूल्य कति छ?",
        a: "अन्तर्राष्ट्रिय बजारको प्रवृत्ति र स्थानीय मागका आधारमा नेपालमा सुनको मूल्य दैनिक रूपमा उतारचढाव हुन्छ। तपाईंले हाम्रो ड्यासबोर्डमा २४ क्यारेट छापावाल सुन र २२ क्यारेट तेजाबी सुनको वास्तविक समयको दरहरू फेला पार्न सक्नुहुन्छ।"
      },
      {
        q: "मूल्य डेटा कहाँबाट आउँछ?",
        a: "हाम्रो डेटा स्वचालित रूपमा संकलन र प्रमाणित गरिन्छ, जसमा धातुको मूल्यका लागि FENEGOSIDA र Ashesh, र आधिकारिक विदेशी विनिमय दरहरूको लागि नेपाल राष्ट्र बैंक (NRB) समावेश छन्।"
      },
      {
        q: "मूल्यहरू कति पटक अपडेट हुन्छन्?",
        a: "तपाईंसँग नेपालमा उपलब्ध सबैभन्दा सटीक र भर्खरको बजार जानकारी छ भन्ने कुरा सुनिश्चित गर्न मूल्यहरू प्रत्येक घण्टा अपडेट गरिन्छ।"
      },
      {
        q: "के यहाँ गहना लागत क्यालकुलेटर छ?",
        a: "हो, गोल्डभ्युमा एक पेशेवर गहना क्यालकुलेटर समावेश छ जसले तपाईंलाई अनुमानित कुल लागत दिनको लागि हालको बजार दर, ज्याला, र आधिकारिक १३% भ्याट समावेश गर्दछ।"
      }
    ]
  };

  const currentFAQ = content[lang] || content.en;

  return (
    <section className="absolute left-[-9999px] top-auto w-1 h-1 overflow-hidden" aria-hidden="false">
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
      </div>
    </section>
  );
};

export default FAQ;
