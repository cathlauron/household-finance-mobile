import { InteractionManager } from 'react-native';

// Version 2.1 fix (Cath: "screens flash and go back"). Opening an edit sheet (a pop-up)
// while a page is still sliding in or out could leave the page stack confused: later pages
// opened underneath the old one. Edit sheets that come from another page ("Edit" on a bill,
// a card, a pot or a transaction) now wait until the slide has finished.
import { PAGE_OPEN_MS } from './motion';

const SLIDE_MS = PAGE_OPEN_MS + 40; // a little longer than the page slide

export function afterSlide(fn: () => void): void {
  const started = Date.now();
  InteractionManager.runAfterInteractions(() => {
    const wait = Math.max(0, SLIDE_MS - (Date.now() - started));
    setTimeout(fn, wait);
  });
}
