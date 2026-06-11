import React from "react";
import logo from "../../../public/img/logo-1.png";
import HomeNav from "../../components/user/Modal/HomeNav";
import { Link } from "react-router-dom";
import { footerTranslations } from "../../constant/Constant";


interface Props {
  language: "en" | "ar";
}

const Footer: React.FC<Props> = ({ language }) => {
  const t = footerTranslations[language];
  
  return (
    <footer className="relative overflow-hidden border-t border-white/10 px-[5%] py-24">
      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-cyan-500/10 blur-[140px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-orange-500/10 blur-[140px] rounded-full" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* LOGO */}
        <div className="flex justify-center">
          <Link to="/login" className="flex justify-center">
  <img
    src={logo}
    alt="Growvy Logo"
    className="w-[140px] md:w-[170px] object-contain opacity-95 hover:scale-105 transition duration-300 cursor-pointer"
  />
</Link>
        </div>

        <p className="text-white/60 leading-[1.9] mt-6 max-w-[700px]">
  {t.description}
</p>

        {/* NAVIGATION */}
        <HomeNav language={language} />

        {/* KSA OFFICE */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold mb-4 text-orange-400">
  {t.ksaOffice}
</h3>

          <p className="text-white/60 leading-[1.9]">
  {t.ksaAddress.map((line, index) => (
    <React.Fragment key={index}>
      {line}
      <br />
    </React.Fragment>
  ))}
</p>
        </div>
        {/* EMAIL */}
        <a
          href="mailto:info@growvyofficial.com"
          className="mt-14 text-lg text-white/70 hover:text-orange-400 transition"
        >
          business@growvyofficial.com
        </a>

        {/* INDIA OFFICE */}
        <div className="mt-14">
          <h3 className="text-2xl font-bold mb-4 text-yellow-400">
  {t.indiaOffice}
</h3>

          <p className="text-white/60 leading-[1.9]">
  {t.indiaAddress.map((line, index) => (
    <React.Fragment key={index}>
      {line}
      <br />
    </React.Fragment>
  ))}
</p>
        </div>

        {/* EMAIL */}
        <a
          href="mailto:info@growvyofficial.com"
          className="mt-14 text-lg text-white/70 hover:text-yellow-400 transition"
        >
          info@growvyofficial.com
        </a>

        {/* SOCIALS */}
        <div className="flex flex-wrap justify-center gap-8 mt-14">
          <a
            href="https://www.instagram.com/growvyofficial/"
            className="text-white/60 hover:text-orange-400 transition"
          >
            {t.socials.instagram}
          </a>

          <a
            href="https://www.facebook.com/profile.php?id=61577232283332"
            className="text-white/60 hover:text-orange-400 transition"
          >
            {t.socials.facebook}
          </a>

          <a
            href="https://snapchat.com/t/gofCpgys"
            className="text-white/60 hover:text-orange-400 transition"
          >
            {t.socials.snapchat}
          </a>

          <a
            href="https://www.tiktok.com/@growvy.ksa?_r=1&_t=ZS-977VwOkJb0b"
            className="text-white/60 hover:text-orange-400 transition"
          >
            {t.socials.tiktok}
          </a>

          <a
            href="https://www.linkedin.com/company/growvy-official/posts/?feedView=all"
            className="text-white/60 hover:text-orange-400 transition"
          >
            {t.socials.linkedin}
          </a>
        </div>

        {/* COPYRIGHT */}
        <div className="mt-16 pt-8 border-t border-white/10 w-full">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Growvy. {t.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
