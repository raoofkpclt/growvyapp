import React, { useEffect, useState } from "react";
import { translations, NAV_LINKS } from "../../../constant/Constant";
import { Link } from "react-router-dom";

interface Props {
  language: "en" | "ar";
  
}

const Nav = ({ language }: Props) => {
  const [scrolled, setScrolled] = useState(false);


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
  dir={language === "ar" ? "rtl" : "ltr"}
  className={`sticky top-0 z-50  py-15 px-4 md:px-[5%] flex items-center justify-center transition-all duration-300 ${
    scrolled
      ? "bg-[#081120]/95 backdrop-blur-2xl"
      : "bg-[#081120]"
  }`}
>

  {/* NAV LINKS */}

  <ul className="flex items-center gap-4 sm:gap-6 md:gap-10 flex-wrap justify-center">

    {NAV_LINKS.map((item) => (
      <li key={item.key}>

        <Link
  to={item.path}
  className="
    text-white/70
    hover:text-orange-400
    transition-all
    duration-300
    text-[11px]
    sm:text-xs
    md:text-sm
    lg:text-base
    font-medium
    lg:font-bold
    uppercase
    tracking-[0.15em]
    relative

    after:absolute
    after:left-0
    after:-bottom-2
    after:h-[2px]
    after:w-0
    after:bg-orange-400
    after:shadow-[0_0_10px_rgba(251,146,60,0.8)]
    after:transition-all
    after:duration-300

    hover:after:w-full
    hover:drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]
  "
>
  {t.nav[item.key as keyof typeof t.nav]}
</Link>

      </li>
    ))}
  </ul>
</nav>
    </>
  );
};

export default Nav;
