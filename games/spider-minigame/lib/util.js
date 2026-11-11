// The one helper the chrome spider took from the cutaway kit (cutaway-kit/util.js).
// The spider's kitbash is scattered with it at build time, so every build of the
// spider is identical.

/** Seeded PRNG (mulberry32). Same seed → same sequence. */
export const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};
