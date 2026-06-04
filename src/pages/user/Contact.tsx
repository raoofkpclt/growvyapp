// src/pages/user/Contact.tsx

import React, { useState } from "react";

import Nav from "../../components/user/Modal/Nav";

import {
  translations,
} from "../../constant/Constant";
import Footer from "../../components/user/Footer";
import { useLanguage } from "../../context/LanguageContext";



// ─────────────────────────────────────────────

const Contact = () => {

  const {language,changeLanguage}=useLanguage()
  

  const t = translations[language];

  // ─────────────────────────────────────────────

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      className={`min-h-screen bg-[#081120] text-white overflow-x-hidden ${
        language === "ar"
          ? "font-[Cairo]"
          : "font-sans"
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

      {/* GLOW EFFECT */}

      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-blue-600/20 blur-[140px] rounded-full" />

        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-cyan-500/20 blur-[160px] rounded-full" />

      </div>

      {/* NAVBAR */}

      <Nav
        language={language}
        setLanguage={changeLanguage}
      />

      {/* HERO */}

      <section className="px-[5%] pt-20">

        <div className="max-w-[1400px] mx-auto text-center">

          <div className="flex items-center justify-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">

            <div className="w-10 h-px bg-yellow-400" />

            {language === "en"
              ? "Contact Us"
              : "تواصل معنا"}

            <div className="w-10 h-px bg-yellow-400" />
          </div>

          <h1 className="text-[clamp(3rem,8vw,7rem)] font-black leading-[0.9] tracking-[-0.05em]">

            {language === "en"
              ? "Let's Build"
              : "لنصنع"}

            <br />

            <span className="text-orange-400">

              {language === "en"
                ? "Something Great"
                : "شيئًا رائعًا"}

            </span>
          </h1>

          <p className="max-w-[750px] mx-auto mt-8 text-white/60 text-lg leading-[2]">

            {language === "en"
              ? "Get in touch with Growvy for branding, marketing, creative production, and digital solutions."
              : "تواصل مع جروفي لخدمات التسويق، الهوية التجارية، الإنتاج الإبداعي، والحلول الرقمية."}

          </p>
        </div>
      </section>

      {/* CONTACT */}

      <section className="px-[30%] py-20 relative overflow-hidden" id="contact">
        {/* Glow */}
        
        
         

          
          
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
      </section>

      {/* MAP / EXTRA SECTION */}

      <section className="px-[5%] pb-32">

        <div className="max-w-[1400px] mx-auto">

          <div
            className="
            relative
            overflow-hidden
            rounded-[40px]
            bg-white/5
            border
            border-white/10
            backdrop-blur-xl
            p-10
            md:p-16
            "
          >
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
              }}
            />

            <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-start">

  {/* LEFT SIDE */}

  <div>

    <h2 className="text-[clamp(2rem,5vw,4rem)] font-black leading-[1]">
      {language === "en"
        ? "Let's Talk Business"
        : "دعنا نتحدث عن أعمالك"}
    </h2>

    <p className="mt-6 text-white/60 text-lg leading-[2]">
      {language === "en"
        ? "Contact our team in Saudi Arabia or India for branding, websites, marketing, and creative solutions."
        : "تواصل مع فريقنا في السعودية أو الهند لخدمات الهوية التجارية والمواقع الإلكترونية والتسويق والحلول الإبداعية."}
    </p>

    

   
    {/* INDIA OFFICE */}

    <div className="mt-12">
     
      <p className="text-white/60 leading-[2]">
      Growvy Branding
        <br />
        Al-Zahra
        <br />
        Jeddah
        <br />
        Kingdom of Saudi Arabia
      </p>

      

     <a
        href="mailto:business@growvyofficial.com"
        className="inline-block mt-4 text-yellow-400 hover:text-orange-300"
      >
        business@growvyofficial.com
      </a>
      <br />
      <a
        href="mailto:info@growvyofficial.com"
        className="inline-block mt-4 text-yellow-400 hover:text-yellow-300"
      >
        info@growvyofficial.com
      </a>
    </div>
  </div>

  {/* RIGHT SIDE - ENQUIRY FORM */}

  <form className="space-y-5">

    <input
      type="text"
      placeholder={language === "en" ? "Full Name" : "الاسم الكامل"}
      className="
        w-full
        px-6
        py-4
        rounded-2xl
        bg-white/5
        border border-white/10
        outline-none
        focus:border-orange-400
      "
    />

    <input
      type="email"
      placeholder={language === "en" ? "Email Address" : "البريد الإلكتروني"}
      className="
        w-full
        px-6
        py-4
        rounded-2xl
        bg-white/5
        border border-white/10
        outline-none
        focus:border-orange-400
      "
    />

    <input
      type="tel"
      placeholder={language === "en" ? "Phone Number" : "رقم الهاتف"}
      className="
        w-full
        px-6
        py-4
        rounded-2xl
        bg-white/5
        border border-white/10
        outline-none
        focus:border-orange-400
      "
    />

    <textarea
      rows={5}
      placeholder={language === "en" ? "Tell us about your project..." : "أخبرنا عن مشروعك..."}
      className="
        w-full
        px-6
        py-4
        rounded-2xl
        bg-white/5
        border border-white/10
        outline-none
        focus:border-orange-400
        resize-none
      "
    />

    <button
  type="submit"
  className="
    w-full
    py-4
    rounded-2xl
    text-white
    font-bold
    relative
    overflow-hidden
    bg-white/[0.03]
    backdrop-blur-xl
    border
    border-orange-400/20
    shadow-[0_0_20px_rgba(251,146,60,0.12)]
    hover:border-orange-400/60
    hover:shadow-[0_0_50px_rgba(251,146,60,0.4)]
    hover:bg-orange-500/[0.06]
    transition-all
    duration-500
  "
>
  <span className="relative z-10">
    {language === "en"
      ? "Send Enquiry"
      : "إرسال الاستفسار"}
  </span>

  <div
    className="
      absolute
      inset-0
      opacity-0
      hover:opacity-100
      bg-gradient-to-r
      from-transparent
      via-orange-400/10
      to-transparent
      transition-opacity
      duration-500
    "
  />
</button>

  </form>

</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <Footer/>
    </div>
  );
};

export default Contact;