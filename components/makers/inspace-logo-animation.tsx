import type { CSSProperties } from "react";

// Wrapper grows and the svg scales to fill it. Widths fill 100%
// proportionally to natural size: flex-basis 0 + grow weighted by natural
// width scales every letter by the same factor. aspect-ratio is hardcoded so
// height stays tied to width as they grow. alignSelf: start keeps the
// container's default stretch from overriding the aspect ratio.
const narrow = {
  flex: "44 1 0%",
  minWidth: 0,
  alignSelf: "start" as const,
  aspectRatio: "44 / 219",
};
const wide = {
  flex: "175 1 0%",
  minWidth: 0,
  alignSelf: "start" as const,
  aspectRatio: "175 / 219",
};
const svgStyle = { width: "100%", height: "100%", display: "block" };

// The rise amount is a CSS custom property consumed by the `inspace-rise`
// keyframes in app/makers/maker.css. Letters pair from the outside in
// (I/E, N/C, S/A) and share a rise; P stays put.
const rise = (amount: string) =>
  ({ ...svgStyle, "--rise": amount }) as CSSProperties;

export function InSpaceLogoAnimation() {
  return (
    <div className="flex gap-4 justify-between overflow-clip h-40 md:h-54.75">
      {/*I*/}
      <div style={narrow}>
        <svg
          style={rise("70%")}
          className="inspace-rise"
          aria-hidden="true"
          viewBox="0 0 44 219"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0.000274658L0 218.426H43.6883L43.6883 0.000274658H0Z"
            fill="#EFEFEF"
          />
        </svg>
      </div>

      {/*N*/}
      <div style={wide}>
        <svg
          style={rise("45%")}
          className="inspace-rise"
          aria-hidden="true"
          viewBox="0 0 175 219"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M174.753 0V218.441H131.065V105.467L69.2701 43.6883H43.6883V218.441H0V0H87.3766L131.065 43.6883V0H174.753Z"
            fill="#EFEFEF"
          />
        </svg>
      </div>

      {/*S*/}
      <div style={wide}>
        <svg
          style={rise("20%")}
          className="inspace-rise"
          aria-hidden="true"
          viewBox="0 0 175 219"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M174.737 0V65.5404H131.049V43.6883H43.6882V87.0737H174.737V218.441H0V152.901H43.6882V174.753H131.049V130.762H0V0H174.737Z"
            fill="#EFEFEF"
          />
        </svg>
      </div>

      {/*P*/}
      <div style={wide}>
        <svg
          style={rise("0%")}
          className="inspace-rise"
          aria-hidden="true"
          viewBox="0 0 175 219"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0V218.425H43.6883V131.049H174.753V0H0ZM131.065 87.3766H43.6883V43.6883H131.065V87.3766Z"
            fill="#EFEFEF"
          />
        </svg>
      </div>

      {/*A*/}
      <div style={wide}>
        <svg
          style={rise("20%")}
          className="inspace-rise"
          aria-hidden="true"
          viewBox="0 0 175 219"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0V218.425H43.6882V131.049H131.065V218.425H174.753V0H0ZM131.065 87.3766H43.6882V43.6883H131.065V87.3766Z"
            fill="#EFEFEF"
          />
        </svg>
      </div>

      {/*C*/}
      <div style={wide}>
        <svg
          style={rise("45%")}
          className="inspace-rise"
          aria-hidden="true"
          viewBox="0 0 175 219"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M174.737 0V65.5404H131.049V43.6883H43.6882V174.753H131.049V152.901H174.737V218.441H0V0H174.737Z"
            fill="#EFEFEF"
          />
        </svg>
      </div>

      {/*E*/}
      <div style={wide}>
        <svg
          style={rise("70%")}
          className="inspace-rise"
          aria-hidden="true"
          viewBox="0 0 175 219"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M43.6883 43.6883V87.3766H174.753V131.065H43.6883V174.753H174.753V218.441H0V0H174.753V43.6883H43.6883Z"
            fill="#EFEFEF"
          />
        </svg>
      </div>
    </div>
  );
}
