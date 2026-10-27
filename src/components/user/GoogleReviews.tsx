import { useEffect } from "react";

export default function GrowvyReviews() {
  useEffect(() => {
    const scriptId = "featurable-widget-script";

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://cdn.featurable.com/widget/v2/embed.js";
      script.defer = true;
      script.charset = "UTF-8";
      document.body.appendChild(script);
    }
  }, []);

  return (
    <section className="w-full overflow-hidden bg-white px-4 py-12 sm:px-6 sm:py-16 md:px-10 md:py-24 lg:px-12 lg:py-28">
      <div className="mx-auto w-full max-w-7xl">
        {/* Eyebrow: centered on mobile, left aligned from tablet up */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 md:justify-start">
          <span
            className="h-px w-8 bg-[#F5C400] sm:w-12 lg:w-[68px]"
            aria-hidden="true"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#F5C400] sm:text-sm sm:tracking-[0.3em]">
            Client Reviews
          </p>
        </div>

        {/* Heading */}
        <div className="mt-8 text-center sm:mt-10 md:mt-12 lg:mt-16">
          <h2 className="text-[2.25rem] font-extrabold leading-[1.1] tracking-tighter text-black min-[400px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
            Don&rsquo;t take our word
          </h2>
          <p className="mt-2 text-[2.25rem] font-extrabold leading-[1.1] tracking-tighter text-[#F28C28] min-[400px]:text-4xl sm:mt-3 sm:text-5xl md:mt-4 md:text-6xl lg:mt-5 lg:text-7xl">
            Hear it from them
          </p>
        </div>

        {/* Reviews widget */}
        <div className="mx-auto mt-10 w-full min-w-0 max-w-6xl sm:mt-12 md:mt-16 lg:mt-24">
          <div
            id="featurable-5e42e5b1-2b9e-40c9-9dcc-7630ac4b3352"
            data-featurable-async
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
