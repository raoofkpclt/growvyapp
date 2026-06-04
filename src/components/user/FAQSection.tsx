import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { translations, FAQ_DATA } from "../../constant/Constant";

interface Props {
  language: "en" | "ar";
}

const FAQSection = ({ language }: Props) => {
  const [active, setActive] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setActive(active === index ? null : index);
  };

  const t = translations[language];

  return (
    <section
      dir={language === "ar" ? "rtl" : "ltr"}
      className="px-[5%] py-32 relative overflow-hidden"
    >
      {/* Glow */}
      <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-orange-500/10 blur-[140px] rounded-full" />

      <div className="relative z-10 max-w-[1000px] mx-auto">
        {/* Heading */}
        <SectionLabel>{t.faq}</SectionLabel>

        <div className="text-center mb-20">
          <h2 className="text-[clamp(3rem,7vw,6rem)] font-black leading-[0.95] tracking-[-0.05em]">
            {t.faqTitle1}
            <span className="block text-orange-400">
              {t.faqTitle2}
            </span>
          </h2>
        </div>

        {/* FAQ Items */}
        <div className="flex flex-col gap-6">
          {FAQ_DATA.map((item, index) => (
            <div
              key={index}
              className="border-b border-white/10 pb-6"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="text-xl md:text-2xl font-semibold">
                  {item[language].question}
                </h3>

                <ChevronDown
                  className={`transition duration-300 ${
                    active === index ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-500 ${
                  active === index
                    ? "max-h-[300px] opacity-100 mt-6"
                    : "max-h-0 opacity-0"
                }`}
              >
                <p className="text-white/60 leading-[1.9] max-w-[850px]">
                  {item[language].answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SectionLabel: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div className="flex items-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-6">
    <div className="w-10 h-px bg-yellow-400" />

    {children}
  </div>
);

export default FAQSection;