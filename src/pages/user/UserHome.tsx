import React, { useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase/firebase";
import { translations, WHAT_WE_DO, WHY_GROWVY } from "../../constant/Constant";
import HomeNav from "../../components/user/Modal/HomeNav";
import ThreeBackground from "../../config/threejs/ThreeBackground";
import type { Client } from "../../utils/types/Types";
import AutoSwitchSection from "../../components/user/AutoSwitchSection";
import Footer from "../../components/user/Footer";
import FAQSection from "../../components/user/FAQSection";
import { useLanguage } from "../../context/LanguageContext";
import unoImg from "../../../public/img/vectors/7.png";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Work {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
  link?: string;
}

interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// ───────────────────────────────

const UserHome: React.FC = () => {
  const { language, changeLanguage } = useLanguage();

  const [startAnimation, setStartAnimation] = useState(false);

  const t = translations[language];

  const [scrolled, setScrolled] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);

  const [works, setWorks] = useState<Work[]>([]);

  const [services, setServices] = useState<Service[]>([]);

  // const videoRef = useRef<HTMLVideoElement>(null);

  // ─────────────────────────────────────────────

  useEffect(() => {
    console.log(scrolled, works, services);
    const fn = () => setScrolled(window.scrollY > 40);

    window.addEventListener("scroll", fn);

    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ─────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "clients"));

        if (!snap.empty) {
          setClients(
            snap.docs.map(
              (d) =>
                ({
                  id: d.id,
                  ...d.data(),
                }) as Client,
            ),
          );
        }
      } catch {
        console.log("error");
      }

      try {
        const snap = await getDocs(collection(db, "works"));

        if (!snap.empty) {
          setWorks(
            snap.docs.map(
              (d) =>
                ({
                  id: d.id,
                  ...d.data(),
                }) as Work,
            ),
          );
        }
      } catch {
        console.log("error");
      }

      try {
        const snap = await getDocs(collection(db, "services"));

        if (!snap.empty) {
          setServices(
            snap.docs.map(
              (d) =>
                ({
                  id: d.id,
                  ...d.data(),
                }) as Service,
            ),
          );
        }
      } catch {
        console.log("error");
      }
    })();
  }, []);

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      className={`bg-[#081120] text-white overflow-x-hidden relative ${
        language === "ar" ? "font-[Cairo]" : "font-sans"
      }`}
    >
      {/* GRID */}

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

      {/* GLOW */}

      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-blue-600/30 blur-[140px] rounded-full" />

        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-cyan-500/20 blur-[160px] rounded-full" />
      </div>

      {/* NAVBAR */}

      {/* HERO */}

      <section className="relative">
        {/* TOP HEADER */}

        <div className="w-full px-[5%] py-6 flex items-center justify-between relative">
          {/* EMPTY LEFT */}

          {/* CENTER LOGO */}

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            {/* LOGO IMAGE */}

            <img
              src="/img/logo-1.png"
              alt="Growvy Logo"
              className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain"
            />
          </div>

          {/* LANGUAGE SWITCH */}

          <div className="flex items-center gap-2 ml-auto ">
            {/* DESKTOP */}

            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => changeLanguage("en")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  language === "en"
                    ? "border border-orange-400 bg-orange-500/20 text-white shadow-[0_0_25px_rgba(251,146,60,0.4)]"
                    : "border border-orange-400/40 bg-white/5 backdrop-blur-xl text-white/70 shadow-[0_0_15px_rgba(251,146,60,0.15)] hover:border-orange-400 hover:bg-orange-500/10 hover:text-white hover:shadow-[0_0_25px_rgba(251,146,60,0.3)]"
                }`}
              >
                EN
              </button>

              <button
                onClick={() => changeLanguage("ar")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  language === "ar"
                    ? "border border-orange-400 bg-orange-500/20 text-white shadow-[0_0_25px_rgba(251,146,60,0.4)]"
                    : "border border-orange-400/40 bg-white/5 backdrop-blur-xl text-white/70 shadow-[0_0_15px_rgba(251,146,60,0.15)] hover:border-orange-400 hover:bg-orange-500/10 hover:text-white hover:shadow-[0_0_25px_rgba(251,146,60,0.3)]"
                }`}
              >
                عربي
              </button>
            </div>

            {/* MOBILE */}

            <div className="sm:hidden">
              <button
                onClick={() => changeLanguage(language === "en" ? "ar" : "en")}
                className="
      px-4 py-2
      rounded-full
      text-sm
      font-semibold
      text-white
      border border-orange-400
      bg-orange-500/20
      backdrop-blur-xl
      shadow-[0_0_25px_rgba(251,146,60,0.4)]
      hover:bg-orange-500/30
      hover:shadow-[0_0_35px_rgba(251,146,60,0.5)]
      transition-all
      duration-300
    "
              >
                {language === "en" ? "AR" : "EN"}
              </button>
            </div>
          </div>
        </div>

        {/* VIDEO SECTION */}

        <div className="px-[5%]">
          <div className="relative max-w-[1600px] mx-auto overflow-hidden rounded-[40px] bg-[#0b1423] shadow-[0_0_120px_rgba(34,211,238,0.08)]">
            {/* GEOMETRIC PATTERN */}

            <div
              className="absolute inset-0 opacity-[0.12] z-0"
              style={{
                backgroundImage: `
          linear-gradient(rgba(34,211,238,0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34,211,238,0.15) 1px, transparent 1px)
        `,
                backgroundSize: "60px 60px",
              }}
            />

            {/* RADIAL GLOW */}

            <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-cyan-500/20 blur-[120px] rounded-full z-0" />

            <div className="absolute bottom-[-120px] right-[-100px] w-[300px] h-[300px] bg-blue-500/20 blur-[140px] rounded-full z-0" />

            {/* HEXAGON PATTERN */}

            <div
              className="absolute inset-0 opacity-[0.05] z-0"
              style={{
                backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 2px, transparent 2px)
        `,
                backgroundSize: "50px 50px",
              }}
            />

            {/* VIDEO */}

             {/* <video
  ref={videoRef}
  autoPlay
  muted
  loop
  playsInline
  preload="auto"
  className="relative z-10 w-full h-[300px] md:h-[600px] lg:h-[850px] object-cover mix-blend-lighten opacity-[0.92]"
  onLoadedData={() => console.log("Video loaded")}
  onError={(e) => console.log("Video error", e)}
>
  <source src="/video/aa.mp4" type="video/mp4" />
</video>  */}

<video
  src="/video/aa.mp4"
  controls
  autoPlay
  muted
  loop
  style={{
    width: "100%",
    height: "600px",
    objectFit: "cover",
  }}
/>

 

            {/* DARK OVERLAY */}
          </div>
        </div>
      </section>
      {/* CLIENT LOGOS */}
      <section className="relative py-24 overflow-hidden">
        {/* LEFT FADE */}
        <div className="absolute left-0 top-0 w-40 h-full bg-gradient-to-r from-[#081120] to-transparent z-10 pointer-events-none" />

        {/* RIGHT FADE */}
        <div className="absolute right-0 top-0 w-40 h-full bg-gradient-to-l from-[#081120] to-transparent z-10 pointer-events-none" />

        {/* GRID */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
        linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
      `,
            backgroundSize: "70px 70px",
          }}
        />

        {/* GLOW */}
        <div className="absolute top-[-100px] left-[20%] w-[300px] h-[300px] bg-cyan-500/10 blur-[140px] rounded-full" />

        <div className="absolute bottom-[-100px] right-[20%] w-[300px] h-[300px] bg-blue-500/10 blur-[160px] rounded-full" />

        {/* MARQUEE */}
        <div className="relative z-20 overflow-hidden">
          <div className="flex items-center gap-24 w-max animate-marquee">
            {[...clients, ...clients].map((client, index) => (
              <div
                key={`${client.id}-${index}`}
                className="flex items-center justify-center shrink-0"
              >
                {client.profileImage ? (
                  <img
                    src={client.profileImage}
                    alt={client.name}
                    className="
                h-16 md:h-20
                w-auto
                object-contain
                grayscale
                opacity-60
                hover:grayscale-0
                hover:opacity-100
                transition-all duration-500
              "
                  />
                ) : (
                  <span className="text-white/30 text-2xl font-bold">
                    {client.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="relative min-h-screen overflow-hidden bg-[#081120]">
        {/* 3D BACKGROUND */}
        <ThreeBackground />

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#081120]/70 via-transparent to-transparent z-20 pointer-events-none" />

        {/* HERO CONTENT */}
        <div className="relative z-20 text-center mt-20 max-w-[1100px] mx-auto px-5">
          {/* BADGE */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-8">
            <span className="text-xs tracking-[0.2em] uppercase text-white/70">
              {t.heroBadge}
            </span>
          </div>

          {/* TITLE */}
          <h1 className="text-[clamp(3rem,9vw,8rem)] font-black leading-[0.95] tracking-[-0.05em] text-white">
            {t.heroTitle1}
            <br />
            <span className="text-orange-400">{t.heroTitle2}</span>
          </h1>

          {/* DESCRIPTION */}
          <p className="max-w-[700px] mx-auto mt-8 text-white/70 text-lg leading-[1.9]">
            {t.heroDesc}
          </p>

          {/* BUTTONS */}
          <div className="flex justify-center gap-5 mt-12 flex-wrap">
            <a
              href="/works"
              className="
      px-10 py-4
      rounded-full
      border border-orange-400/40
      bg-white/5
      backdrop-blur-xl
      text-white
      shadow-[0_0_25px_rgba(251,146,60,0.25)]
      hover:border-orange-400
      hover:bg-orange-500/10
      hover:shadow-[0_0_35px_rgba(251,146,60,0.45)]
      hover:scale-105
      transition-all
      duration-300
    "
            >
              {t.viewWork}
            </a>

            <a
              href="/contact"
              className="
      px-10 py-4
      rounded-full
      border border-orange-400/40
      bg-white/5
      backdrop-blur-xl
      text-white
      shadow-[0_0_25px_rgba(251,146,60,0.25)]
      hover:border-orange-400
      hover:bg-orange-500/10
      hover:shadow-[0_0_35px_rgba(251,146,60,0.45)]
      hover:scale-105
      transition-all
      duration-300
    "
            >
              {t.letsTalk}
            </a>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <HomeNav language={language} />

      <section className="relative py-24 flex justify-center items-center overflow-hidden">
        {/* GLOW */}
        <div className="absolute w-[400px] h-[400px] bg-orange-500/10 blur-[140px] rounded-full" />

        {/* IMAGE */}
        <img
          // src="/img/vectors/7.png"
          src={unoImg}
          alt="Growvy Vector"
          className="
      relative z-10
      w-[280px]
      md:w-[420px]
      lg:w-[550px]
      object-contain
      animate-spin-slow
      drop-shadow-[0_0_60px_rgba(251,146,60,0.35)]
    "
        />

        {/* TAGLINE */}
        <div className="absolute z-20 text-center">
          <h2
            className="
    text-[clamp(2rem,8vw,8rem)]
    font-black
    leading-[0.85]
    tracking-[-0.08em]
    text-white
    uppercase
    drop-shadow-[0_0_60px_rgba(34,211,238,0.45)]
  "
          >
            {t.brandingTagline1}
            <span className="block text-orange-400">{t.brandingTagline2}</span>
          </h2>
        </div>
      </section>

      <section className="relative px-[5%] py-36 overflow-hidden" id="about">
        {/* BACKGROUND GRID */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
        linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
      `,
            backgroundSize: "70px 70px",
          }}
        />

        {/* GLOW ORBS */}
        <div className="absolute top-[-120px] left-[10%] w-[300px] h-[300px] bg-cyan-500/20 blur-[140px] rounded-full" />

        <div className="absolute bottom-[-120px] right-[10%] w-[300px] h-[300px] bg-blue-500/20 blur-[160px] rounded-full" />

        {/* GEOMETRIC ELEMENTS */}

        {/* TOP RIGHT */}
        <div className="absolute top-20 right-[10%] w-32 h-32 border border-cyan-400/20 rotate-45 rounded-3xl" />

        {/* LEFT CIRCLE */}
        <div className="absolute bottom-32 left-[8%] w-24 h-24 rounded-full border border-white/10" />

        {/* SMALL DOTS */}
        <div className="absolute top-1/2 left-[15%] w-3 h-3 bg-orange-400 rounded-full shadow-[0_0_20px_#22d3ee]" />

        <div className="absolute top-[30%] right-[18%] w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_20px_#60a5fa]" />

        {/* CONTENT */}
        <div className="relative z-10 max-w-[1000px] mx-auto text-center">
          <SectionLabel>{t.whoWeAre}</SectionLabel>

          {/* TITLE */}
          <h2 className="text-[clamp(3rem,7vw,6rem)] font-black leading-[0.95] tracking-[-0.05em]">
            {t.aboutTitle}
          </h2>

          {/* DESCRIPTION */}
          <p className="max-w-[800px] mx-auto mt-10 text-white/60 leading-[2.1] text-lg md:text-xl">
            {t.aboutDesc}
          </p>

          <AutoSwitchSection language={language} />

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[30px] py-8 px-6">
              <h3 className="text-4xl font-black text-orange-400">
                {t.statsProjectsCount}
              </h3>
              <p className="text-white/50 mt-2 text-sm uppercase tracking-[0.2em]">
                {t.statsProjects}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[30px] py-8 px-6">
              <h3 className="text-4xl font-black text-orange-400">
                {t.statsClientsCount}
              </h3>
              <p className="text-white/50 mt-2 text-sm uppercase tracking-[0.2em]">
                {t.statsClients}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[30px] py-8 px-6">
              <h3 className="text-4xl font-black text-orange-400">
                {t.statsYearsCount}
              </h3>
              <p className="text-white/50 mt-2 text-sm uppercase tracking-[0.2em]">
                {t.statsYears}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[30px] py-8 px-6">
              <h3 className="text-4xl font-black text-orange-400">
                {t.statsCreativeCount}
              </h3>
              <p className="text-white/50 mt-2 text-sm uppercase tracking-[0.2em]">
                {t.statsCreative}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}

      <section className="px-[5%] py-32 relative overflow-hidden bg-black">
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-500/10 blur-[120px] rounded-full" />

        <div className="relative z-10">
          <SectionLabel>{t.whatWeDo}</SectionLabel>

          <h2 className="text-[clamp(3rem,7vw,6rem)] font-black leading-[0.95] tracking-[-0.05em]">
            {t.creativeDigital}
            <span className="block text-orange-400">{t.solutions}</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-x-10 gap-y-16 mt-20">
            {WHAT_WE_DO.map((service, index) => (
              <div key={index}>
                {/* IMAGE */}
                <img
                  src={service.image}
                  alt={service[language].title}
                  className="
          w-full
          aspect-[]
          object-cover
          rounded-[24px]
        "
                />

                {/* TITLE */}
                <div className="mt-6 text-center">
                  <h3 className="text-2xl md:text-3xl font-bold text-white">
                    {service[language].title}
                  </h3>

                  {/* <div className="w-16 h-[2px] bg-orange-400 rounded-full mx-auto mt-3" /> */}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center mt-20">
          <a
            href="/services"
            className="
      group
      inline-flex
      items-center
      gap-3
      px-10
      py-4
      rounded-full
      text-white
      text-lg
      font-semibold
      border
      border-orange-400/40
      bg-white/5
      backdrop-blur-xl
      shadow-[0_0_25px_rgba(251,146,60,0.2)]
      hover:border-orange-400
      hover:bg-orange-500/10
      hover:shadow-[0_0_40px_rgba(251,146,60,0.4)]
      hover:scale-105
      transition-all
      duration-300
    "
          >
            <span>{t.exploreServices}</span>

            <span className="group-hover:translate-x-1 transition-transform duration-300">
              →
            </span>
          </a>
        </div>
      </section>

      {/* WORKS */}

      <section className="px-[5%] py-32" id="works">
        <SectionLabel>{t.nav.works}</SectionLabel>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16">
          <h2 className="text-[clamp(3rem,7vw,6rem)] font-black leading-[0.95] tracking-[-0.05em]">
            {t.worksTitle1}
            <span className="block text-orange-400">{t.worksTitle2}</span>
          </h2>
        </div>

        {/* WORK GRID */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 text-center">
          {/* DIGITAL MARKETING */}
          <a href="/clients" className="group block">
            <div className="relative overflow-hidden rounded-[36px]">
              <img
                src="/img/vectors/8.png"
                alt="Digital Marketing"
                className="w-full object-cover group-hover:scale-105 transition duration-700"
              />

              {/* <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" /> */}
            </div>

            <div className="mt-6">
              <span className="text-yellow-400 text-xs uppercase tracking-[0.2em]">
                {t.marketing}
              </span>

              <h3 className="text-3xl font-bold mt-2">{t.digitalMarketing}</h3>
            </div>
          </a>

          {/* BRANDING */}
          <a href="/clients" className="group block">
            <div className="relative overflow-hidden rounded-[36px]">
              <img
                src="/img/vectors/6.png"
                alt="Branding"
                className="w-full  object-cover group-hover:scale-105 transition duration-700"
              />

              {/* <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" /> */}
            </div>

            <div className="mt-6">
              <span className="text-yellow-400 text-xs uppercase tracking-[0.2em]">
                {t.branding}
              </span>

              <h3 className="text-3xl font-bold mt-2">{t.brandingProjects}</h3>
            </div>
          </a>

          {/* WEBSITES */}
          <a href="/clients" className="group block">
            <div className="relative overflow-hidden rounded-[36px]">
              <img
                src="/img/vectors/12.png"
                alt="Websites"
                className="w-full object-cover group-hover:scale-105 transition duration-700"
              />

              {/* <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" /> */}
            </div>

            <div className="mt-6 text-center">
              <span className="text-yellow-400 text-xs uppercase tracking-[0.2em]">
                {t.development}
              </span>

              <h3 className="text-3xl font-bold mt-2">{t.websites}</h3>
            </div>
          </a>
        </div>
        {/* CENTER BUTTON */}
        <div className="flex justify-center mt-20">
          <a
            href="/works"
            className="
      group
      inline-flex
      items-center
      gap-3
      px-10
      py-4
      rounded-full
      border
      border-orange-400/40
      bg-white/5
      backdrop-blur-xl
      text-white
      font-semibold
      shadow-[0_0_25px_rgba(251,146,60,0.2)]
      hover:border-orange-400
      hover:bg-orange-500/10
      hover:shadow-[0_0_40px_rgba(251,146,60,0.35)]
      hover:scale-105
      transition-all
      duration-300
    "
          >
            {t.seeOurWorks}
          </a>
        </div>
      </section>

      {/* WHY CHOOSE GROWVY */}

      <section className="px-[5%] py-32 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-cyan-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-orange-500/10 blur-[140px] rounded-full" />

        <div className="relative z-10">
          <SectionLabel>{t.whyChooseGrowvy}</SectionLabel>

          <div className="max-w-[900px]">
            <h2 className="text-[clamp(3rem,7vw,6rem)] font-black leading-[0.95] tracking-[-0.05em]">
              {t.whyTitle1}
              <span className="block text-orange-400">{t.whyTitle2}</span>
            </h2>

            <p className="text-white/60 text-lg leading-[1.9] mt-8 max-w-[700px]">
              {t.whyDesc}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-16 mt-24">
            {WHY_GROWVY.map((item, index) => {
              const symbols = ["✦", "◈", "◉", "⬢"];

              return (
                <div
                  key={index}
                  className="text-center flex flex-col items-center"
                >
                  {/* PREMIUM SYMBOL */}
                  <div className="mb-8">
                    <span
                      className="
              text-6xl
              text-orange-400
              drop-shadow-[0_0_20px_rgba(251,146,60,0.4)]
            "
                    >
                      {symbols[index]}
                    </span>
                  </div>

                  {/* TITLE */}
                  <h4 className="text-2xl font-bold text-white mb-4">
                    {item[language].title}
                  </h4>

                  {/* DESCRIPTION */}
                  <p className="text-white/60 leading-[1.9] max-w-[280px]">
                    {item[language].description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CLIENTS */}

      <section
        className="px-[5%] py-32 relative overflow-hidden bg-white"
        onMouseEnter={() => {
          if (!startAnimation) {
            setStartAnimation(true);
          }
        }}
      >
        <div className="text-center mb-16">
          <SectionLabel>{t.trustedBy}</SectionLabel>

          <h2 className="text-5xl font-black text-black mt-4">
            {t.trustedByTitle1}
            <span className="block text-orange-400">{t.trustedByTitle2}</span>
          </h2>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 items-center">
            {clients.map((client, index) => {
              const positions = [
                { x: -250, y: -120 },
                { x: 220, y: -150 },
                { x: -180, y: 180 },
                { x: 250, y: 120 },
                { x: -320, y: 50 },
                { x: 320, y: -80 },
                { x: -100, y: -220 },
                { x: 180, y: 220 },
              ];

              return (
                <div
                  key={client.id}
                  className={`
          flex items-center justify-center h-24
          ${startAnimation ? "logo-reveal" : ""}
        `}
                  style={{
                    animationDelay: `${index * 0.15}s`,
                    ["--start-x" as any]: `${positions[index % positions.length].x}px`,
                    ["--start-y" as any]: `${positions[index % positions.length].y}px`,
                  }}
                >
                  <img
                    src={client.profileImage}
                    alt={client.name}
                    className="
            max-h-14
            w-auto
            object-contain
            grayscale
            hover:grayscale-0
            transition-all
            duration-300
          "
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTACT */}

      <section className="px-[5%] py-32 relative overflow-hidden" id="contact">
        {/* Glow */}
        <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-orange-500/10 blur-[120px] rounded-full" />

        <div className="relative z-10 text-center max-w-[900px] mx-auto">
          <SectionLabel>{t.nav.contact}</SectionLabel>

          {/* HEADING */}
          <h2 className="text-[clamp(3rem,7vw,6rem)] font-black leading-[0.95] tracking-[-0.05em]">
            {t.contactTitle1}
            <span className="block text-orange-400">{t.contactTitle2}</span>
          </h2>

          <p className="text-white/60 text-lg leading-[1.9] mt-8 max-w-[700px] mx-auto">
            {t.contactDesc}
          </p>
          <img
            src="/img/vectors/phone-orange.png"
            alt="Contact Growvy"
            className="w-full max-w-[500px] mx-auto my-16"
          />

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-16">
            {/* CALL */}
            <a
              href="tel:+919074769643"
              className="
      group
      inline-flex
      items-center
      gap-3
      px-8
      py-4
      rounded-full
      border
      border-orange-400/40
      bg-white/5
      backdrop-blur-xl
      text-white
      text-lg
      font-semibold
      shadow-[0_0_25px_rgba(251,146,60,0.2)]
      hover:border-orange-400
      hover:bg-orange-500/10
      hover:shadow-[0_0_40px_rgba(251,146,60,0.4)]
      hover:scale-105
      transition-all
      duration-300
    "
            >
              <span>{t.callUs}</span>

              <span className="group-hover:translate-x-1 transition-transform duration-300">
                →
              </span>
            </a>

            {/* WHATSAPP */}
            <a
              href="https://wa.me/919074769643"
              target="_blank"
              rel="noreferrer"
              className="
      group
      inline-flex
      items-center
      gap-3
      px-8
      py-4
      rounded-full
      border
      border-orange-400/40
      bg-white/5
      backdrop-blur-xl
      text-white
      text-lg
      font-semibold
      shadow-[0_0_25px_rgba(251,146,60,0.2)]
      hover:border-orange-400
      hover:bg-orange-500/10
      hover:shadow-[0_0_40px_rgba(251,146,60,0.4)]
      hover:scale-105
      transition-all
      duration-300
    "
            >
              <span>{t.whatsappUs}</span>

              <span className="group-hover:translate-x-1 transition-transform duration-300">
                →
              </span>
            </a>
          </div>
        </div>
      </section>

      <FAQSection language={language} />

      {/* FOOTER */}

      {/* FOOTER */}

      <Footer />
    </div>
  );
};

// ─────────────────────────────────────────────

const SectionLabel: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div className="flex items-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-6">
    <div className="w-10 h-px bg-yellow-400" />

    {children}
  </div>
);

export default UserHome;
