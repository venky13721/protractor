# 📐 PROTRACTOR

**How well do you *really* know your angles?**

A fast, flashy angle-guessing game. Each round you're given a number — say **270°** — and all you get is two arrows around a shared vertex. No ticks, no numbers, no protractor. Drag the pink arrow until the angle between them *feels* right, before the timer runs out.

## How it works

- **5 rounds**, **7 seconds** each
- The target angle is measured **counter-clockwise** from the cyan arrow to your pink arrow (so reflex angles like 270° are in play)
- The dial spins to a random orientation every round — no frame of reference, ever
- Each round scores up to **10.00** points, decaying exponentially with your error:
  `score = 10 · e^(−error° / 22)` (a guess within 1° is a perfect 10.00)
- Get a final rank, from **Blindfolded Builder** all the way to **Protractor Prodigy**

## Tech

- [React 19](https://react.dev) + [Vite](https://vite.dev)
- [GSAP](https://gsap.com) for screen transitions, arc reveals, count-ups, aurora drift and confetti physics
- Components inspired by [reactbits.dev](https://reactbits.dev): Aurora background, Shiny Text, Click Spark, Count Up
- All sound effects synthesized live with the **Web Audio API** — zero audio assets

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

## Deploy to Vercel

The repo ships a `vercel.json` that pins the framework to **Vite** (build command `npm run build`, output `dist`), so it deploys correctly even if the Vercel project was previously configured with a different framework preset. Just import the repo on [vercel.com](https://vercel.com) and deploy.
