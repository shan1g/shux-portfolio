"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const MAGNETIC_SELECTOR = "a, button, [data-cursor-magnetic]";
const RING_LERP = 0.18;
const RING_SCALE_REST = 0.53;
const RING_SCALE_HOVER = 1;
const RING_SCALE_PRESS = 0.42;
const DOT_OPACITY_REST = "1";
const DOT_OPACITY_MAGNETIC = "0.4";

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const enabled = fine && !reducedMotion;

  useEffect(() => {
    if (!enabled) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.documentElement.dataset.cursor = "custom";

    let pointerX = window.innerWidth * 0.5;
    let pointerY = window.innerHeight * 0.5;
    let ringX = pointerX;
    let ringY = pointerY;
    let ringScale = RING_SCALE_REST;
    let targetScale = RING_SCALE_REST;
    let visible = false;
    let magnetic = false;
    let frame = 0;

    const render = () => {
      frame = requestAnimationFrame(render);

      ringX += (pointerX - ringX) * RING_LERP;
      ringY += (pointerY - ringY) * RING_LERP;
      ringScale += (targetScale - ringScale) * 0.18;

      dot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${ringScale})`;
    };

    frame = requestAnimationFrame(render);

    // The dot dims over interactive targets. Both that dim and show/hide write
    // `opacity`, so the resting value is derived rather than assumed —
    // otherwise leaving the window mid-hover could strand the dot at 0.4.
    const dotOpacity = () =>
      magnetic ? DOT_OPACITY_MAGNETIC : DOT_OPACITY_REST;

    const show = () => {
      if (visible) return;
      visible = true;
      dot.style.opacity = dotOpacity();
      ring.style.opacity = "1";
      dot.style.visibility = "visible";
      ring.style.visibility = "visible";
    };

    const hide = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      pointerX = event.clientX;
      pointerY = event.clientY;

      const target = event.target as Element | null;
      magnetic = Boolean(
        target instanceof Element ? target.closest(MAGNETIC_SELECTOR) : null,
      );
      targetScale = magnetic ? RING_SCALE_HOVER : RING_SCALE_REST;

      show();
      if (visible) dot.style.opacity = dotOpacity();
    };

    const onDown = () => {
      targetScale = RING_SCALE_PRESS;
    };

    const onUp = () => {
      targetScale = magnetic ? RING_SCALE_HOVER : RING_SCALE_REST;
    };

    window.addEventListener("pointermove", onMove, {
      passive: true,
      capture: true,
    });
    window.addEventListener("pointerdown", onDown, { capture: true });
    window.addEventListener("pointerup", onUp, { capture: true });
    document.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove, { capture: true });
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("pointerup", onUp, { capture: true });
      document.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
      delete document.documentElement.dataset.cursor;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="cursor" aria-hidden="true">
      <div ref={ringRef} className="cursor__ring" />
      <div ref={dotRef} className="cursor__dot" />
    </div>
  );
}
