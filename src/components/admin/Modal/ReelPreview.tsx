import { useEffect, useRef, useState } from "react";
import type { Creative } from "../../../utils/types/Types";

const ReelPreview = ({ creative }: { creative: Creative }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false); // true after first hover, stays true
  const [hovering, setHovering] = useState(false);
  const [ready, setReady] = useState(false);
  // original ratio of the video (only needed when there is no thumbnail)
  const [videoRatio, setVideoRatio] = useState<number | null>(null);

  const hasVideo = !!creative.videoUrl;
  const hasThumb = !!creative.thumbnailUrl;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (hovering && ready) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [hovering, ready]);

  const start = () => {
    if (!hasVideo) return;
    setLoad(true);
    setHovering(true);
  };

  const stop = () => setHovering(false);

  // touch devices have no hover, so tap toggles playback
  const handleClick = () => {
    if (!hasVideo) return;
    if (window.matchMedia("(hover: none)").matches) {
      setLoad(true);
      setHovering((h) => !h);
    }
  };

  const showSpinner = hovering && load && !ready;
  const showVideo = hovering && ready;

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={!hasThumb && videoRatio ? { aspectRatio: videoRatio } : undefined}
      onMouseEnter={start}
      onMouseLeave={stop}
      onClick={handleClick}
    >
      {/* Thumbnail sets the card height = its exact original ratio */}
      {hasThumb ? (
        <img
          src={creative.thumbnailUrl}
          alt={creative.title}
          className="block w-full h-auto"
        />
      ) : (
        <div
          className={`w-full flex items-center justify-center bg-gradient-to-br from-pink-900/30 to-fuchsia-900/30 ${
            videoRatio ? "h-full" : "aspect-video"
          }`}
        >
          <div className="text-center">
            <div className="text-3xl mb-2">▶</div>
            <p className="text-xs text-zinc-400">
              {hasVideo ? "Reel Video" : "Instagram Reel"}
            </p>
          </div>
        </div>
      )}

      {/* Video: mounted on first hover, so nothing downloads until then */}
      {hasVideo && load && (
        <video
          ref={videoRef}
          src={creative.videoUrl}
          muted
          loop
          playsInline
          preload="auto"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) {
              setVideoRatio(v.videoWidth / v.videoHeight);
            }
          }}
          onCanPlay={() => setReady(true)}
          onError={() => setReady(false)}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
            showVideo ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Play icon (idle state) */}
      {!hovering && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <span className="text-black text-xl ml-1">▶</span>
          </div>
        </div>
      )}

      {/* Loading spinner while buffering */}
      {showSpinner && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ReelPreview;