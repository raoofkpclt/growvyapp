import  { useEffect, useState } from "react";
import { translations, NAV_LINKS } from "../../../constant/Constant";
import { Link, NavLink } from "react-router-dom";
import logo from "../../../assets/Logo/logo-1.png";

type Language = "en" | "ar";

interface Props {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Nav = ({ language, setLanguage }: Props) => {
  const [scrolled, setScrolled] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

  const t = translations[language];

  // SCROLL EFFECT

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* NAVBAR */}

      <nav
        dir={language === "ar" ? "ltl" : "ltr"}
        className={`sticky top-0 z-50 h-[80px] px-4 md:px-[5%] flex items-center justify-between transition-all duration-300 ${
          scrolled
            ? "bg-black/40 backdrop-blur-2xl border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        {/* LOGO */}

        <Link to="/" className="flex items-center justify-center">
          <img
            src={logo}
            alt="Growvy Logo"
            className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain"
          />
        </Link>

        <ul className="hidden lg:flex items-center gap-10">
          {NAV_LINKS.map((item) => (
            <li key={item.key}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `
    text-sm uppercase tracking-[0.15em]
    transition-all duration-300 relative
    ${
      isActive
        ? "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)] after:w-full"
        : "text-white/70 hover:text-orange-400"
    }

    after:absolute
    after:left-0
    after:-bottom-1
    after:h-[1px]
    after:bg-orange-400
    after:shadow-[0_0_10px_rgba(251,146,60,0.8)]
    after:transition-all
    after:duration-300

    hover:after:w-full
    `
                }
              >
                {t.nav[item.key as keyof typeof t.nav]}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* RIGHT SIDE */}

        <div className="flex items-center gap-3">
          {/* LANGUAGE SWITCH */}

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => setLanguage("en")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                language === "en"
                  ? "border border-orange-400 bg-orange-500/20 text-white shadow-[0_0_25px_rgba(251,146,60,0.4)]"
                  : "border border-orange-400/40 bg-white/5 backdrop-blur-xl text-white/70 shadow-[0_0_15px_rgba(251,146,60,0.15)] hover:border-orange-400 hover:bg-orange-500/10 hover:text-white hover:shadow-[0_0_25px_rgba(251,146,60,0.3)]"
              }`}
            >
              EN
            </button>

            <button
              onClick={() => setLanguage("ar")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                language === "ar"
                  ? "border border-orange-400 bg-orange-500/20 text-white shadow-[0_0_25px_rgba(251,146,60,0.4)]"
                  : "border border-orange-400/40 bg-white/5 backdrop-blur-xl text-white/70 shadow-[0_0_15px_rgba(251,146,60,0.15)] hover:border-orange-400 hover:bg-orange-500/10 hover:text-white hover:shadow-[0_0_25px_rgba(251,146,60,0.3)]"
              }`}
            >
              عربي
            </button>
          </div>

          {/* MOBILE MENU BUTTON */}

          <button
            className="lg:hidden text-white text-3xl"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}

      <div
        className={`fixed inset-0 z-40 bg-black/95 backdrop-blur-2xl transition-all duration-500 ${
          menuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div
          dir={language === "ar" ? "rtl" : "ltr"}
          className="flex flex-col items-center justify-center h-full gap-8"
        >
          {NAV_LINKS.map((item) => (
            <a
              key={item.key}
              href={`${item.id}`}
              onClick={() => setMenuOpen(false)}
              className="text-white text-2xl font-bold hover:text-cyan-400 transition-colors"
            >
              {t.nav[item.key as keyof typeof t.nav]}
            </a>
          ))}

          {/* MOBILE LANGUAGE */}

          <div className="flex gap-3 mt-10">
            <button
              onClick={() => setLanguage("en")}
              className={`px-4 py-2 rounded-full ${
                language === "en"
                  ? "bg-cyan-500 text-black"
                  : "bg-white/10 text-white"
              }`}
            >
              English
            </button>

            <button
              onClick={() => setLanguage("ar")}
              className={`px-4 py-2 rounded-full ${
                language === "ar"
                  ? "bg-cyan-500 text-black"
                  : "bg-white/10 text-white"
              }`}
            >
              العربية
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Nav;
