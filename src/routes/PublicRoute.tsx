import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
  return (
    <div
      className="
        fixed
        inset-0
        bg-[#081120]
        flex
        items-center
        justify-center
        overflow-hidden
      "
    >
      {/* CYAN TOP GLOW */}
      <div
        className="
          absolute
          top-[-200px]
          left-1/2
          -translate-x-1/2
          w-[700px]
          h-[350px]
          bg-cyan-500/15
          blur-[180px]
          rounded-full
        "
      />

      {/* ORANGE CENTER GLOW */}
      <div
        className="
          absolute
          w-[350px]
          h-[350px]
          bg-orange-500/15
          blur-[120px]
          rounded-full
        "
      />

      {/* YELLOW ACCENT */}
      <div
        className="
          absolute
          bottom-[-100px]
          right-[10%]
          w-[250px]
          h-[250px]
          bg-yellow-400/10
          blur-[120px]
          rounded-full
        "
      />

      {/* GRID */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* CENTER CONTENT */}
      <div className="relative z-10 flex flex-col items-center">

        {/* LOGO */}
        <img
           src="/public/img/logo-1.png" // replace with your logo path
          alt="Growvy"
          className="
            w-28
            h-28
            object-contain
            animate-pulse
            drop-shadow-[0_0_40px_rgba(34,211,238,0.4)]
          "
        />

        {/* SPINNER */}
        <div
          className="
            mt-8
            w-14
            h-14
            border-[3px]
            border-cyan-400/20
            border-t-orange-400
            rounded-full
            animate-spin
          "
        />

        {/* TEXT */}
        <p
          className="
            mt-6
            text-white/70
            uppercase
            tracking-[0.3em]
            text-sm
          "
        >
          Loading Dashboard
        </p>
      </div>
    </div>
  );
}

  return user ? (
    <Navigate to="/admin" replace />
  ) : (
    <Outlet />
  );
};

export default PublicRoute;