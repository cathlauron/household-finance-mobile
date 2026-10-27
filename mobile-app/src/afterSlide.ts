import { InteractionManager } from 'react-native';

// Version 2.1 fix (Cath: "screens flash and go back"). Opening an edit sheet (a pop-up)
// while a page is still sliding in or out could leave the page stack confused: later pages
// opened underneath the old one. Edit sheets that come from another page ("Edit" on a bill,
// a card, a pot or a transaction) now wait until the slide has finished.
//
// 2026-10-23: "finished" = the app has settled after the slide, or 1 s at the latest.
// Something that keeps moving (an endless animation on a slower path) can keep the app
// from ever counting as settled, and the sheet then never opened (seen in Claude's
// browser: "Add an account" never appeared). Runs once either way.
import { PAGE_OPEN_MS } from './motion';

const SLIDE_MS = PAGE_OPEN_MS + 40; // a little longer than the page slide
const AT_MOST_MS = 1000;

export function afterSlide(fn: () => void): void {
  const started = Date.now();
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    fn();
  };
  InteractionManager.runAfterInteractions(() => {
    const wait = Math.max(0, SLIDE_MS - (Date.now() - started));
    setTimeout(run, wait);
  });
  setTimeout(run, AT_MOST_MS);
}
