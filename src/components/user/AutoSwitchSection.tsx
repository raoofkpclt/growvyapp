import { useEffect, useState } from "react";
import { slides } from "../../constant/Constant";

interface Props {
  language: "en" | "ar";
}

export default function AutoSwitchSection({ language }: Props) {
  const [active, setActive] = useState(0);

  // AUTO SWITCH
  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-32 overflow-hidden">
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
      <div className="absolute top-[-120px] left-[10%] w-[350px] h-[350px] bg-orange-500/10 blur-[160px] rounded-full" />

      <div className="absolute bottom-[-120px] right-[10%] w-[350px] h-[350px] bg-yellow-500/10 blur-[180px] rounded-full" />

      {/* CONTENT */}
      <div
        className="
          relative z-10
          max-w-[1400px]
          mx-auto
          grid
          lg:grid-cols-2
          gap-20
          items-center
          px-[5%]
        "
      >
        {/* IMAGE */}
        <div className="relative flex justify-center items-center">
          <div className="absolute w-[500px] h-[500px] bg-cyan-500/10 blur-[150px] rounded-full" />

          <img
            key={slides[active].image}
            src={slides[active].image}
            alt={slides[active][language].title}
            className="
              relative z-10
              w-[280px]
              md:w-[420px]
              lg:w-[550px]
              object-contain
              transition-all
              duration-700
              drop-shadow-[0_0_80px_rgba(34,211,238,0.45)]
            "
          />
        </div>

        {/* TEXT */}
        <div
          className={`
            relative z-10
            ${language === "ar" ? "text-right" : "text-left"}
          `}
        >
          <p
            className="
              text-orange-400
              uppercase
              tracking-[0.3em]
              text-sm
              font-semibold
            "
          >
            {language === "en"
              ? "Growvy Creative Agency"
              : "وكالة جروفي الإبداعية"}
          </p>

          <h2
            key={slides[active][language].title}
            className="
              mt-6
              text-[clamp(3rem,6vw,6rem)]
              font-black
              leading-[0.95]
              tracking-[-0.05em]
              transition-all duration-500
            "
          >
            {slides[active][language].title}
          </h2>

          <p
            key={slides[active][language].desc}
            className="
              mt-8
              text-white/60
              text-lg
              leading-[2]
              max-w-[600px]
              transition-all duration-500
            "
          >
            {slides[active][language].desc}
          </p>

          {/* BUTTONS */}
          <div className="flex flex-wrap gap-4 mt-10"></div>

          {/* INDICATORS */}
          <div className="flex gap-3 mt-12">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setActive(index)}
                className={`
                  h-2 rounded-full transition-all duration-500
                  ${active === index ? "w-10 bg-yellow-400" : "w-2 bg-white/20"}
                `}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
