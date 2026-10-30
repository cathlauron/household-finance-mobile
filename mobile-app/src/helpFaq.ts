// Help & FAQ (mockup H1, approved by Cath 2026-10-29). ONE list of questions, shown in two
// places: the Help & FAQ page in the app (Settings > About & Help) and the support web page
// the app stores link to (hosting/support.html, made from this file by
// tools/build-web-pages.mjs; a check fails if the page and this list ever differ).
// Every answer was checked against the app on 2026-10-29. When a feature changes, change
// its answer here, then run: node --experimental-strip-types tools/build-web-pages.mjs

export const SITE = 'https://household-finance-mobile.web.app';
export const SUPPORT_URL = `${SITE}/support`;
export const PRIVACY_URL = `${SITE}/privacy`;
export const DELETE_ACCOUNT_URL = `${SITE}/delete-account`;

export type FaqItem = { q: string; a: string };
export type FaqGroup = { title: string; items: FaqItem[] };

export const FAQ: FaqGroup[] = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'Do I need an account?',
        a: 'Not to look around. You can set up Finance Flow as a guest. The first time you add money (a bill, a transaction or an account), it asks you to save Finance Flow to your email, so your data is locked with your password and backed up.',
      },
      {
        q: 'How do I add my first transaction?',
        a: 'Tap the + button and choose Transaction. Paying a bill, debt or loan from its page adds the transaction for you.',
      },
    ],
  },
  {
    title: 'Household',
    items: [
      {
        q: 'How do I share with my household?',
        a: 'Settings › your profile › Household › Invite someone. They scan the code or open the invite link, and you all see the same budget. Up to 5 people can share one household.',
      },
      {
        q: 'Who added this?',
        a: 'Items show a small tag with who added them, so you can tell your entries from your household’s.',
      },
    ],
  },
  {
    title: 'Money and Left to Spend',
    items: [
      {
        q: 'What is Left to Spend?',
        a: 'What your accounts hold now, minus everything still due before your next payday: bills, debts, loan payments, plans, savings and lists. Tap the amount to see every item.',
      },
      {
        q: 'I made a mistake on a payment. Can I undo it?',
        a: 'Yes, for 15 minutes after you log it. After that, open the payment from its history and edit it instead.',
      },
    ],
  },
  {
    title: 'Privacy and security',
    items: [
      {
        q: 'Who can see my money data?',
        a: 'Only you and the people in your household. Your money data is locked (encrypted) on your phone before it is saved online.',
      },
      {
        q: 'What is the Recovery Key?',
        a: 'A 16-character key made when you created your account. If your password ever stops unlocking your data, the Recovery Key opens it. Keep it somewhere safe and never share it, not even with support.',
      },
      {
        q: 'Why do my amounts hide after a while?',
        a: 'After 5 minutes without a touch, the app asks if you’re still there. With no answer for 1 more minute, the amounts hide. Tap Show to see them again (with your PIN or fingerprint, if you set one up).',
      },
    ],
  },
  {
    title: 'Your account',
    items: [
      {
        q: 'How do I delete my account?',
        a: 'Email support from the address you signed up with and ask us to delete your account. Our website explains every step and what gets deleted: household-finance-mobile.web.app/delete-account',
      },
    ],
  },
];

// Search: a question shows when every word typed appears in its question or answer
// (any order, any capitals). An empty search shows everything.
export function faqMatches(item: FaqItem, search: string): boolean {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = (item.q + ' ' + item.a).toLowerCase();
  return words.every((w) => text.includes(w));
}

export function searchFaq(groups: FaqGroup[], search: string): FaqGroup[] {
  return groups
    .map((g) => ({ title: g.title, items: g.items.filter((i) => faqMatches(i, search)) }))
    .filter((g) => g.items.length > 0);
}
