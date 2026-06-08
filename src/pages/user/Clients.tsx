import React, { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import Nav from "../../components/user/Modal/Nav";

import { getClients } from "../../service/clientService";

import { translations } from "../../constant/Constant";

import type { Client } from "../../utils/types/Types";
import Footer from "../../components/user/Footer";
import { useLanguage } from "../../context/LanguageContext";

// ─────────────────────────────────────────────

const Clients : React.FC= () => {
  const navigate = useNavigate();

  const { language, changeLanguage } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);

  const [loading, setLoading] = useState(true);

  const t = translations[language];

  // ─────────────────────────────────────────────
  // FETCH CLIENTS
  // ─────────────────────────────────────────────

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);

        const data = await getClients();

        setClients(data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

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

      <section className="px-[5%] pt-20 pb-10">
        <div className="max-w-[1400px] mx-auto text-center">
          <div className="flex items-center justify-center gap-3 text-yellow-400 uppercase tracking-[0.25em] text-xs font-bold mb-8">
            <div className="w-10 h-px bg-yellow-400" />

            {t.happyClientsText}

            <div className="w-10 h-px bg-yellow-400" />
          </div>

          <h1 className="text-[clamp(3rem,8vw,7rem)] font-black leading-[0.9] tracking-[-0.05em]">
            {t.clientsTitle1}
            <br />

            <span className="text-orange-400">{t.clientsTitle2}</span>
          </h1>

          <p className="max-w-[700px] mx-auto mt-8 text-white/60 text-lg leading-[2]">
            {t.clientsDesc}
          </p>
        </div>
      </section>

      {/* CLIENTS GRID */}

      <section className="px-[5%] pb-32">
        <div className="max-w-[1600px] mx-auto">
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="w-14 h-14 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-32">
              <h2 className="text-3xl font-bold">No Clients Found</h2>

              <p className="mt-4 text-white/50">
                Add clients from admin panel.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {clients.map((client) => (
                <div
                  key={client.firestoreId}
                  onClick={() =>
                    navigate(`/client-details/${client.firestoreId}`)
                  }
                  className="
  group
  cursor-pointer
  rounded-[24px]
  bg-white
  p-8
  h-[180px]
  flex
  items-center
  justify-center
  transition-all
  duration-500
"
                >
                  {client.profileImage ? (
                    <img
                      src={client.profileImage}
                      alt={client.name}
                      className="
            max-h-[120px]
            max-w-[180px]
            object-contain
            transition-all
            duration-500
            group-hover:scale-105
          "
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center text-4xl font-black text-white/30">
                      {client.name?.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}

      <Footer />
    </div>
  );
};

export default Clients;
