// src/pages/user/Works.tsx

import React, { useEffect, useRef, useState } from "react";

import { collection, getDocs } from "firebase/firestore";

import { db } from "../../config/firebase/firebase";

import Nav from "../../components/user/Modal/Nav";

import { translations, WORK_CATEGORIES } from "../../constant/Constant";
import Footer from "../../components/user/Footer";
import { useLanguage } from "../../context/LanguageContext";

import { Helmet } from "react-helmet-async";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Work {
  firestoreId?: string;

  clientId: string;

  title: string;

  type: "poster" | "reel" | "website";

  imageUrl?: string;

  logoUrl?: string;
  thumbnailUrl?: string;

  videoUrl?: string;

  instagramUrl?: string;

  websiteUrl?: string;

  uploadedAt?: string;
}

// ─────────────────────────────────────────────
// REEL CARD
// - thumbnail  -> shown first, card height = thumbnail's original ratio
// - no thumb   -> the video itself is shown (first frame), original ratio
// - hover      -> video loads and autoplays (muted, looped)
// - touch      -> tap toggles playback
// ─────────────────────────────────────────────

const ReelCard: React.FC<{ work: Work }> = ({ work }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [load, setLoad] = useState(false); // true after first hover
  const [hovering, setHovering] = useState(false);
  const [ready, setReady] = useState(false);

  const hasVideo = !!work.videoUrl;
  const hasThumb = !!work.thumbnailUrl;

  // Without a thumbnail the video element is always mounted (to show frame 1)
  const mountVideo = hasVideo && (load || !hasThumb);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (hovering && ready) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = hasThumb ? 0 : 0.001;
    }
  }, [hovering, ready, hasThumb]);

  const start = () => {
    if (!hasVideo) return;
    setLoad(true);
    setHovering(true);
  };

  const stop = () => setHovering(false);

  const isTouch = () => window.matchMedia("(hover: none)").matches;

  const handleClick = (e: React.MouseEvent) => {
    if (hasVideo && isTouch()) {
      e.preventDefault();
      setLoad(true);
      setHovering((h) => !h);
      return;
    }
    // desktop click -> Instagram (if there is a link)
    if (!work.instagramUrl) e.preventDefault();
  };

  const showSpinner = hovering && mountVideo && !ready;
  const showVideo = hovering && ready;

  const content = (
    <div className="relative w-full bg-black overflow-hidden">
      {/* Base layer: thumbnail or video's first frame (sets the ratio) */}
      {hasThumb ? (
        <img
          src={work.thumbnailUrl}
          alt={work.title || "Reel"}
          className="block w-full h-auto"
        />
      ) : hasVideo ? null : (
        <div className="w-full aspect-[9/16] flex items-center justify-center bg-white/5 text-white/40 text-sm">
          Reel
        </div>
      )}

      {mountVideo && (
        <video
          ref={videoRef}
          src={hasThumb ? work.videoUrl : `${work.videoUrl}#t=0.001`}
          muted
          loop
          playsInline
          preload={hasThumb ? "auto" : "metadata"}
          onCanPlay={() => setReady(true)}
          onError={() => setReady(false)}
          className={
            hasThumb
              ? `absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
                  showVideo ? "opacity-100" : "opacity-0"
                }`
              : "block w-full h-auto"
          }
        />
      )}

      {/* Play icon (idle) */}
      {hasVideo && !hovering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <span className="text-black text-2xl ml-1">▶</span>
          </div>
        </div>
      )}

      {/* Spinner while buffering */}
      {showSpinner && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      )}
    </div>
  );

  return (
    <a
      href={work.instagramUrl || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
      onMouseEnter={start}
      onMouseLeave={stop}
      onClick={handleClick}
    >
      {content}
    </a>
  );
};

// ─────────────────────────────────────────────

const Works: React.FC = () => {
  const { language, changeLanguage } = useLanguage();

  const [works, setWorks] = useState<Work[]>([]);

  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("poster");

  const t = translations[language];

  // ─────────────────────────────────────────────
  // FETCH WORKS
  // ─────────────────────────────────────────────

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        setLoading(true);

        const snapshot = await getDocs(collection(db, "creatives"));

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
    filter === "all" ? works : works.filter((work) => work.type === filter);

  // ─────────────────────────────────────────────

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      className={`min-h-screen bg-[#081120] text-white overflow-x-hidden ${
        language === "ar" ? "font-[Cairo]" : "font-sans"
      }`}
    >
      <Helmet>
        <title>Our Portfolio | Creative Projects by Growvy</title>

        <meta
          name="description"
          content="View our portfolio showcasing branding, website design, marketing campaigns, and creative projects delivered for clients."
        />
        <meta
          name="keywords"
          content="digital marketing, branding, web development, social media management"
        />
      </Helmet>

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

      <section className="px-[5%] pt-20 pb-12">
        <div className="max-w-[1400px] mx-auto text-center">
          <div className="flex items-center justify-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">
            <div className="w-10 h-px bg-yellow-400" />

            {t.worksTitle}

            <div className="w-10 h-px bg-yellow-400" />
          </div>

          <h1 className="text-[clamp(3rem,8vw,7rem)] font-black leading-[1.05] tracking-[-0.05em]">
            {t.portfolioTitle1}
            <br />

            <span className="text-orange-400">{t.portfolioTitle2}</span>
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

      {/* WORKS GRID (masonry: every card keeps its original ratio) */}

      <section className="px-[5%] pb-32">
        <div className="max-w-[1600px] mx-auto">
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="w-14 h-14 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredWorks.length === 0 ? (
            <div className="text-center py-32">
              <h2 className="text-4xl font-black">No Works Found</h2>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-8">
              {filteredWorks.map((work) => (
                <div
                  key={work.firestoreId}
                  className="
                    mb-8
                    break-inside-avoid
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
                    <ReelCard work={work} />
                  ) : (
                    /* POSTER */
                    <img
                      src={work.imageUrl}
                      alt={work.title || ""}
                      className="w-full h-auto block"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}

      <Footer language={language} />
    </div>
  );
};

export default Works;