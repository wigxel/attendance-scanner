"use client"
import React from "react";

export function InSpaceLogoAnimation() {
  const ref = React.useRef<HTMLElement>(null);

  React.useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;

    let contHeight = container.offsetHeight;

    // Filter for actual SVG elements, not just any node.
    // Also, use a regular array instead of unshift to avoid type issues and potential confusion.
    const svgs = Array.from(container.querySelectorAll('svg')) as SVGSVGElement[];

    // Given scrollProgress in [0, 1] and per-item maxTranslate (0.25, 0.5, 0.75, ...)
    function getTranslateY(scrollProgress: number, maxTranslate: number) {
      const clamped = Math.max(0, Math.min(1, scrollProgress));
      const p = easedProgress(clamped);
      // interpolate: 0..1 scroll → 0..maxTranslate
      const translate = p * maxTranslate; // in "fraction" of 1

      return translate * 100; // convert 0..1 → 0..100%

      function easedProgress(p: number) {
        return Math.pow(p, 2); // ease-in, so at 0.25 → 0.0625 (~6.25%)
      }
    }

    const interpolateTranslateYByScroll = () => {
      const scrollProgress = getProgress();
      // The indexes directly correspond to the SVG elements in the `svgs` array.
      // If svgs.at(-index) is intended, ensure the array has enough elements or handle it.
      // In this specific case, svgs.length is 7, and indexes go up to 4.
      // So svgs.at(1), svgs.at(2), svgs.at(3), svgs.at(4) are 'I', 'N', 'S', 'P'
      // and svgs.at(-1), svgs.at(-2), svgs.at(-3), svgs.at(-4) are 'E', 'C', 'A', 'P'
      // This logic seems correct for the provided SVG structure.
      const indexes = [0, 1, 2, 3]; // Adjust indexes to be 0-based for array access

      const stagger_percentage = 0.15; // Define once

      for (const index of indexes) {
        const itemIndexesToAnimate = [index, -(index + 1)]; // Example: 0, -1 then 1, -2, etc.
        // For the first loop (index=0), it's svgs[0] and svgs[svgs.length - 1] ('I' and 'E')
        // For the last loop (index=3), it's svgs[3] and svgs[svgs.length - 4] ('P' and 'A')

        for (const item_pos of itemIndexesToAnimate) {
          // Adjust maxTranslate calculation to align with 0-based indexing or desired behavior
          // Current logic seems to want a decreasing stagger effect from the outside in.
          // (indexes.length - 1 - index) would give 3, 2, 1, 0 for 0, 1, 2, 3 respectively.
          const maxTranslate = stagger_percentage * (indexes.length - 1 - index);
          const offsetY = getTranslateY(scrollProgress, maxTranslate);

          const svgEl = svgs.at(item_pos); // Using .at() for negative indexing is good
          if (svgEl) {
            svgEl.style.transform = `translateY(${offsetY}%)`;
          }
        }
      }
    };

    const setContainerValues = () => {
      // Use clientHeight for consistency if no padding/border issues, or offsetHeight as before.
      // offsetHeight includes padding and border.
      contHeight = container.offsetHeight;
    };

    const getProgress = () => {
      // Calculate progress relative to the container's top, starting when the bottom of the viewport
      // reaches the container's top.
      const scrollYAdjusted = window.scrollY + window.innerHeight;
      const containerTop = container.offsetTop;

      // Progress should start at 0 when scrollYAdjusted is at containerTop, and increase.
      // The current formula `Math.max(0.01, ...)` forces a minimum progress, which might not be desired
      // if the animation should only start when the container is in view.
      // A more robust way to define progress relative to the container itself:
      const scrollPositionInContainer = scrollYAdjusted - containerTop;
      let progress = scrollPositionInContainer / contHeight;

      // Clamp progress between 0 and 1, or allow it to go beyond if the animation
      // should continue after the container is fully scrolled past.
      progress = Math.max(0, Math.min(1, progress));

      return progress;
    };

    const handleScroll = interpolateTranslateYByScroll;

    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          window.addEventListener("scroll", handleScroll);
          handleScroll();
        } else {
          window.removeEventListener('scroll', handleScroll);
        }
      }
    }, {
      rootMargin: '10% 0px 10% 0px'
    });

    observer.observe(container);
    window.addEventListener('resize', setContainerValues);

    setContainerValues();
    handleScroll();

    return () => {
      observer.unobserve(container);
      window.removeEventListener('resize', setContainerValues);
      window.removeEventListener('scroll', handleScroll); // Ensure scroll listener is also cleaned up
    };
  }, [ref]); // Depend on ref.current implicitly, but ref itself is stable

  return <div ref={ref} className="flex gap-1 justify-between overflow-clip h-40 md:h-54.75">
    {/*I*/}
    <svg width="44" height="219" viewBox="0 0 44 219" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0.000274658L0 218.426H43.6883L43.6883 0.000274658H0Z" fill="#EFEFEF" />
    </svg>

    {/*N*/}
    <svg width="175" height="219" viewBox="0 0 175 219" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M174.753 0V218.441H131.065V105.467L69.2701 43.6883H43.6883V218.441H0V0H87.3766L131.065 43.6883V0H174.753Z" fill="#EFEFEF" />
    </svg>

    {/*S*/}
    <svg width="175" height="219" viewBox="0 0 175 219" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M174.737 0V65.5404H131.049V43.6883H43.6882V87.0737H174.737V218.441H0V152.901H43.6882V174.753H131.049V130.762H0V0H174.737Z" fill="#EFEFEF" />
    </svg>

    {/*P*/}
    <svg width="175" height="219" viewBox="0 0 175 219" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0V218.425H43.6883V131.049H174.753V0H0ZM131.065 87.3766H43.6883V43.6883H131.065V87.3766Z" fill="#EFEFEF" />
    </svg>

    {/*A*/}
    <svg width="175" height="219" viewBox="0 0 175 219" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0V218.425H43.6882V131.049H131.065V218.425H174.753V0H0ZM131.065 87.3766H43.6882V43.6883H131.065V87.3766Z" fill="#EFEFEF" />
    </svg>


    {/*C*/}
    <svg width="175" height="219" viewBox="0 0 175 219" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M174.737 0V65.5404H131.049V43.6883H43.6882V174.753H131.049V152.901H174.737V218.441H0V0H174.737Z" fill="#EFEFEF" />
    </svg>

    {/*E*/}
    <svg width="175" height="219" viewBox="0 0 175 219" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M43.6883 43.6883V87.3766H174.753V131.065H43.6883V174.753H174.753V218.441H0V0H174.753V43.6883H43.6883Z" fill="#EFEFEF" />
    </svg>
  </div>
}
