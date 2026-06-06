import React from "react";
import { useLanguage } from "../../context/LanguageContext";
import Nav from "../../components/user/Modal/Nav";
import {
  translations,
  SERVICES_DROPDOWN,
  WHY_GROWVY,
} from "../../constant/Constant";
import Footer from "../../components/user/Footer";

// ─────────────────────────────────────────────

const Services = () => {
  const { language, changeLanguage } = useLanguage();

  const t = translations[language];

  // ─────────────────────────────────────────────

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      className={`min-h-screen bg-[#081120] text-white overflow-x-hidden ${
        language === "ar" ? "font-[Cairo]" : "font-sans"
      }`}
    >
      {/* GRID BACKGROUND */}

      <div
        className="fixed inset-0 -z-20 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* GLOW EFFECTS */}

      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-blue-600/20 blur-[140px] rounded-full" />

        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-cyan-500/20 blur-[160px] rounded-full" />
      </div>

      {/* NAVBAR */}

      <Nav language={language} setLanguage={changeLanguage} />

      {/* HERO */}

      <section className="px-[5%] pt-20 pb-14">
        <div className="max-w-[1400px] mx-auto text-center">
          <div className="flex items-center justify-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">
            <div className="w-10 h-px bg-yellow-400" />

            {language === "en" ? "Our Services" : "خدماتنا"}

            <div className="w-10 h-px bg-yellow-400" />
          </div>

          <h1 className="text-[clamp(3rem,8vw,7rem)] font-black leading-[0.9] tracking-[-0.05em]">
            {language === "en" ? "Creative" : "حلول"}

            <br />

            <span className="text-orange-400">
              {language === "en" ? "Solutions" : "إبداعية"}
            </span>
          </h1>

          <p className="max-w-[750px] mx-auto mt-8 text-white/60 text-lg leading-[2]">
            {language === "en"
              ? "We provide strategic branding, digital experiences, cinematic production, web development, creative campaigns, and modern marketing solutions tailored for ambitious brands."
              : "نقدم حلولاً إبداعية متكاملة تشمل الهوية التجارية، التسويق الرقمي، إنتاج الفيديو، تطوير المواقع، والحملات التسويقية الحديثة للعلامات التجارية الطموحة."}
          </p>
        </div>
      </section>

      {/* SERVICES GRID */}

      {/* SERVICES DROPDOWN */}

      <section className="px-[5%] pb-32">
        <div className="max-w-[1000px] mx-auto text-center">
          <div>
            <img
              src="/img/vectors/6.png"
              alt=""
              className="
    w-[280px]
    md:w-[300px]
    mx-auto
    mb-10
    object-contain
    opacity-90
    animate-float
  "
            />
          </div>
          {/* HEADING */}
          <div className="mb-20">
            <div className="flex items-center justify-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">
              {/* <div className="w-10 h-px bg-yellow-400" />
              
              <div className="w-10 h-px bg-yellow-400" /> */}
            </div>

            <h2 className="text-[clamp(3rem,7vw,6rem)] font-black leading-[0.95] tracking-[-0.05em]">
              {t.servicesPageTitle1}
              <span className="block text-orange-400">
                {t.servicesPageTitle2}
              </span>
            </h2>
          </div>

          {/* SERVICES */}
          <div className="flex flex-col gap-6">
            {SERVICES_DROPDOWN.map((service, index) => (
              <details
                key={index}
                className="
            group
            bg-white/[0.03]
            border
            border-white/10
            rounded-[32px]
            px-8
            py-8
            backdrop-blur-xl
            transition
            duration-500
            hover:border-orange-400/30
          "
              >
                {/* TITLE */}
                <summary
                  className="
              list-none
              cursor-pointer
              flex
              flex-col
              items-center
              justify-center
            "
                >
                  <h3
                    className="
                text-2xl
                md:text-4xl
                font-black
                group-open:text-orange-400
                transition
              "
                  >
                    {service[language].title}
                  </h3>
                </summary>

                {/* CONTENT */}
                <div
                  className="
              overflow-hidden
              transition-all
              duration-500
            "
                >
                  <p
                    className="
                mt-8
                text-white/60
                text-lg
                leading-[2]
                max-w-[700px]
                mx-auto
              "
                  >
                    {service[language].description}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}

      <section className="px-[5%] pb-32">
        <div className="max-w-[1400px] mx-auto">
          <div
            className="
            bg-white/5
            border
            border-white/10
            backdrop-blur-xl
            rounded-[40px]
            p-10
            md:p-16
            overflow-hidden
            relative
            "
          >
            {/* GLOW */}

            <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full" />

            <div className="grid lg:grid-cols-2 gap-20 items-center">
              {/* LEFT */}

              <div>
                <div className="flex items-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">
                  <div className="w-10 h-px bg-yellow-400" />
                  {t.whyChooseGrowvy}
                </div>

                <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[1] tracking-[-0.05em]">
                  {t.whyTitleSer1}

                  <span className="text-orange-400"> {t.whyTitleSer2}</span>
                </h2>
              </div>

              {/* RIGHT */}

              <div className="space-y-8">
                {WHY_GROWVY.map((item, index) => (
                  <div key={index} className="flex items-start gap-5">
                    <div
                      className="
                      w-12
                      h-12
                      rounded-2xl
                      bg-yellow-500/10
                      border
                      border-yellow-400/20
                      flex
                      items-center
                      justify-center
                      text-yellow-400
                      text-xl
                      flex-shrink-0
                      "
                    >
                      ✦
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold">
                        {item[language].title}
                      </h3>

                      <p className="mt-3 text-white/50 leading-[1.8]">
                        {item[language].description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <Footer />
    </div>
  );
};

export default Services;
