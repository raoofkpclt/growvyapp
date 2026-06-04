// src/pages/user/Works.tsx

import React, { useEffect, useState } from "react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../config/firebase/firebase";

import Nav from "../../components/user/Modal/Nav";

import { translations,WORK_CATEGORIES} from "../../constant/Constant";
import Footer from "../../components/user/Footer";
import { useLanguage } from "../../context/LanguageContext";
// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Work {
  firestoreId?: string;

  clientId: string;

  title: string;

  type: "poster" | "reel"|"website";

  imageUrl?: string;

  logoUrl?: string;

  instagramUrl?: string;

  websiteUrl?: string;

  uploadedAt?: string;
}

// ─────────────────────────────────────────────

const Works = () => {

  const {language,changeLanguage}=useLanguage()

  const [works, setWorks] =
    useState<Work[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [filter, setFilter] =
    useState("poster");

  const t = translations[language];

  // ─────────────────────────────────────────────
  // FETCH WORKS
  // ─────────────────────────────────────────────

  useEffect(() => {

    const fetchWorks = async () => {

      try {

        setLoading(true);

        const snapshot = await getDocs(
          collection(db, "creatives")
        );

        const data = snapshot.docs.map((doc) => ({
          firestoreId: doc.id,
          ...(doc.data() as Work),
        }));

        setWorks(data);

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);

      }
    };

    fetchWorks();

  }, []);

  // ─────────────────────────────────────────────

  const filteredWorks =
    filter === "all"
      ? works
      : works.filter(
          (work) => work.type === filter
        );

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

      {/* GLOW EFFECTS */}

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

      <section className="px-[5%] pt-20 pb-12">

        <div className="max-w-[1400px] mx-auto text-center">

          <div className="flex items-center justify-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">

            <div className="w-10 h-px bg-yellow-400" />

            {t.worksTitle}

            <div className="w-10 h-px bg-yellow-400" />

          </div>

          <h1 className="text-[clamp(3rem,8vw,7rem)] font-black leading-[0.9] tracking-[-0.05em]">
  {t.portfolioTitle1}
  <br />

  <span className="text-orange-400">
    {t.portfolioTitle2}
  </span>
</h1>

<p className="max-w-[700px] mx-auto mt-8 text-white/60 text-lg leading-[2]">
  {t.portfolioDesc}
</p>

        </div>

      </section>

      {/* FILTERS */}

      <section className="px-[5%] pb-10">

        <div className="max-w-[1400px] mx-auto flex flex-wrap justify-center gap-4">

          {WORK_CATEGORIES.map((item) => (

            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`
              px-6
              py-3
              rounded-full
              text-sm
              uppercase
              tracking-[0.15em]
              transition-all
              ${
                filter === item.value
                  ? "bg-yellow-500 text-black font-bold"
                  : "bg-white/5 border border-white/10 text-white/70 hover:border-yellow-400/40 hover:text-yellow-400"
              }
              `}
            >
              {item[language]}
            </button>

          ))}

        </div>

      </section>

      {/* WORKS GRID */}

      <section className="px-[5%] pb-32">

        <div className="max-w-[1600px] mx-auto">

          {loading ? (

            <div className="flex justify-center items-center py-32">

              <div className="w-14 h-14 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />

            </div>

          ) : filteredWorks.length === 0 ? (

            <div className="text-center py-32">

              <h2 className="text-4xl font-black">
                No Works Found
              </h2>

            </div>

          ) : (

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">

              {filteredWorks.map((work) => (
  <div
    key={work.firestoreId}
    className="
      group
      overflow-hidden
      rounded-[30px]
      bg-white/5
      border
      border-white/10
      hover:border-orange-400/30
      transition-all
      duration-500
    "
  >
    {/* WEBSITE */}
    {work.type === "website" ? (
      <a
  href={work.websiteUrl}
  target="_blank"
  rel="noopener noreferrer"
  className="
    h-[420px]
    bg-white
    flex
    items-center
    justify-center
    p-12
  "
>
  <img
    src={work.logoUrl}
    alt=""
    className="
      w-[85%]
      h-[85%]
      object-contain
      transition-all
      duration-700
      group-hover:scale-105
    "
  />
</a>
    ) : work.type === "reel" ? (
      /* REEL */
      <a
        href={work.instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          src={work.imageUrl}
          alt=""
          className="
            w-full
            h-[420px]
            object-cover
            transition-all
            duration-500
            group-hover:scale-[1.02]
          "
        />
      </a>
    ) : (
      /* POSTER */
      <img
        src={work.imageUrl}
        alt=""
        className="
          w-full
          h-auto
          block
        "
      />
    )}
  </div>
))}

            </div>

          )}

        </div>

      </section>

      {/* FOOTER */}

      <Footer/>

    </div>
  );
};

export default Works;