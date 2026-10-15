Household Finance Mobile App — PROGRESS6 archive 2 (archived 2026-10-15)

This file holds a detailed session write-up moved out of PROGRESS6.md to keep it short.
Nothing here is lost: everything that still matters is folded into PROGRESS6.md's
✅ Done / 📌 Decisions / ⚠️ Known issues sections. Archive 1 (PROGRESS6-ARCHIVE-1.md)
holds the earlier Phase D / H / V series sections.

Update 2026-10-15: Cath confirmed both rubber-band OPEN PROBLEMS below are now done
(no longer open).

=====================================================================
🫧 RUBBER BAND AUDIT (Android): plain ScrollViews swapped; Bills and Person Spending still have NO bounce (OPEN PROBLEMS)
=====================================================================

Why: Cath wanted the rubber-band overscroll on screens that lacked it. Worked as Antigravity investigates (read-only, three passes), Claude reviews, Cath pastes by hand. Every swap was one tag rename plus an import, with npx tsc --noEmit after each file.

✅ DONE, tsc clean, device-tested on Android:
- Screens using a plain react-native ScrollView were swapped to PullToRefreshScrollView (a NAMED export: import { PullToRefreshScrollView } from '...', with braces). It forwards refs and all ScrollView props, and has no onRefresh prop, so nothing broke.
- MoreScreen.tsx and PremiumScreen.tsx (done earlier in this work).
- SavingsScreen.tsx: only the Emergency Fund ('ef') and FI Calculator ('fi') tabs; the Goals tab already used it.
- SettingsScreen.tsx: the ONE ScrollView (ref={scrollRef}) that serves the hub and all 15 sub-pages. The import was added and ScrollView was kept in the react-native import because useRef<ScrollView> still needs the type.
- The 9 report screens in src/screens/reports/ (MonthlyCloseOut, CashFlowForecast, PersonSpending, WeeklyDigest, SubscriptionAudit, YearInReview, MerchantSpending, TaxSummary, PaymentMethods), each with import { PullToRefreshScrollView } from '../../PullToRefreshScrollView'.
- Device result: 8 of the 9 reports bounce at both top and bottom. Debts and Loans bounce. Device results for the Savings EF/FI tabs and Settings were not itemised separately.
- Deliberately NOT touched: ReportsScreen.tsx (only two horizontal pill ScrollViews), CalendarScreen (FlatList), BottomSheet (bounces={false} on purpose), IntroSlidesScreen, and the dialog modals (CsvImport, LoanPayoffSimulator, SavingsFiComparison).

⚠️ OPEN PROBLEM 1: BILLS SCREEN HAS NO BOUNCE ON ANDROID
- BillsScreen already uses PullToRefreshScrollView, yet it never bounces. Debts and Loans, with the same component, DO bounce.
- RULED OUT (tested on-device):
  - Short content: the test account has more bills than debts and loans combined, so Bills scrolls, and the "content shorter than the screen" theory is wrong.
  - Mount order: ToPayScreen's default sub-tab was temporarily changed from 'bills' to 'loans'. Loans (now mounted first) still bounced, and Bills (now mounted later) still did NOT. The line was then changed back to 'bills'. (Confirm with git diff that ToPayScreen.tsx shows no change.)
  - Remounting: opening Debts and then returning to Bills did not help.
- RULED OUT by reading real code: Bills, Debts and Loans have the SAME wrappers (SafeAreaView flex:1, then PullToRefreshScrollView with only contentContainerStyle), the same container/scrollContent styles, the same SwipeableRow + CollapsibleRow rows built with .map, and the same single useRef/useEffect that opens an item. None uses scrollTo, onLayout, a nested FlatList, nestedScrollEnabled or a sticky header.
- Only known differences, none shown to matter: Bills has subscription badges (SUB/CANCELLED) and Keep/Cancel/Reactivate buttons inside rows; it mounts by default; its open-bill prop can be filled at mount (deep link); it is sorted with sortByNextDue like Debts.
- UNTESTED ideas for next time (do NOT apply without evidence): the real Bills data (a particular bill or the subscription rows); whether something in the Bills modal or its sheet changes the scroll view; whether the row renders differently from Debts under the same SwipeableRow settings. A safe experiment is to temporarily render Bills with a trimmed list (for example only the first 3 bills) and see whether bounce returns.
- Rejected earlier: minHeight:'100.5%' in the shared component (unreliable, affects every screen) and flexGrow:1 on Bills (does not address the theory).

⚠️ OPEN PROBLEM 2: PERSON SPENDING REPORT BOUNCES AT THE TOP ONLY
- On Android it stretches when pulled down at the top but stays still when pushed past the bottom. The other 8 reports bounce both ways.
- Real code shows its structure matches WeeklyDigestReport (same container and contentContainer styles, same host in ReportsScreen, no absolute positioning or fixed heights). The only structural difference is that its last child is a plain Text footerNote (marginTop 4, marginBottom 12), outside any Card, and the number of cards depends on how many people have spending.
- Not yet checked: whether the report actually scrolls when dragged (if it fits the screen there is no bottom bounce to see), and how many cards the test account shows. Check this first.

📌 Lessons (this round)
- Never write find/replace text from an Antigravity summary. Use code Cath has pasted from the real file, or ask for a read-only dump first. The first PremiumScreen paste left two stray lines for this reason.
- The method that works: one file at a time, Ctrl+F the tag, change only the tag name, fix the import, run tsc.
- Remaining files that probably still use a plain ScrollView (not requested yet): ProfileScreen, AccountSwitcherScreen, SignInScreen, CreateProfileScreen, OnboardingScreen, SetPinScreen.

