"use client";

import { forwardRef } from "react";

export const ShuxWordmark = forwardRef<HTMLHeadingElement>(
  function ShuxWordmark(_props, ref) {
    return (
      <h1 ref={ref} className="hero-wordmark" aria-label="OH SHUX">
        OH SHUX
      </h1>
    );
  },
);
