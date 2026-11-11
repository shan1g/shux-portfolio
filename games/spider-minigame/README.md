# Chrome spider (backup for the mini game)

A self-contained copy of the SHUX chrome spider, kept for a future mini game after the site moved to the chameleon.

## What's here

- `lib/spider.js`, `lib/parts.js`, `lib/util.js`: the model, built in code. `buildSpider()` returns `{root, pose, clear, M, anchors, legs}`. `pose({explode, feet, tuck, reach, t, spinT, sub, palp})` sets the whole spider for one moment, and `legHome(i)` / `legTuck(i)` give each foot's standing and tucked spots.
- `lib/createChromeSpiderRenderer.ts`: the hero renderer, with the scroll-driven teardown, the floor reflection and the shared reflection environments (`spiderEnvironments`).
- `lib/createSpiderWalker.ts`: the small side-on walker, with the alternating four-and-four gait, the turning, and the drop on a thread.
- `components/`: the React wrappers (`HeroChromeSpider`, `SpiderWalker` and their canvases). They load three.js in their own chunk.
- `cutaway/`: the cutaway-kit entry used for the build rounds, plus the reference picture.
- `spider-walker.less`, `hero-spider.less`: the walker's and the hero spider's styles, saved from `app/styles/_hero.less` when the live spider was removed. They expect the site's `@z-walker` variable and its `--safe-bottom` and `--foreground` custom properties.

## Using it

The components import from `../lib/` and from `@/components/theme/ThemeProvider` only, so the folder can move as a whole. To render the cutaway still or teardown:

```
node "$SKILL_DIR/sims/build.mjs" ./games/spider-minigame/cutaway/chrome
```

Mini game ideas the rig already supports: steer the walker with the arrow keys (`setPosition`), jump with `tuck`, and tear it apart on a hit with `explode`.
