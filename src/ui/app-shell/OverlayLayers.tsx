export function OverlayLayers() {
  return (
    <>
      <svg
        id="distortion-overlay"
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 2,
          display: "none"
        }}
      >
        <defs>
          <filter id="distortion-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence
              id="distortion-turbulence"
              type="turbulence"
              baseFrequency="0.08 0.08"
              numOctaves="2"
              seed="1"
              result="noise"
              stitchTiles="stitch"
            />
            <feDisplacementMap
              id="distortion-displacement"
              in="SourceGraphic"
              in2="noise"
              scale="2"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <image
          id="distortion-image"
          x="0"
          y="0"
          width="100"
          height="100"
          preserveAspectRatio="none"
          filter="url(#distortion-filter)"
        />
      </svg>
      <img
        id="paper-texture-overlay"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
          pointerEvents: "none",
          zIndex: 3,
          display: "none"
        }}
      />
    </>
  );
}
