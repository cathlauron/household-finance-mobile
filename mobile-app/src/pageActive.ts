import { createContext, useContext } from 'react';

// Smoothness 2026-10-23: sliding sub-pages (components/SlidingPages.tsx) keep the pages
// beside the one you're on built, so they can follow your finger. Those pages are told
// they're not showing, so things meant for your eyes (a new row lighting up) wait until
// the page is on screen. Anything outside sliding pages counts as showing.
export const PageActiveContext = createContext(true);

export function usePageActive(): boolean {
  return useContext(PageActiveContext);
}
