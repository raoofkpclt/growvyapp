import React from "react";
import Nav from "../../components/user/Modal/Nav";
import { translations, values } from "../../constant/Constant";
import Footer from "../../components/user/Footer";
import { useLanguage } from "../../context/LanguageContext";

const About: React.FC = () => {
  const { language, changeLanguage } = useLanguage();

  const t = translations[language];

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      className={`bg-[#081120] text-white overflow-x-hidden min-h-screen relative ${
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

      <section className="px-[5%] pt-24 pb-20">
        <div className="max-w-[1200px] mx-auto text-center">
          {/* LABEL */}
          <div className="flex items-center justify-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">
            <div className="w-10 h-px bg-yellow-400" />
            {t.aboutLabel}
            <div className="w-10 h-px bg-yellow-400" />
          </div>

          {/* HEADING */}
          <h1 className="text-[clamp(3.5rem,8vw,7rem)] font-black leading-[0.9] tracking-[-0.05em]">
            {t.aboutHeroTitle1}
            <br />

            <span className="text-orange-400">{t.aboutHeroTitle2}</span>
          </h1>

          {/* DESCRIPTION */}
          <p className="mt-10 text-white/60 text-lg leading-[2] max-w-[850px] mx-auto">
            {t.aboutHeroDesc}
          </p>

          {/* STATS */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-14">
            <div className="px-8 py-6">
              <h2 className="text-5xl font-black text-yellow-400">150+</h2>

              <p className="mt-2 text-white/60">{t.projectsCompleted}</p>
            </div>

            <div className="w-px h-20 bg-white/10 hidden md:block" />

            <div className="px-8 py-6">
              <h2 className="text-5xl font-black text-yellow-400">80+</h2>

              <p className="mt-2 text-white/60">{t.happyClientsText}</p>
            </div>
          </div>

          {/* IMAGE */}
          <div className="flex justify-center mt-20">
            <div className="relative w-full max-w-[800px] overflow-hidden rounded-[40px]">
              <img
                src="/img/vectors/16.png"
                alt="Growvy"
                className="w-full object-cover"
              />

              {/* OVERLAY */}
              {/* <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" /> */}

              {/* FLOATING CONTENT */}
              {/* <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl px-8 py-6 max-w-[700px]">
          <h3 className="text-3xl font-bold">
            We Create Impact
          </h3>

          <p className="mt-3 text-white/60 leading-[1.8]">
            Combining creativity, technology, and strategy to deliver
            meaningful digital experiences.
          </p>
        </div> */}
            </div>
          </div>
        </div>
      </section>

      {/* OUR STORY */}

      <section className="px-[5%] py-24">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[40px] p-10 md:p-16">
            <div className="grid lg:grid-cols-2 gap-20">
              <div>
                <div className="flex items-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">
                  <div className="w-10 h-px bg-yellow-400" />

                  {t.ourStory}
                </div>

                <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[1] tracking-[-0.05em]">
                  {t.storyTitle1}
                  <br />

                  {t.storyTitle2}
                </h2>
              </div>

              <div>
                <p className="text-white/60 leading-[2] text-lg">
                  {t.storyDesc1}
                </p>

                <p className="text-white/60 leading-[2] text-lg mt-8">
                  {t.storyDesc2}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}

      <section className="px-[5%] py-24">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center">
            <div className="flex justify-center items-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">
              <div className="w-10 h-px bg-yellow-400" />

              {t.ourValues}

              <div className="w-10 h-px bg-yellow-400" />
            </div>

            <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[1] tracking-[-0.05em]">
              {t.valuesTitle1}
              <span className="text-orange-400"> {t.valuesTitle2}</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
            {values.map((item, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[30px] p-10"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-3xl mb-8">
                  ✦
                </div>

                <h3 className="text-3xl font-bold">{item[language].title}</h3>

                <p className="mt-6 text-white/60 leading-[2]">
                  {item[language].desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <Footer />
    </div>
  );
};

export default About;
