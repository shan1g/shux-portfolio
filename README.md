# SHUX

Personal portfolio for **Shan Gray** — built with Next.js, Motion, GSAP, Lenis, and CSS glass UI.

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router, TypeScript, Tailwind CSS)
- [Motion](https://motion.dev/) — UI animations, menu morph, hero wordmark load
- [GSAP](https://gsap.com/) + ScrollTrigger — scroll-linked section reveals and hero scale scrub
- CSS glass panels — stable `backdrop-blur` styling

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Hero

The hero is a scroll-pinned stage: a static **OH SHUX** wordmark over a WebGPU glass fractal, with four kinetic chapters scrubbed against its own track. The pin releases at the end of the hero track, and the page content (About, Capabilities, Work, Contact) scrolls normally beneath it.

## Deploy

Recommended: [Vercel](https://vercel.com/)

## License

Private — personal portfolio.
