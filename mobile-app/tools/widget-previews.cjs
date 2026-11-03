// H-64 (2026-11-03): retake the six widget preview pictures (the phone's widget list) from mockup
// W2 in the app's green. Run inside mobile-app:
//   node tools/widget-previews.cjs ../design/3.0-mockups/widgets-w2.html assets/widget-preview
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
(async () => {
  const [, , mockup, outDir] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 2400 }, deviceScaleFactor: 2 });
  await p.goto(pathToFileURL(path.resolve(mockup)).href);
  await p.addStyleTag({ content: `
    :root{--ink:#111111;--muted:#6C6C70;--pink:#2E6B47;--pinkInk:#FFFFFF;--tint:#E6F0EA;--rose:#2E6B47}
    .crimson:not([style*="5C8DE8"]){background:radial-gradient(120% 90% at 100% 0%,#3E7A5C 0%,#1B3F30 45%,#122B21 100%)!important}
    .paper{background:linear-gradient(180deg,#FFFFFF,#F1F7F3)!important}
    .track{background:#E3EDE6!important}
    .mic::before,.mic::after{animation:none!important;opacity:0!important}
    .w{box-shadow:none!important}
    html,body,.bg,.bg.light{background:transparent!important}
    .mic svg,.mic svg *{stroke:#FFFFFF!important}
    .track i[style*="F28AA6"],.track i[style*="pink"]{background:#2E6B47!important}
  ` });
  await p.waitForTimeout(400);
  const names = ['left-to-spend', 'say-it', 'spend-say', 'due-soon', 'month', 'trip'];
  const els = await p.$$('.grid .cell .bg > .w');
  console.log('widgets found', els.length);
  for (let i = 0; i < names.length && i < els.length; i++) {
    const file = path.join(path.resolve(outDir), names[i] + '.png');
    await els[i].screenshot({ path: file, omitBackground: true });
    const box = await els[i].boundingBox();
    console.log(names[i], Math.round(box.width * 2), 'x', Math.round(box.height * 2));
  }
  await b.close();
})();
