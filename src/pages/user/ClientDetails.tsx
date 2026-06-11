import React, { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { doc, getDoc } from "firebase/firestore";

import { db } from "../../config/firebase/firebase";

import Nav from "../../components/user/Modal/Nav";

import { translations } from "../../constant/Constant";

import type { Client } from "../../utils/types/Types";
import Footer from "../../components/user/Footer";

import { useLanguage } from "../../context/LanguageContext";





// ─────────────────────────────────────────────

const ClientDetails: React.FC = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const { language, changeLanguage } = useLanguage();

  const [client, setClient] = useState<Client | null>(null);

  const [loading, setLoading] = useState(true);

  const t = translations[language];

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true);

        if (!id) return;

        // GET SINGLE DOCUMENT USING FIRESTORE DOC ID
        const docRef = doc(db, "clients", id);

        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const data = {
            firestoreId: snapshot.id,
            ...(snapshot.data() as Client),
          };

          setClient(data);
        } else {
          setClient(null);
        }
      } catch (error) {
        console.log("Fetch Client Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id]);

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

      {/* GLOW EFFECT */}

      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-blue-600/20 blur-[140px] rounded-full" />

        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-cyan-500/20 blur-[160px] rounded-full" />
      </div>

      {/* NAVBAR */}

      <Nav language={language} setLanguage={changeLanguage} />

      {/* CONTENT */}

      <section className="px-[5%] py-20">
        <div className="max-w-[1400px] mx-auto">
          {/* BACK BUTTON */}

          <button
            onClick={() => navigate(-1)}
            className="
            mb-12
            px-6
            py-3
            rounded-full
            bg-white/5
            border
            border-white/10
            hover:border-orange-400/40
            hover:bg-orange-500/10
            transition-all
            "
          >
            ← {t.backButton}
          </button>

          {/* LOADING */}

          {loading ? (
            <div className="flex justify-center items-center py-40">
              <div className="w-14 h-14 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !client ? (
            <div className="text-center py-40">
              <h1 className="text-5xl font-black"> {t.clientNotFound}</h1>
            </div>
          ) : (
            <>
              {/* HERO */}

              <div className="grid lg:grid-cols-2 gap-20 items-center bg">
                {/* LEFT */}

                <div>
                  <div className="flex items-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">
                    <div className="w-10 h-px bg-yellow-400" />
                    {t.clientDetails}
                  </div>

                  <h1 className="text-[clamp(3rem,8vw,6rem)] font-black leading-[0.9] tracking-[-0.05em]">
                    {client.name}
                  </h1>

                  <p className="mt-8 text-white/60 text-lg leading-[2] max-w-[700px]">
                    {t.clientDescription}{" "}
                    <span className="text-orange-400 font-semibold">
                      {client.name}
                    </span>{" "}
                    {t.clientDescription2}
                  </p>
                  {/* INFO CARDS */}

                  <div className="grid sm:grid-cols-2 gap-6 mt-12"></div>
                </div>

                {/* RIGHT */}

                <div className="relative flex items-center justify-center min-h-[500px]">
                  {/* Glow */}
                  <div className="absolute w-[500px] h-[500px] bg-orange-500/10 blur-[160px] rounded-full" />

                  {/* Logo */}
                  {client.profileImage ? (
                    <img
                      src={client.profileImage}
                      alt={client.name}
                      className="
        relative z-10
        w-full
        max-w-[700px]
        h-auto
        object-contain
        rounded-[40px]
        
      "
                    />
                  ) : (
                    <div
                      className="
        relative z-10
        text-[180px]
        font-black
        text-white/10
      "
                    >
                      {client.name?.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              {/* PORTFOLIO SECTION */}

              <div className="mt-32">
                <div className="flex items-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">
                  <div className="w-10 h-px bg-yellow-400" />
                  {t.portfolio}
                </div>

                <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[1] tracking-[-0.05em]">
                  {t.featuredWorks1}
                  <br />
                  {t.featuredWorks2}
                </h2>

                {client.portfolioImage ? (
                  <div className="mt-16">
                    <div
                      className="
        group
        relative
        overflow-hidden
        rounded-[40px]
        bg-white/5
        border
        border-white/10
        backdrop-blur-xl
        
        "
                    >
                      <img
                        src={client.portfolioImage}
                        alt={client.name}
                        className="
          w-full
          min-h-[400vh]
          object-cover
          transition-transform
          duration-700
          group-hover:scale-[1.02]
          "
                      />

                      <div />
                    </div>
                  </div>
                ) : (
                  <div className="mt-16 bg-white/5 border border-white/10 rounded-[30px] p-16 text-center text-white/50">
                    {t.noPortfolio}
                  </div>
                )}
              </div>
              {/* PROJECT SECTION */}
            </>
          )}
        </div>
      </section>

      {/* FOOTER */}

      <Footer />
    </div>
  );
};

export default ClientDetails;
