Household Finance Mobile App — Progress Log (Phase B on-device bug-fixing → Phase C: Publishing)

This file picks up exactly where PROGRESS3.md left off. PROGRESS3.md is now
closed/historical — it covers Phase B Part 2 in full (the Iconization &
Minimalism Pass, B2.1–B2.3, the bottom nav redesign, the "fewer words" pass
on SettingsScreen.tsx/ProfileScreen.tsx) plus the first full on-device
testing pass across everything from B.7 onward. See PROGRESS3.md for that
detail. PROGRESS2.md (Phase B build, B.1–B.14) and PROGRESS1.md (Phase A)
and PROGRESS.md (original Phases 0–11) are closed/historical before that.

📅 Session entries

(New sessions from here on get logged here, newest near the top, same
format as PROGRESS3.md's own session entries.)

### Session — B.12b scoped via Antigravity investigation

Investigated via Antigravity (investigation-only, no commits from the
tool) to recover the original intent behind the unscheduled "B.12b"
item, since the full original scoping (from PROGRESS1.md/PROGRESS2.md)
had never been folded into this file's own carried-forward notes.
Antigravity searched the full codebase and commit history and confirmed:

B.12 was originally scoped (PROGRESS1.md) as a Simplifi-inspired
"expanded FI/retirement calculator" bundling four things: (1) configurable
withdrawal rate/return rate/timeline, (2) a pension/Social Security
offset, (3) a multi-account selector for which accounts count toward FI
net worth, and (4) a scenario-comparison modal. During implementation
(commit 4b808b1), item (1) was built directly into SavingsScreen.tsx as
B.12a; items (2), (3), and (4) were explicitly deferred as B.12b.

Confirmed via codebase search that none of B.12b's three pieces exist in
any form today — no fields in `CalculatorInputs` (types.ts), no offset
logic in SavingsScreen.tsx's FI math, no account-picker UI anywhere, and
no FI-specific comparison modal. The app's only existing "scenario
comparison" UI pattern is LoanPayoffSimulatorModal.tsx (Snowball vs.
Avalanche side-by-side stat cards), which was confirmed as a usable
structural reference for building B.12b's comparison modal once reached.

Confirmed the exact gaps each piece would plug into, in SavingsScreen.tsx's
real current FI math:
- Pension/SS offset: `fiNumber = fiExpensesNum / (fiSwrForMath / 100)` —
  currently assumes 100% of annual expenses must be portfolio-funded, with
  no field to subtract guaranteed non-portfolio income first.
- Multi-account selector: `suggestedNetWorth` unconditionally sums every
  account in `model.balanceAccounts.investment/cash/debit` — no way to
  pick which accounts should count.
- Scenario-comparison modal: doesn't exist for Savings/FI in the mobile
  app at all (only exists for Loans, via LoanPayoffSimulatorModal.tsx).

Decision made: rather than build B.12b as one large session, split it into
three smaller checkpoints — B.12b-1 (pension/SS offset — smallest, purely
additive to existing FI math), B.12b-2 (multi-account selector — more UI
work, self-contained to the "current savings" computation), and B.12b-3
(scenario-comparison modal — largest, benefits from B.12b-1/2 being done
first so there's something meaningful to compare). No code written this
session — investigation and scoping only.

### Session — "Fewer words" pass: MoreScreen.tsx

Investigated via Antigravity (investigation-only, no commits from the
tool). Antigravity supplied the full, real, unelided contents of
MoreScreen.tsx — a short file whose only user-visible text is the 6
destination-row subtitles in a `DESTINATIONS` array (Accounts, Income,
Savings, Planning, Insights, Settings) — and proposed 3 trims plus 3
borderline items to leave alone.

One item needed verification before accepting it: the proposed Accounts
subtitle trim ("Cash, debit, credit & other balances" → "Cash, debit &
credit balances") depended on a factual claim — that AccountsScreen.tsx
only handles cash/debit/credit — which Antigravity had only partially
confirmed (had viewed lines 1-40 of a 606-line file). Since the app's
underlying data model (`BalanceAccounts` in types.ts) also includes
`investment`, `property`, and `vehicle` fields, dropping "& other" could
have silently mis-stated real screen coverage rather than just trimming
wording, if those categories were in fact rendered anywhere on the
screen. Ran a second, targeted investigation prompt asking Antigravity
to report AccountsScreen.tsx's real, full account-group handling with no
proposed changes. Confirmed: `AccountsScreen.tsx` defines
`type AccountGroup = 'cash' | 'debit' | 'credit'` and a matching
`GROUPS` constant, and renders/allows-adding-to only those three groups
end to end (section loop, add-account buttons, add/edit modal) —
`investment`/`property`/`vehicle` exist only in the underlying data
model (preserved by mergeModels.ts) and are not surfaced anywhere on
this screen. This confirmed the original trim was accurate, not
overreaching — investment/property/vehicle are a real, separate,
not-yet-built gap in the mobile app, not something this screen's
subtitle was ever claiming to cover.

Applied (hand-pasted by the person after review, as 3 find/replace
snippets): trimmed the Accounts, Income, and Settings subtitles as
described above. The 3 borderline items Antigravity flagged (Savings,
Planning, Insights subtitles — each already a near-exact 1:1 word-per-
child-tab listing) were left untouched, matching Antigravity's own
recommendation. `npx tsc --noEmit` clean (0 errors) — text-only change
inside a typed array of string literals, no type impact. Committed and
pushed.

This completes MoreScreen.tsx on the "fewer words" ranked list.

### Session — "Fewer words" pass: SignInScreen.tsx

Investigated via Antigravity (investigation-only, no commits from the
tool). Antigravity supplied the real, full, unelided contents of
SignInScreen.tsx plus 20 proposed wordy-text trims across error
messages, Firebase-error translations, validation messages, loading-
state labels, a slow-hint message, the "Password Accepted, But Data
Locked" modal, both recovery-option section descriptions, the peer-
approval waiting instructions, the dead-end recovery guidance, and the
final cancel button — each shown with real surrounding code. All 20
reviewed against the real code and confirmed text-only, touching no
logic/state/validation/handler behavior. One adjustment made during
review: the dead-end recovery guidance (item 19/20) was trimmed more
conservatively than proposed, keeping the exact quoted button name
("Clear all data & start fresh") intact rather than replacing it with
vague wording — since that's the last-resort recovery path, losing the
precise label there makes it harder to find rather than easier. The 9
items Antigravity flagged as borderline (already about as short as they
can be while staying clear) were left untouched, matching Antigravity's
own recommendation.

Applied (hand-pasted by the person after review, as 21 find/replace
snippets — one item, the duplicate "Could not find any saved data for
that profile" message, has two real, separate occurrences in the file
and was given as two snippets): trimmed all 20 items as described
above, with the one adjustment noted. `npx tsc --noEmit` clean (0
errors) — text-only change, no type impact. Committed and pushed.

This completes SignInScreen.tsx on the "fewer words" ranked list. Next
up per that list: MoreScreen.tsx (6 items).

### Session — Swipe-to-navigate on Debt/Loan/Income/Savings-derived Transactions rows: implemented

Implemented via Antigravity (five rounds of investigation-only prompts,
no commits from the tool), completing the design-change item deferred
in the prior Bills-only swipe-to-navigate session. Investigation
confirmed Debts and Loans are tabs inside ToPayScreen.tsx (same
situation as Bills), while Income and Savings are standalone RootStack
screens reached via `navigation.navigate('Income'/'Savings')` — not
tabs inside MainTabs — so they don't need the pub-sub/nonce mechanism
at all; a plain navigation param is enough since pushing them doesn't
remount any tab bar. Confirmed exact field names before writing
anything: `Loan.actualPayments`, `IncomeSource.paymentLog`,
`SavingsGoal.contributions`, and confirmed `TransactionEntry.source`'s
real allowed values (`'bill' | 'debt' | 'loan' | 'income' | 'saving' |
'manual'` — singular `'saving'`, not `'saving**s**'`) and the exact
`source:` string used on income-sourced (`'income'`) and
savings-sourced (`'saving'`) entries in `buildTransactionsList()`,
rather than guessing — an earlier version of this plan would have
silently never matched those two conditions if guessed wrong, with no
error or crash to signal it. Also confirmed `navigation.push(...)` is
unused anywhere in the codebase and unsafe to introduce here, since
TransactionsScreen sits inside a bottom tab navigator, which has no
`push()` — confirmed `navigation.navigate(...)`, same as Bills already
uses, is the correct approach throughout.

Implemented (hand-pasted by the person after review):
- New files, openDebtRequest.ts and openLoanRequest.ts — exact mirrors
  of openBillRequest.ts's pub-sub-with-nonce pattern, kept as separate
  modules rather than generalized into one shared module, so Bills'
  already-implemented and tested code stays completely untouched.
- DebtsScreen.tsx / LoansScreen.tsx — added optional
  `openDebtId`/`openDebtNonce` and `openLoanId`/`openLoanNonce` props,
  each with the same `{ id, nonce }`-comparing guard-ref effect pattern
  BillsScreen.tsx already uses.
- ToPayScreen.tsx — subscribes to both new pub-sub modules alongside
  the existing Bills one; a fired request switches `activeSubTab` to
  'debts'/'loans' and forwards `{ id, nonce }` down to the matching
  screen.
- RootStack.tsx — added optional `openIncomeId`/`openIncomeNonce` and
  `openSavingsId`/`openSavingsNonce` params to `Income`/`Savings` in
  `RootStackParamList` (previously both `undefined`); both
  `Stack.Screen` entries switched from a plain `component={...}` to a
  render-callback form that pulls `route.params` and passes them down
  as plain props — mirroring the exact pattern already used for
  `Main: { openBillId?: string }`, the only precedent for this in the
  codebase (no `useRoute()`/`RouteProp` usage exists anywhere, so this
  sets the first instance of the pattern for a directly-registered
  stack screen).
- IncomeScreen.tsx / SavingsScreen.tsx — added the matching optional
  props and the same guard-ref effect. One real bug caught by `tsc`
  during this step: the effect was initially placed above the
  `const { model } = useData()` line it depends on, which fails at
  compile time ("used before its declaration") since `const` isn't
  hoisted — fixed by moving the ref/effect block to right after the
  existing `useData()` call in both files.
- TransactionsScreen.tsx — added `findDebtIdForTransaction`,
  `findLoanIdForTransaction`, `findIncomeSourceIdForTransaction`, and
  `findSavingsGoalIdForTransaction`, each mirroring
  `findBillIdForTransaction`'s exact shape (walking a row's composite
  id back to its real source record by scanning the matching array —
  `cycles`, `actualPayments`, `paymentLog`, `contributions`
  respectively). The row's `viewAction` is now a single
  if/else-if chain checking all five source types (Bill/Debt/Loan
  reuse `requestOpenX` + `navigation.navigate('To-Pay')`; Income/
  Savings call `navigation.navigate('Income'/'Savings', { ...params })`
  directly). One extra compiler round needed: casting the screen name
  and the params object separately as `as never` on the same call
  produced a `[never, never]` tuple TypeScript couldn't match against
  any `navigate` overload — fixed by casting `navigation` itself to
  `any` for just those two calls instead of casting each argument.

`npx tsc --noEmit` clean (0 errors) after two small follow-up fixes
(the `model`-before-declaration ordering issue, and the `[never,
never]` navigate-argument issue), both caught by the compiler and
fixed in the same session. Per the person's standing direction,
on-device testing of this is deferred and will be batched together
with every other pending on-device item, rather than tested in
isolation now. This completes item #1 from the "what's still open"
list — the only other genuinely open new-work item remaining is the
"fewer words" pass.

### Session — Swipe-to-navigate on Bills-derived Transactions rows: implemented

Implemented via Antigravity (three rounds of investigation-only prompts,
no commits from the tool) the Bills half of the swipe-to-source-record
design decided in the prior scoping session. Two extra investigation
rounds were needed beyond the original scoping pass: one to confirm the
real current contents of myPerson.ts (as the pattern to mirror),
ToPayScreen.tsx, BillsScreen.tsx's guard/effect, the registered tab name
('To-Pay'), and every existing `<SwipeableRow>` call site (11 total,
confirmed none would break from an added optional prop); a second,
narrower one to see SwipeableRow.tsx's full real render body (Reanimated/
gesture-handler `Swipeable` + `renderRightActions`), which the first
round hadn't captured, before writing any change to it.

Confirmed reusing the existing notification-only `openBillId` deep-link
chain (`navigate('Main', { openBillId })` + MainTabs' remount-by-key)
would be unsafe from inside an already-open app: the key-based remount
tears down and resets state on every bottom tab, not just To-Pay, and a
second swipe on the same bill would silently no-op against
`BillsScreen`'s existing `openedBillIdRef` guard, since the id wouldn't
have changed. Built a separate, transient in-memory mechanism instead.

Implemented (hand-pasted by the person after review):
- New file, openBillRequest.ts — a small pub-sub module mirroring
  myPerson.ts's `subscribeToX`/notify pattern, but not persisted to
  AsyncStorage (it's a one-time "open this now" signal, not a saved
  preference). Each `requestOpenBill(billId)` call carries an
  incrementing `nonce`, specifically so a repeat swipe of the SAME bill
  still fires a fresh, distinguishable request.
- SwipeableRow.tsx — added an optional `viewAction` prop
  (`{ label, icon, onPress }`). When set, `renderRightActions` renders a
  gold non-destructive action button instead of the existing red delete
  button. All 11 existing callers omit this prop and are unaffected.
- BillsScreen.tsx — added an optional `openBillNonce` prop alongside the
  existing `openBillId`. The auto-open guard (previously a plain
  `openedBillIdRef.current === openBillId` ref check) now compares both
  `{ id, nonce }` together, so it still skips a genuine duplicate
  (notification deep-link path, `nonce` always `undefined`) but always
  reopens on a fresh swipe request (`nonce` always incrementing).
- ToPayScreen.tsx — subscribes to `openBillRequest` on mount; a fired
  request switches `activeSubTab` to 'bills' (same as the existing
  notification-deep-link effect) and forwards `{ billId, nonce }` down
  to `BillsScreen` in place of `initialOpenBillId` when present.
- TransactionsScreen.tsx — added `useNavigation()` (untyped — 'To-Pay'
  is a sibling Tab.Screen name with no dedicated typed param list found,
  so this deliberately isn't forced into `RootStackParamList`'s type) and
  a `findBillIdForTransaction` helper that walks a bill-sourced row's
  composite id (`'bill-' + cycle.id`) back to its real Bill by scanning
  `model.bills` for a matching cycle id. Each transaction row's
  `SwipeableRow` now gets `enabled` extended to also cover bill-sourced
  rows (`isManual && swipeToDeleteEnabled) || Boolean(billId)`) and a
  `viewAction` that calls `requestOpenBill(billId)` then
  `navigation.navigate('To-Pay')` when the row is bill-sourced.

`npx tsc --noEmit` clean (0 errors). Per the person's direction,
on-device testing of this is being deferred, along with every other
pending design-change item, until right before moving to Phase C rather
than tested in isolation now.

### Session — Swipe-to-delete on derived Transactions rows: scoping only, phased decision made

Decided approach for this design-change request: Option B — swiping a
derived row does NOT offer delete at all; instead it reveals a single
action that navigates to that transaction's source screen/record, so
the person edits/deletes/cancels at the source instead of deleting the
derived transaction directly (which would otherwise reappear on its
next cycle). Chosen over Option A (swipe delete + warning dialog)
because it structurally prevents the confusing state rather than just
warning about it, consistent with how the app already treats other
derived data (e.g. Travel checklist item deletion already cleans up
its linked transaction automatically rather than allowing an orphan).

Investigated via Antigravity (investigation only, no commits from the
tool) to scope what "navigate to source" actually requires. Found two
things that reshape the size of this work:

- The "derived rows" problem is narrower than it first looked. Travel
  checklist items, Events, and Refunds all get written into
  `model.manualTransactions` with `source: 'manual'` — they're already
  indistinguishable from a typed-in transaction on the `TransactionEntry`
  type, and swipe-to-delete is already enabled for them today. The real
  gap is only the 5 true derived `source` types: `bill`, `debt`, `loan`,
  `income`, `saving`.
- Of those 5, only Bills has real "open this specific record" deep-link
  navigation today — the B.14 `openBillId` chain (RootStack →
  MainTabs → ToPayScreen → BillsScreen, with an auto-open effect).
  Debts, Loans, Income, and Savings have none of that wiring — no route
  params, no equivalent prop, no auto-open effect on any of those four
  screens. Also confirmed `TransactionEntry` has no direct back-reference
  field (`billId`/`debtId`/etc.) on any of the 5 types — the source
  record's id is only embedded inside a composite string id (e.g.
  `'bill-' + cycle.id`), so finding the source record means searching
  `model.bills`/`model.debts`/etc. for whichever record contains a
  matching cycle/payment/entry id, not a direct field read.
  `TransactionsScreen.tsx` also currently has no access to `navigation`
  at all (no `useNavigation()` call, not passed as a prop) — that alone
  needs adding regardless of scope.

Given that only Bills already has the deep-link plumbing built and
tested, decided to split this into two checkpoints rather than build
all 5 at once:
- Next up: Bills only — add `useNavigation()` to TransactionsScreen.tsx,
  look up the source Bill from a bill-sourced row's composite id, and
  wire a swipe action that reuses the existing `openBillId` deep-link
  chain to jump straight to it.
- Separate, later checkpoint: Debts/Loans/Income/Savings, once ready to
  build (and test) the same kind of deep-link chain for those four
  screens, which don't have any of it today.

No code written this session — scoping and decision-making only.

### Session — ToPayScreen/PlanningScreen segmented pills reversed back to icon+title (design-change request)

Scoped and implemented via Antigravity (investigation only, no commits
from the tool). Confirmed the two screens' pill rows are separate,
independently-styled implementations (different container elements,
different style names, different tab-array shapes), so this needed two
independent edits rather than one shared fix. Confirmed via git history
that both screens had a real pre-iconization pill style (from before
the B2.3 batch-1 icon-only conversion) — reused those exact recovered
styles (rounded pill, `paddingVertical`/`paddingHorizontal`, no more
fixed 38×38 circle) rather than inventing new spacing, combined with
the icon+label row pattern already used elsewhere in the app (e.g.
HomeScreen.tsx's calendar-shortcut pill, LoansScreen.tsx's simulator
button). Confirmed both screens use `IconLabelHint` for their pills
today, and that keeping it would leave a redundant floating tooltip
once the label is shown directly on the pill — so both screens needed
to drop `IconLabelHint` in favor of a plain icon + Text pill.

Implemented (hand-pasted by the person after review, as matching pairs
of edits across both files): on both ToPayScreen.tsx and
PlanningScreen.tsx, changed the outer `<View>` per pill to a
`<TouchableOpacity>` carrying the tap handler directly, rendered a
plain `<Ionicons>` (size 16) plus a `<Text>` label side by side inside
each pill, removed the `IconLabelHint` import from both files (no
longer used on either screen), and restored each screen's real
pre-iconization pill styles (rounded `borderRadius: 999`, horizontal
padding, active/inactive background and text color) in place of the
fixed 38×38 circle styles. `npx tsc --noEmit` clean (0 errors) on both
files — `TouchableOpacity`/`Text` were already imported from
'react-native' in both, so no import fix was needed. Not yet on-device
tested — the person is deferring testing until the whole current batch
of design-change requests is done.

### Session — Reports screen: checkbox-driven show/hide list for the 9 report tabs (design-change request)

Scoped and implemented via Antigravity across two investigation rounds
(investigation only, no commits from the tool). First round confirmed
ReportsScreen.tsx's 9 sub-tabs are defined in one `REPORT_TABS` array,
switched via a single `activeReport` state with plain inline
conditional rendering (no nested navigator), and that B.13a/b's
tag-filter toolbar visibility (`showTagToolbar`) already keys off
`activeReport`, so hiding/showing tabs wouldn't conflict with it as
long as `activeReport` keeps pointing at whatever's actually visible.
Confirmed no existing show/hide preference exists anywhere in the app,
but `myPerson.ts`/`autoLock.ts` (per-profile AsyncStorage, own listener
pattern) and `model.settings.swipeToDeleteEnabled` (synced household
setting) were the two candidate patterns; per the person's decision,
went with the per-profile AsyncStorage pattern (a personal display
preference, not household data). Confirmed existing checkbox visual
patterns (TravelScreen.tsx's checklist, BillsScreen.tsx's subscription
checkbox) and confirmed the person's decisions on the two other open
questions: a trailing icon on the tab row opens the checkbox list
(rather than an always-visible section), and unchecking every report
is allowed — shows an empty-state message rather than forcing a
minimum of one checked.

Second round confirmed `ReportsScreen.tsx` had never pulled `username`
from `useData()` (only `model`) and found the exact line used by
sibling screens (PersonSpendingReport.tsx, TransactionsScreen.tsx,
ProfileScreen.tsx) for the same need. Also confirmed BottomSheet.tsx
(not a plain Modal) is the established container for this kind of
toggleable settings list — already used this way in 8 other screens,
has a built-in ScrollView and title header, so no new modal styling
had to be invented from scratch.

Implemented (hand-pasted by the person after review): created a new
file, reportVisibility.ts, matching myPerson.ts's exact shape
(`getHiddenReportIds`/`setHiddenReportIds`, storing HIDDEN ids so
someone who's never touched the setting still sees every report by
default). In ReportsScreen.tsx: added `hiddenReportIds` state loaded
from the new file on mount, a `visibleTabs` derived list, an effect
that auto-switches `activeReport` to the first remaining visible tab
whenever the hidden set changes (so the tag toolbar and the 9
report-content lines never point at a hidden tab), and a
`toggleReportVisibility` handler that updates state immediately and
persists in the background (silently no-ops on a write failure, since
worst case it just reloads as "all visible" next time — no financial
data at risk). Added a trailing "Customize" icon button next to the
tab row (reusing the tab row's own 38×38 pill style) that opens a new
BottomSheet listing all 9 reports with a checkbox each (icon + label +
checkbox, matching TravelScreen.tsx's checkbox visual). Added an empty
state ("No reports are currently shown...") that replaces the tag
toolbar and all 9 report components whenever `visibleTabs` is empty,
rather than forcing at least one report to stay checked. `npx tsc
--noEmit` clean (0 errors). Not yet on-device tested — the person is
deferring testing until the

Scoped and implemented via Antigravity (investigation only, no commits
from the tool). Scoping pass confirmed the picker in ProfileScreen.tsx
had no local "pending selection" state at all — tapping a name called
`setMyPersonId(username, p.id)` (myPerson.ts) directly and instantly,
which both persists to AsyncStorage AND notifies subscribers in the
same call. Confirmed that notification logic (added for bug #12, used
by TransactionsScreen.tsx and PersonSpendingReport.tsx to update live
without a restart) lives entirely inside `setMyPersonId` itself, so as
long as the eventual confirm step still calls that same function,
bug #12's live-update behavior is unaffected — the only change needed
was delaying WHEN it's called, not how notification works. Found an
existing "pick, then confirm/cancel row" pattern already used lower on
this exact same screen (Transfer Ownership), including its button
styles (`dataButton`/`dataButtonText`, `cancelInlineButton`/
`cancelButtonText`), which this change reuses for visual consistency
rather than inventing a new button style.

Implemented (hand-pasted by the person after review, as two snippets in
ProfileScreen.tsx): added `pendingPersonId`, `myPersonBusy`, and
`myPersonMsg` state alongside the existing `myPersonId` state. Tapping
a name now only updates `pendingPersonId` (highlighting reads
`pendingPersonId ?? myPersonId`, so the currently-saved person still
shows as selected before any tap). A Confirm/Cancel row appears only
when the pending selection differs from what's actually saved — Confirm
calls the real `setMyPersonId` (so subscribers still get notified
normally) with its own busy spinner and an inline error message on
failure, matching this screen's existing convention for inline confirms
(no `Alert.alert`); Cancel just discards the pending state with no
save. No changes made to myPerson.ts itself. `npx tsc --noEmit` clean
(0 errors). Not yet on-device tested.

### Session — SUB/CANCELLED badge redesigned as a hollow-box badge (design-change request)

Scoped and implemented via Antigravity (investigation only, no commits
from the tool). Scoping pass confirmed SUB and CANCELLED are two plain,
unstyled `<Text>` elements (no enclosing View, no border/background) in
exactly one place in the whole codebase — BillsScreen.tsx's collapsed
bill row header — gated by the same `bill.isSubscription` flag and
mutually exclusive on `bill.subscriptionStatus === 'cancelled'`.
Confirmed via codebase-wide search that no other screen (ToPayScreen,
DashboardScreen, CalendarScreen, SubscriptionAuditReport,
pushNotifications.ts) renders either label, so no other spot needed the
same treatment. Also pulled the Accounts screen's Cash/Debit/Credit
badge recipe (AccountCard.tsx) as a size/shape reference, but since the
request was specifically for a hollow box (not a filled/tinted badge
like Accounts uses), matched the hollow-bordered badge pattern already
used elsewhere in the app (e.g. SettingsScreen.tsx) instead —
`borderRadius: 6`, `borderWidth: 1`, small padding, no fill.

Implemented (hand-pasted by the person after review, as one block
replacement in BillsScreen.tsx): wrapped both the SUB and CANCELLED
`<Text>` elements in their own bordered `<View>` badge box. SUB keeps
its existing gold color, now as a gold border + gold text hollow badge.
CANCELLED keeps its existing faint/muted color, now as a faint-bordered
hollow badge. No new imports needed (`View` was already imported and
used throughout the file). `npx tsc --noEmit` clean (0 errors). Not yet
on-device tested, but low visual risk (pure JSX/style change, no logic
touched) — the person confirmed it looks correct.

### Session — PIN "Turn Off" replaced with a toggle switch (design-change request)

Scoped and implemented via Antigravity (investigation only, no commits
from the tool). Scoping pass confirmed no shared toggle-switch component
exists anywhere in the codebase — every toggle in SettingsScreen.tsx
(biometrics, notifications, etc.) is authored inline with plain
`TouchableOpacity` + `styles.toggleTrack`/`styles.toggleThumb`, and
React Native's built-in `Switch` isn't imported anywhere in the app. The
biometrics toggle directly above the PIN row was confirmed to be the
closest existing pattern to reuse. Also confirmed the exact current
layout of the PIN row (the `pinBusy`/`removePin`/`Alert.alert` logic
added in bug #10, and the separate "Change PIN" button) so the redesign
could be scoped to not disturb any of that.

Implemented (hand-pasted by the person after review, as one block
replacement in SettingsScreen.tsx): replaced the "Turn Off" text button
with a toggle switch using the existing `toggleTrack`/`toggleThumb`
styles — toggling off (when a PIN is set) triggers the exact same
"Turn Off Quick PIN" confirmation alert and `removePin()`/`pinBusy`
logic from bug #10, unchanged; toggling on (when no PIN is set) opens
the existing `SetPinScreen` modal, same as before. While `pinBusy` is
true, the toggle is replaced by the existing small `ActivityIndicator`
rather than shown disabled. "Change PIN" was moved to its own small
row directly underneath, shown only when a PIN is already set, since a
toggle switch can only represent on/off, not a second "change" action.
No changes to state, handlers, or the `SetPinScreen` modal itself were
needed — `colors.gold` (used for the toggle's spinner color) was
already in use elsewhere in the same file, so no new import was
required. `npx tsc --noEmit` clean (0 errors). Not yet committed —
still needs a real on-device test (tap the toggle both ways, confirm
"Change PIN" still opens the modal) before committing/pushing.

### Session — Bottom nav: drop Calendar tab, add Home date shortcut (design-change request)

Scoped and implemented via Antigravity (investigation + real code review
only, no commits from the tool). Scoping pass confirmed: Calendar was
registered only as the 2nd bottom tab in MainTabs.tsx, with no route
params; a full codebase search turned up zero existing calls to
`navigation.navigate('Calendar', ...)` anywhere, meaning removing it as
a tab could not break any existing navigation; CalendarScreen.tsx takes
no props/params, so it could move into RootStack.tsx as a plain stack
screen with no other type ripple; and HomeScreen.tsx's top row already
had free horizontal space (`justifyContent: 'space-between'` between the
greeting and the Set PIN/Lock buttons) to add a third element without
restructuring the layout.

Implemented (hand-pasted by the person after review, as 8 find/replace
snippets across 3 files): removed the `Calendar` `<Tab.Screen>` and its
now-unused `CalendarScreen` import from MainTabs.tsx, leaving 4 bottom
tabs (Home, To-Pay, Transactions, More); added `Calendar: undefined` to
`RootStackParamList` and registered `CalendarScreen` as a stack screen
in RootStack.tsx (`title: 'Calendar'`, `headerBackTitle: 'Home'`),
matching the existing pattern used for Accounts/Income/Savings/Planning/
Insights/Settings; and added a small tappable date pill
(`testID="home-calendar-shortcut"`, calendar icon + today's date in
`"Mon D"` format) to HomeScreen.tsx's top row, wired to
`navigation.navigate('Calendar')` via a newly-added typed
`useNavigation<NativeStackNavigationProp<RootStackParamList>>()` hook.
`npx tsc --noEmit` clean (0 errors). Committed and pushed. Still needs a
real on-device re-test — deferred, to be batched with the other pending
on-device items (bugs #4/#5-5b, the Android date-picker calendar) rather
than tested alone.

### Session — "Fewer words" pass: SavingsScreen.tsx

Investigated via Antigravity (investigation-only, no commits from the
tool). Antigravity supplied the real, full, unelided contents of
SavingsScreen.tsx plus 15 proposed wordy-text trims (EF calculator
intro, EF "based on Bills" suggestion, both efIncomeDisplay/
fiIncomeDisplay income-summary lines, EF "Current savings" label, FI
calculator intro, all three FI suggestion lines, FI "missing inputs"
placeholder, Goals balance banner label, Goals empty state, the
collapsible-row "Contributions Logged" detail label, both
handleDeleteGoal/handleSwipeDelete confirmation alerts, the modal's
"Contributions logged" label, the modal's "Delete this goal" button,
five separate validation error messages, and the FI progress-percent
subtitle), each shown with real surrounding code. All 15 reviewed
against the real code and confirmed text-only — none touch the
handleSaveEf/handleSaveFi logic, state, or the bug #4/#5 auto-save
wiring, even the several items sitting close to that code (items 1, 4,
7, and 15 border the FI/EF sections directly and were checked
individually). Two adjustments made during review: kept `&amp;` instead
of a bare `&` in the Cash/Debit/Investment suggestion line to match this
file's existing JSX convention, and left the modal's "No contributions
logged yet." hint text untouched (only its "Contributions logged"
section label above it was trimmed) since it's a distinct sentence, not
clearly redundant with the label.

Applied (hand-pasted by the person after review, as 23 find/replace
snippets — two items had two near-identical occurrences each, given as
separate snippets: efIncomeDisplay/fiIncomeDisplay, and the
handleDeleteGoal/handleSwipeDelete alert pair): trimmed all 15 items as
described above. `npx tsc --noEmit` clean (0 errors) — text-only change,
no type impact. Committed and pushed.

This completes SavingsScreen.tsx on the "fewer words" ranked list. Next
up per that list: SignInScreen.tsx (7 items).

### Session — "Fewer words" pass: OnboardingScreen.tsx

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed OnboardingScreen.tsx has no data-array step structure
(no `const STEPS = [...]`) — all step 1/2/3 text lives inline in
conditional JSX branches gated on a `useState<1 | 2 | 3>` step value.
Antigravity supplied the real, full, unelided file contents plus 11
proposed wordy-text trims (error message, step 1 subtitle, both feature
card descriptions, step 2 subtitle, biometric-active subtitle, biometrics-
unavailable banner, the PIN input label, the skip-PIN ghost button, the
step 3 biometric status badge, and the step 3 tip card), each shown with
real surrounding code and a one-sentence justification. All 11 reviewed
against the real code and confirmed to be text-only (no logic, state, or
layout touched) and to preserve all meaning a first-time user would need.

Applied (hand-pasted by the person after review, as 11 find/replace
snippets): trimmed the save-PIN catch-error message; the step 1 subtitle;
both step 1 feature card descriptions (End-to-End Encrypted, Private Solo
or Shared); the step 2 (Quick Unlock) subtitle; the biometric-active-card
subtitle; the biometrics-unavailable banner text; the PIN input label
(sentence → concise label, matching its "Confirm Quick PIN" sibling); the
"Skip for now" ghost button; the step 3 biometric-enabled status badge
text; and the step 3 tip card. `npx tsc --noEmit` clean (0 errors) —
text-only change, no type impact. Committed and pushed.

This completes OnboardingScreen.tsx on the "fewer words" ranked list.
Next up per that list: SavingsScreen.tsx (7 items).

### Session — Android date picker replaced with in-app themed calendar (design-change request)

Scoped and implemented via Antigravity (investigation + drafted
implementation only, no commits from the tool). Scoping pass found all
15 date-selection points across 9 screens already route through a
single shared component, src/components/DateField.tsx — no screen
files needed to change. Confirmed
`@react-native-community/datetimepicker`'s Android implementation
literally returns `null` from its React component and hands off
entirely to the Android OS's native DatePickerDialog/MaterialDatePicker
— there's no prop or mode to theme it in-app. Also confirmed every
DateField call site already sits inside a BottomSheet or Modal, ruling
out a nested `<Modal>` approach for the replacement (Android has known
issues with nested modals) in favor of an inline expanding card, the
same pattern the iOS branch already uses.

Implemented (hand-pasted by the person after review): rewrote
DateField.tsx's Android branch to render a fully custom, theme-aware
inline calendar card in place of the native picker — month/year header
with chevron navigation (reusing the exact day-count/first-weekday math
already working in CalendarScreen.tsx), a day-of-week row, and a padded
7-column day grid. Added local `viewYear`/`viewMonth` state (reset via
`useEffect` whenever the picker opens or `value` changes) separate from
the selected value. Selecting a day calls the existing `onChange`
callback and closes the card, matching the native picker's prior
behavior. Dates outside `minimumDate`/`maximumDate` render disabled and
dimmed via ISO-string comparison. Today's date gets a gold border;
the selected date gets a solid accent-color fill. Zero new npm
dependencies — pure View/Text/TouchableOpacity, matching the app's
existing components. iOS's native inline picker is completely
untouched. Given the scope of the change (touching nearly every part
of the file), it was applied as a full-file replacement rather than
piecemeal snippets. `npx tsc --noEmit` clean. Still needs a real
on-device re-test on Android — not yet confirmed working on a physical
device.

### Session — Emergency Fund "Saved" checkmark, round 2 fix (bug #5/5b)

Investigated via Antigravity (investigation-only, no commits from the
tool), specifically re-examining the real current code rather than
re-applying the prior null-crash diagnosis, since that fix (reading
through efExpensesDisplay/efSavingsDisplay before .trim()) was confirmed
on-device to not resolve the symptom. Found a different root cause,
one level up from handleSaveEf itself: `calcInputsFromModel()` (the
shared helper both the FI Calculator and Emergency Fund sections read
from, via a `storedCalc` variable) did an all-or-nothing fallback —
`model.calculatorInputs || { ...all seven default fields... }` — instead
of merging field-by-field. Once ANY of the seven calculator fields had
ever been saved (e.g. from testing the FI Calculator during bug #4's
work), `model.calculatorInputs` became a real, non-null object, so the
`|| {defaults}` fallback never triggered again — but that real object
only had whichever fields had actually been written to it. Any
Emergency-Fund-specific field never separately saved came back as
`undefined`, which got turned into the literal string `"undefined"` by
`String(undefined)` downstream, which then failed `parseFloat`, which
then silently aborted `handleSaveEf` before it ever reached
`setEfSaved(true)` — explaining all three still-broken on-device
scenarios (editing only one field, using the suggestion button without
typing, etc.) in one shot.

Applied fix (hand-pasted by the person after review): rewrote
`calcInputsFromModel()` to always start from the full seven-field
defaults object and spread `model.calculatorInputs` on top of it
(`{ ...defaults, ...(model!.calculatorInputs || {}) }`), instead of
choosing one or the other. Any field that was genuinely never saved now
correctly falls back to `''` (a real empty string) rather than
`undefined`. Since this is the single shared source both the FI
Calculator and Emergency Fund sections read from, this fix also
reinforces bug #4's fix (same underlying class of gap), though the
originally-reported break was specifically traced to the EF checkmark.
`npx tsc --noEmit` clean (confirmed after paste — 0 errors). Committed
and pushed. Per the person's standing direction, on-device re-test is
being done together with bug #4 in one combined pass rather than
separately.

### Session — FI Calculator fresh investigation + fix, round 2 (bug #4)

Investigated via Antigravity (investigation-only, no commits from the
tool), specifically re-examining the real current code rather than
re-applying the original diagnosis, per the still-broken symptoms found
in the prior on-device re-test pass. Confirmed two separate root causes:

- Preset/suggestion-button taps not saving immediately: a classic React
  stale-closure bug. Each button called `setFiSwrInput(preset)` /
  `setFiSavingsInput(...)` / `setFiMonthlySavingsInput(...)` and then
  called `handleSaveFi()` on the very next line, inside the same
  synchronous event handler. React state updates are asynchronous —
  `handleSaveFi()` ran before the just-scheduled state update had
  actually landed, so it read `fiSwrInput`/`fiSavingsInput`/
  `fiMonthlySavingsInput` (via their `?? fiXDisplay` fallback) as their
  OLD value from the current render's closure, and saved that stale
  value instead of the one just tapped. This is the exact same class of
  bug already fixed once for Emergency Fund's suggestion button (see bug
  #5b), which was given an override parameter for the same reason —
  `handleSaveFi` had not been given the same treatment.
- "Years Until FI" still showing placeholder with Current Savings blank:
  traced to Annual Expenses, not Current Savings. The prior fix's blank-
  Current-Savings-to-0 change was confirmed correct and working
  (`fiSavingsNum` does become `0`, which passes `fiCanProjectTimeline`'s
  `!isNaN(...)` check) — but `fiCanProjectTimeline` also requires
  `fiNumber !== null`, which requires `fiExpensesNum > 0`. Annual
  Expenses was the one field, of five on this section, that never got
  an `onBlur={handleSaveFi}` added in the original fix — so it silently
  reverted to blank on leaving/returning to the screen, `fiNumber` stayed
  `null`, and the calculation stayed blocked regardless of what was
  filled into the other three fields. Separately confirmed the
  placeholder text itself was misleading — it read "Enter an expected
  return rate and monthly savings above to see this," never mentioning
  Annual Expenses at all, which is why testing with only Current Savings
  left blank didn't surface the real missing field.

Applied fix (hand-pasted by the person after review, in two rounds — see
below): gave `handleSaveFi` an optional `overrides` parameter
(`{ expenses?, savings?, swr?, returnRate?, monthlySavings? }`), each
falling back through the existing `input ?? display` chain when not
passed, mirroring the same pattern already used for Emergency Fund's
`handleSaveEf`. Updated the SWR preset buttons and both "tap to use
this" suggestion buttons to pass the freshly-computed value straight
into `handleSaveFi({ ... })` instead of relying on state that hasn't
landed yet. Added the missing `onBlur={handleSaveFi}` to the Annual
Expenses TextInput, matching the other four FI fields. Corrected the
placeholder text to also mention Annual Expenses.

First `npx tsc --noEmit` pass surfaced 6 real type errors: React
Native's `TextInput`'s `onBlur` prop expects a `(e: BlurEvent) => void`
and `TouchableOpacity`'s `onPress` expects a
`(event: GestureResponderEvent) => void` — passing the now-differently-
shaped `handleSaveFi` (which expects an optional overrides object, not
an event) directly as those props no longer type-checked, on the 5
`onBlur={handleSaveFi}` references and 1 `onPress={handleSaveFi}`
reference (the main "Save" button) that hadn't been touched by this
fix. Fixed by wrapping each in a no-argument arrow —
`onBlur={() => handleSaveFi()}` / `onPress={() => handleSaveFi()}` —
via a plain find/replace across all 6 occurrences, since the fix text is
identical everywhere it appears. Second `npx tsc --noEmit` pass came
back clean, 0 errors.

Per the person's direction, on-device re-test of this fix is being
DEFERRED — rather than testing bug #4 alone right now, it'll be tested
together with bug #5/5b and everything else once the whole bug-fixing
pass is done, batched into one on-device pass before/alongside moving to
Phase C. Status below reflects "fix applied, compiles clean, on-device
re-test still pending" rather than fully verified.

### Session — On-device re-test pass across bugs #1–13

Ran the on-device re-test checklist across all 13 previously-fixed bugs.

CONFIRMED FIXED, no further action needed (11 of 13): Bug #1 (offline
sign-out → sign-in lockout), #2 (offline delete hangs on
Accounts/Bills/Debts), #3 (Left to Spend caution threshold persisting
through a full app close/reopen), #6 (background-save warnings on
password change / recovery-key recovery / household unlink), #7
(Events/Goals/Groceries/Settings generic save-error alerts), #8 (Travel
checklist-item delete removing its linked transaction immediately), #9
(biometric unlock showing a real error message on a genuine failure), #10
(PIN turn-off spinner/disabled state), #11 (Category Watchlist showing
"At budget" in orange at exactly 100%, "Over budget" in red one peso
over), #12 ("which of these is you?" updating Transactions and the Person
Spending report live, no restart needed), and #13 (AccountsScreen
Cards/List toggle floating label appearing on tap). All behaved exactly
as expected. Flipped to fully ✅ verified below.

STILL BROKEN — needs a fresh investigation round (2 of 13):
- Bug #4 (FI Calculator): the onBlur auto-save on the four individual
  text fields IS confirmed working (a typed value now survives leaving
  and returning to the screen). But two parts of the original fix did
  NOT work on-device: (a) leaving "Current savings" blank while filling
  in the other three fields still does not make "Years Until FI"
  calculate — it still shows placeholder text; (b) tapping an SWR preset
  button or a "tap to use this" suggestion button still does not save
  immediately. The original diagnosis (blank-current-savings parsed as
  NaN; taps need their own handleSaveFi() call) does not fully explain
  what's still happening — needs a fresh Antigravity investigation
  against the real current code rather than assuming the prior fix was
  complete.
- Bug #5/5b (Emergency Fund): the onBlur auto-save IS confirmed working
  (editing either field and leaving the screen without tapping Save now
  sticks). But the original crash fix (reading through
  efExpensesDisplay/efSavingsDisplay before .trim()) did NOT resolve the
  reported symptom — editing only one of the two fields (or using "use
  suggested expenses" without typing anything) and tapping Save still
  does not show the "Saved" checkmark. Needs a fresh Antigravity
  investigation pass to find what's actually still failing inside
  handleSaveEf; the null-crash fix alone wasn't sufficient.

Neither fix is being reverted — the onBlur/auto-save portions of both are
confirmed genuinely working and stay in place. Only the specific
still-broken behaviors above need new investigation prompts.

### Session — "Which of these is you?" picker doesn't update Transactions live (bug #12)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed root cause: the selected person's id (`myPersonId`) is
stored in AsyncStorage under a per-profile key (myPerson.ts), completely
outside DataContext/HouseholdModel. Every consuming screen
(TransactionsScreen.tsx, reports/PersonSpendingReport.tsx) read it via a
one-time `useEffect(() => { getMyPersonId(username).then(setX) }, [username])`
that only ever runs once on mount — and since React Navigation's bottom
tabs keep screens mounted in memory rather than remounting them on tab
switch, changing the selection on ProfileScreen (which only updated its
own local state plus AsyncStorage) never reached those already-mounted
screens until the whole app process was killed and restarted. Confirmed
via codebase-wide search that exactly two screens read this value
(TransactionsScreen.tsx and PersonSpendingReport.tsx) — Home, Dashboard,
Settings, Accounts, Bills, Debts, Savings, and every other report are
unaffected, since none of them read `myPersonId` at all.

Applied fix (hand-pasted by the person after review): reused the exact
pub-sub pattern this codebase already has for the same class of problem
(`subscribeToAutoLockMinutes` in autoLock.ts) — added a
`subscribeToMyPersonId` listener registry to myPerson.ts, notified on both
`setMyPersonId` and `clearMyPersonId`, and subscribed to it inside the
existing useEffect in both TransactionsScreen.tsx and
PersonSpendingReport.tsx (alongside, not replacing, the initial on-mount
read), so both screens now re-render immediately when the selection
changes on ProfileScreen, without needing a restart. ProfileScreen.tsx
itself was left untouched, since it already updates its own local state
synchronously right after writing and has no stale-read problem of its
own. `npx tsc --noEmit` clean. Committed and pushed. Still needs a real
on-device re-test — deferred, along with bugs #1–11, until the rest of
this bug-fixing pass is done and everything can be verified together in
one on-device pass.

### Session — Category Watchlist "over budget" fires at exactly 100% (bug #11)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed root cause in a single function,
`getCategoryBudgetStatus` (transactions.ts): it computed
`pct = (spent / budget) * 100` and checked `if (pct >= 100)` for the
"Over budget" (red) state, so spending exactly equal to the budget was
misclassified as over budget instead of at it. Confirmed via a codebase-
wide search that this comparison exists in exactly one place — the only
other `>= 100` matches found were in GoalsScreen.tsx's unrelated goal-
completion logic — and that DashboardScreen.tsx's "Watched Categories"
card is the sole UI consumer of this function, simply rendering whatever
label/color it returns with no threshold logic of its own to also fix.

Applied fix (hand-pasted by the person after review): changed the "Over
budget" check to `pct > 100` (strictly exceeding), and added a new
distinct tier for `pct >= 100` (now strictly meaning "exactly at 100%,
since >100% is already caught above") labeled "At budget" in the existing
orange/caution color, so hitting the limit exactly reads as a caution
state rather than either an outright error or a misleadingly-calm
"Getting close." `npx tsc --noEmit` clean. Committed and pushed. Still
needs a real on-device re-test — deferred, along with bugs #1–10, until
the rest of this bug-fixing pass is done and everything can be verified
together in one on-device pass.

### Session — Quick PIN turn-off shows no loading indicator (bug #10)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed there was no dedicated function or busy-state boolean for
turning PIN off at all — it was an inline anonymous async callback inside
the "Turn Off" alert's destructive button, calling `removePin(username)`
(an async AsyncStorage.removeItem call in pin.ts) with no
Alert.alert(...)... [{ text: 'Turn Off', onPress: async () => { ... } }]
loading state around it, unlike every other async action on this screen
(clearBusy, exportBusy, passChangeBusy, etc.), which all follow the same
`[xBusy, setXBusy] = useState(false)` pattern with an ActivityIndicator
swapped in for the button's label while busy. Confirmed the action really
is asynchronous (a real await on AsyncStorage I/O), so the gap between tap
and the button/UI updating was genuine, not just a slow re-render.

Applied fix (hand-pasted by the person after review): added a `pinBusy`
state variable alongside the existing `pinIsSet`, wrapped the
`removePin(username)` call in `setPinBusy(true)` / `try...finally` (also
adding a real `Alert.alert('Failed to remove PIN', ...)` on failure, which
didn't exist before), disabled both the "Turn Off" and "Change PIN"
buttons while busy, and swapped the "Turn Off" button's label for an
ActivityIndicator during the action — matching the exact pattern already
used by clearBusy/exportBusy elsewhere in this same file. `npx tsc
--noEmit` clean. Committed and pushed. Still needs a real on-device
re-test — deferred, along with bugs #1–9, until the rest of this
bug-fixing pass is done and everything can be verified together in one
on-device pass.

### Session — Biometric unlock failed outright on Face ID (bug #9)

Investigated via Antigravity (investigation-only, no commits from the
tool), across two rounds — the second round pulled full real code from
PinUnlockScreen.tsx and SettingsScreen.tsx to confirm exact variable
names and existing error-display patterns before writing any fix.
Confirmed two separate, tangled issues:
- `attemptBiometricAuth` (biometrics.ts) only ever returned a plain
  `true`/`false`, discarding the real `result.error` from
  `LocalAuthentication.authenticateAsync`. Every failure — locked out,
  not enrolled, missing permission, genuine error — looked identical to
  the user: nothing happened, no message shown. This is a real bug
  regardless of device/biometric type.
- The specific "Face ID fails, fingerprint works" symptom traced to
  iOS's own rule: with `disableDeviceFallback: true` set (as this app
  does), iOS refuses to even show the Face ID prompt unless the app's
  bundle has `NSFaceIDUsageDescription` wired up — confirmed present and
  correct in this project's `app.json`. However, that config only takes
  effect in a real installed build; testing through Expo Go uses Expo
  Go's own pre-built permissions, not this project's `app.json`, so
  Face ID can fail there for reasons unrelated to anything in this
  codebase. Concluded this specific device-level symptom needs to be
  re-verified once a real installed build exists (Phase C, EAS Build) —
  not something fixable from inside Expo Go.

Applied fix (hand-pasted by the person after review, in three parts):
changed `attemptBiometricAuth`'s return type from `boolean` to a real
`{ success: boolean; error?: string }` result, and added a new
`biometricErrorMessage()` helper that translates a raw error code into a
plain-English message — returning an empty string for a plain user/system
cancel, since backing out on purpose isn't a real error worth showing.
Updated both call sites (`PinUnlockScreen.tsx`'s `runBiometricAuth`,
`SettingsScreen.tsx`'s `handleToggleBiometrics`) to read the new result
shape and show the translated message using each screen's own existing
error-display pattern (`setError`/`setBiometricError`), rather than
silently doing nothing. Caught and fixed a missing import
(`biometricErrorMessage` needed adding to SettingsScreen.tsx's existing
`from '../biometrics'` import line — PinUnlockScreen.tsx's import already
had it) via the resulting `tsc` error. `npx tsc --noEmit` clean.
Committed and pushed. STILL NEEDS: (a) a real on-device re-test of the
now-visible error messages generally (e.g. trigger a lockout or a plain
cancel and confirm the right message — or no message — shows), deferred
along with bugs #1–8 until the rest of this pass is done; and (b) the
original Face-ID-specific failure needs separate re-verification on a
real installed build in Phase C, since Expo Go's own permissions
(not this project's `app.json`) are the suspected cause and can't be
fixed from inside Expo Go.

### Session — Travel checklist-item delete leaves expense behind (bug #8)

Investigated via Antigravity (investigation-only, no commits from the
tool), across two rounds. First round confirmed
`reconcileTravelChecklistTransactions` already exists in
TravelScreen.tsx and correctly cleans up a removed checklist item's
`expenseTransactionId` from `model.manualTransactions` — but only when
it's actually called, and only using whatever `priorChecklist` it's
given. Second round traced the real save-trip flow end to end and found
the actual gap: `handleRemoveChecklistItem` only ever updated local
component state (`setChecklist`) — it never touched `model.travel` and
never called `reconcileTravelChecklistTransactions` itself. That
reconciliation only ran later, when "Save trip" was tapped. So: (a) if
the person tapped the "X" to remove a checked-off, cost-bearing item and
then backed out of the modal instead of tapping Save, nothing was ever
persisted and the linked transaction stayed behind untouched; and (b)
even a subsequent Save could reconcile against a checklist state whose
`expenseTransactionId` bookkeeping had drifted from a prior cancelled
attempt. This made checklist-item delete behave differently from every
other delete button in the app, which persist immediately. Whole-trip
delete was confirmed unaffected — that path already cleans up every
checklist item's linked expense correctly.

Applied fix (hand-pasted by the person after review): made
`handleRemoveChecklistItem` async — it still updates local state
immediately for responsiveness, but for an already-saved trip
(`editingId` set) it now also writes straight to `model.travel` (removing
the item from that trip's saved checklist) and, in the same
`saveModel()` call, filters out the item's `expenseTransactionId` from
`model.manualTransactions` if it had one. A brand-new, not-yet-saved trip
has no `editingId` yet, so it's untouched and behaves exactly as before
(a plain local-state edit until "Save trip" is tapped). `npx tsc --noEmit`
clean (confirmed after paste — no errors). Committed and pushed. Still
needs a real on-device re-test — deferred, along with bugs #1–7, until
the rest of this bug-fixing pass is done and everything can be verified
together in one on-device pass.

### Session — Events/Goals/Groceries/Settings save errors (bug #7)

Investigated via Antigravity (investigation-only, no commits from the
tool) across all 30 `saveModel()` call sites in EventsScreen.tsx (3),
GoalsScreen.tsx (3), GroceriesScreen.tsx (7), and SettingsScreen.tsx (17).
Confirmed every single one directly awaits `saveModel()` inside its own
`try/catch`, intending to show a screen-specific message
(`setErrorMsg(...)`/`Alert.alert(...)`) on failure.

Confirmed this is already effectively fixed as a side effect of bug #2's
`withTimeout()` wrapping inside `saveModel()` itself: `saveModel()` already
had its own internal `Alert.alert('Sync Failed', ...)` /
`Alert.alert('Backup Failed', ...)` around its network calls, but before
bug #2's fix those calls just hung forever offline instead of ever
rejecting — so that internal alert never fired either. Now that
`saveModel()`'s network calls are timeout-wrapped, its own alert
correctly fires within 8 seconds on any of these 30 call sites when
offline. The screen-level `try/catch` blocks are confirmed genuinely
unreachable for network failures (`saveModel()` catches and swallows
those internally, never rethrowing) — but this is harmless dead code, not
a functional bug: the app still closes the modal / clears the form
afterward, which is correct, since the change did save locally first
either way. No code changes made — bug #7 as originally reported (no
error ever surfaces) is resolved by bug #2's fix, just via a generic
"Sync Failed"/"Backup Failed" message rather than each screen's own more
specific wording.

Separately flagged (not fixed, low priority, no reported symptom): in the
linked-household branch of `saveModel()`, the personal local-snapshot
backup call (`saveEncryptedProfileData(...).catch(() => {})`) fails
completely silently with no alert at all, unlike every other write path
in the function. Tracked below as a new, lower-priority known issue.

### Session — Background-save warnings never appear (bug #6)

Investigated via Antigravity (investigation-only, no commits from the
tool), across three flows: password change, account recovery via
recovery key, and household unlink. Confirmed the exact same root disease
as bug #2 (Firestore's `setDoc()`-backed writes never reject or time out
on their own while offline — they just hang forever), spread across five
un-timed-out call sites in two files:
- `changePassword()` in DataContext.tsx — both the linked-profile branch
  (`saveProfileCloudBackup`) and the unlinked-profile branch
  (`saveProfileCloudBackup` + `deleteRecoveryKey`).
- `unlinkHousehold()` in DataContext.tsx — `saveProfileCloudBackup`.
- `unlinkAndTransferOwnership()` in DataContext.tsx — `saveProfileCloudBackup`.
- `handleRecoverWithKey()` in SignInScreen.tsx — `saveProfileCloudBackup`
  (both branches) and `saveRecoveryKey`.

Two extra gaps were found and folded into the same fix while in there:
`changePassword()`'s linked-profile branch had no `Alert.alert()` at all
(just a silent `console.error`), and `unlinkAndTransferOwnership()`'s
backup call had an empty `.catch(() => {})` with no warning either — both
missing the "show a warning" half of the pattern entirely, rather than
having an unreachable one like bug #2's three original spots.

Applied fix (hand-pasted by the person after review): moved the existing
`withTimeout()` helper out of `DataProvider` and made it an exported,
module-level function in DataContext.tsx, so SignInScreen.tsx's direct
Firestore calls can reuse the exact same timeout guard. Wrapped all five
call sites above in `withTimeout()` (8-second timeout each), added the
missing `Alert.alert()` to `changePassword()`'s linked-profile branch, and
replaced `unlinkAndTransferOwnership()`'s empty catch with a real warning
alert matching its sibling `unlinkHousehold()`. In SignInScreen.tsx, the
two `saveProfileCloudBackup` calls inside `handleRecoverWithKey()` are
awaited with no `.catch()` of their own (unlike the DataContext.tsx call
sites) — deliberately, since they're on account recovery's critical path
rather than a fire-and-forget background save: a timeout now propagates
up to the function's existing outer try/catch, which already sets
`recoveryError` and shows it inline, so recovery now fails cleanly within
8 seconds instead of leaving `recoveryBusy` spinning forever offline.
`npx tsc --noEmit` clean. Committed and pushed. Still needs a real
on-device re-test — deferred along with bugs #1–5 until the rest of this
bug-fixing pass is done, to test everything together in one on-device
pass.

### Session — Emergency Fund fields missing auto-save (bug #5b)

Investigated via Antigravity (investigation-only, no commits from the
tool), confirming the suspicion flagged while fixing bug #5. Confirmed:
neither Emergency Fund TextInput (`efExpensesInput`/`efSavingsInput`) had
an `onBlur` handler at all — only `onChangeText`, which just updates local
state. `handleSaveEf` was only ever called from the main "Save" button's
`onPress`, with no `onBlur`, `useEffect`, or debounce path anywhere in the
file (confirmed `useEffect` isn't even imported in SavingsScreen.tsx).
Same root cause as bugs #3 and #4. Also confirmed the "use suggested
expenses" button only called `setEfExpensesInput(...)` and never saved.

Applied fix (hand-pasted by the person after review): gave `handleSaveEf`
an optional `expensesOverride` parameter (falls back to the existing
`efExpensesInput ?? efExpensesDisplay` chain when not passed) so the
suggestion button can save the freshly-tapped value immediately without
waiting on a state update that hasn't landed yet; added
`onBlur={() => handleSaveEf()}` to both Emergency Fund TextInputs; updated
the suggestion button's `onPress` to save with the override value right
after setting state; and changed the main Save button's `onPress` from
`handleSaveEf` directly to `() => handleSaveEf()`, since passing the
function directly made TypeScript infer the tap's GestureResponderEvent as
the (now-optional) string parameter — this surfaced as a `tsc` error
(`GestureResponderEvent` not assignable to `string`) and was fixed the
same session. `npx tsc --noEmit` clean. Committed and pushed. Still needs
a real on-device re-test — deferred, along with bugs #1–5, until the rest
of this bug-fixing pass is done and everything can be tested together in
one on-device pass.

### Session — Emergency Fund "Saved" checkmark never appears (bug #5)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed a different root cause than bugs #3/#4's "no auto-save
path" pattern — this one is an outright crash, not a persistence gap.
`handleSaveEf` (SavingsScreen.tsx) calls `.trim()` directly on
`efExpensesInput`/`efSavingsInput`, both of which are initialized to
`null` and stay `null` unless the user has actively typed into that
specific field during the current screen visit. Calling `.trim()` on
`null` throws an uncaught `TypeError`, which aborts the function before
`saveModel()` or `setEfSaved(true)` ever run — so tapping "Save" silently
does nothing whenever either field hasn't been freshly typed into (e.g.
using only the suggested-expenses button, or only editing one of the two
fields). Confirmed the working FI Calculator equivalent
(`handleSaveFi`) avoids this exact crash via a nullish-coalescing
fallback to its own "display" variable (`fiExpensesInput ?? 
fiExpensesDisplay`), and confirmed via `Select-String` that the matching
`efExpensesDisplay`/`efSavingsDisplay` fallback variables already exist
in this file (used to render the TextInputs' current values), just
weren't being used inside `handleSaveEf`.

Applied fix (hand-pasted by the person after review, as a find/replace
snippet): rewrote the first two lines of `handleSaveEf` to read from
`(efExpensesInput ?? efExpensesDisplay).trim()` /
`(efSavingsInput ?? efSavingsDisplay).trim()` first, then parse those
safe strings — mirroring `handleSaveFi`'s exact pattern. `npx tsc
--noEmit` clean. Committed and pushed. Still needs a real on-device
re-test — deliberately deferred (see bug #4's entry) until the rest of
this bug-fixing pass is done, to test everything together in one pass.

Flagged but NOT fixed this session (separate, lower-priority issue found
along the way): the two Emergency Fund TextInputs have no
`onBlur={handleSaveEf}` the way bug #4 added to all four FI fields — so
this section likely has the same "only saves if you scroll down and tap
Save" persistence gap bugs #3/#4 both had, independent of the crash just
fixed. Not folded into this fix since it wasn't the reported symptom;
tracked as a follow-up below.

### Session — FI Calculator non-functional on-device (bug #4)

Investigated via Antigravity (investigation-only, no commits from the
tool), across three reported symptoms on SavingsScreen.tsx's FI
Calculator section. Confirmed all three collapse into one root cause plus
one secondary bug:
- Root cause: none of the four FI fields (SWR, expected return, monthly
  savings, current savings) had any auto-save path — only a manual "Save"
  button at the bottom of the screen (`handleSaveFi`), which most people
  would never scroll down to tap. Every value was held only in local
  React state (`fiSwrInput`, `fiReturnRateInput`, `fiMonthlySavingsInput`,
  `fiSavingsInput`) and discarded on unmount.
- Symptom #1 ("Years Until FI" shows placeholder text) and symptom #2
  (show/hide projected-date toggle missing entirely) are both downstream
  of that: `fiCanProjectTimeline` requires all four fields to hold a real
  value, which they never did after leaving and returning to the screen,
  so it always fell into the "Enter more info" placeholder branch — and
  the toggle is nested inside that same branch, so it never rendered
  either. No separate toggle-specific bug existed.
- Secondary bug found during investigation: blank "Current savings" was
  being parsed as `NaN` (`parseFloat(fiSavingsDisplay)`) and treated as
  invalid, blocking the whole calculation — even though a blank field is
  a normal, valid answer meaning "starting from ₱0."
- Confirmed via `git show`/`git log` that this file's `handleSaveFi`
  function already existed, correctly writes all five FI fields to
  `model.calculatorInputs`, and is fully correct — it just wasn't being
  called anywhere except the manual Save button.

Applied fix (hand-pasted by the person after review, as find/replace
snippets rather than context-block inserts): added `onBlur={handleSaveFi}`
to all four TextInputs (current savings, SWR custom input, expected
return, monthly savings), and added an inline `handleSaveFi()` call to
the SWR preset buttons (3.5%/4.0%/4.5%) and both "tap to use this"
suggestion buttons (net-worth suggestion, monthly-savings suggestion),
since taps have no blur event to rely on. Also changed
`fiSavingsNum = parseFloat(fiSavingsDisplay)` to treat an empty field as
`0` instead of `NaN`, so the calculation runs as soon as return rate and
monthly savings are filled in even with current savings left blank.
`npx tsc --noEmit` clean. Committed and pushed. Still needs a real
on-device re-test — deliberately deferred by the person until the rest of
this bug-fixing pass is done, then all fixes get tested together in one
on-device pass rather than one at a time.

### Session — Left to Spend caution threshold not persisting (bug #3)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed root cause: the caution-threshold TextInput on
SettingsScreen.tsx only persisted its value on the TextInput's `onBlur`
event (`saveCautionThreshold()`), with no other save path — `onChangeText`
only ever updated local React state. In React Native, `onBlur` doesn't
reliably fire when a screen is torn down via the Back button, the
swipe-back gesture, switching tabs, or fully closing the app, so a typed
value could be silently discarded instead of saved whenever the user left
the screen any way other than tapping elsewhere on the same screen first.
Confirmed by comparing against a setting that DOES persist correctly
(`swipeToDeleteEnabled`, a toggle that saves instantly on tap with no
blur dependency) and against `autoLockMinutes`, which also saves
immediately on tap.

Applied fix (hand-pasted by the person after review): added `useRef` to
SettingsScreen.tsx's React import, and added a `useEffect` that auto-saves
the caution threshold ~600ms after the user stops typing, alongside
(not replacing) the existing onBlur save — so the value is written almost
immediately regardless of how the user later leaves the screen. A mounted-
ref guard skips the very first render so opening Settings doesn't trigger
a pointless save before anything's been touched. `npx tsc --noEmit` clean.
Committed and pushed. Still needs a real on-device re-test.

### Session — Offline delete hang on Accounts/Bills/Debts (bug #2)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed the exact same root cause across all three screens:
- Accounts/Bills/Debts each have an identical `performDelete()` that sets
  `saving = true`, awaits the shared `saveModel()` in DataContext.tsx, and
  sets `saving = false` in a `finally` block.
- `saveModel()` awaits Firestore's `setDoc()` (via `saveHouseholdData` for
  linked households, or `saveProfileCloudBackup` for unlinked profiles) to
  sync the change to the cloud. `setDoc()` never rejects or times out on
  its own while offline — it just stays pending indefinitely.
- Because that `await` never resolves, `saveModel()` never finishes, the
  screen's `finally` block never runs, and the loading spinner stays stuck
  until the device reconnects.
- Also confirmed (via `git show` on the earlier commit) why a prior fix —
  "add try/catch to Accounts/Bills/Debts delete" — never actually worked:
  it added a `catch` block that could never be reached, both because the
  hang means nothing ever throws, and separately because `saveModel()`
  already catches its own internal write errors and doesn't re-throw them
  to its caller.

Applied fix (hand-pasted by the person after review): added a
`withTimeout()` helper in DataContext.tsx and wrapped both cloud-write
calls inside `saveModel()` (the linked-household path and the unlinked
personal-backup path) in it, each with an 8-second timeout. `saveModel()`
now always resolves either way, so the calling screen's `finally` block
correctly fires and the spinner clears — on a timeout, the existing "Sync
Failed"/"Backup Failed" alert shows instead (data is already safe locally,
since the local save always happens first). `npx tsc --noEmit` clean.
Committed and pushed. Still needs a real on-device re-test.

### Session — Offline sign-out → sign-in lockout (bug #1)

Investigated via Antigravity (investigation-only prompt, no commits from
the tool). Found and confirmed against real code:
- SignInScreen.tsx's `handleSignIn` calls `signInWithFirebase` (Firebase
  Auth, works fine over restored network), then reads Firestore
  (`loadWrappedHouseholdKey`) to fetch the household key. Auth and
  Firestore recover from an offline period independently in this SDK
  setup — Firestore can stay stuck in backoff after Auth already succeeds.
- `household.ts`'s `loadWrappedHouseholdKey` was silently catching any
  `permission-denied` Firestore error and returning `null`, with no way
  for the caller to tell "this genuinely doesn't exist" apart from "the
  read itself failed."
- SignInScreen.tsx then treated that `null` as proof the username/password
  was wrong, even though Firebase Auth had already verified it correctly.
- Separately, the screen's static subtitle ("Enter your email, username,
  and password.") was nearly identical to the actual missing-fields
  validation error text, making unrelated errors look like two conflicting
  messages at once.
- App.tsx's offline sign-out could also hang indefinitely on a Firestore
  write (`deleteDeviceSession`) with no timeout, when offline.

Applied fix (hand-pasted by the person after review, not applied by the
tool): stopped swallowing the Firestore error in household.ts; added an
accurate "couldn't reach your household data" message; call
`enableNetwork(db)` right after a successful Firebase Auth sign-in to force
Firestore to reconnect; reworded the subtitle/validation-error text so they
can't look like duplicate errors; added a 1-second timeout race around the
offline sign-out's Firestore write. `npx tsc --noEmit` clean. Committed and
pushed. Still needs a real on-device re-test to fully close out.

✅ Carried forward from PROGRESS3.md — still true, not yet re-verified this file
- All of Phase B's checkpoints (B.1 through B.14) are CODE-COMPLETE. Full
  build detail lives in PROGRESS2.md.
- Everything through B.6 (plus B.5's UI/UX batches) has been verified on a
  real device once already — see PROGRESS2.md's own on-device testing
  session for that checklist and the bugs it found/fixed.
- Phase B Part 2 (Iconization & Minimalism Pass — B2.1 through B2.3 batch 4,
  the bottom nav redesign, the SettingsScreen.tsx/ProfileScreen.tsx "fewer
  words" trims) is fully CODE-COMPLETE and `npx tsc --noEmit` clean. See
  PROGRESS3.md for the full build detail on every batch.
- A first full on-device testing pass was run across everything from B.7
  onward (Left to Spend, Category Watchlist, Yours/Mine/Ours, refund
  tracker, weekly recap, FI calculator, tags/report filtering, subscription
  cancel-reminder, all of Phase B Part 2's iconization/swipe-to-delete/
  bottom-nav work). Real results — including several previously-believed-
  fixed bugs that turned out NOT to actually work on-device — are listed
  below under ⚠️ Known issues. Reminder/notification-specific testing was
  explicitly deferred to Phase C (see below) rather than chased through
  Expo Go.
- The "fewer words" trimming pass is PARTIALLY done: SettingsScreen.tsx,
  ProfileScreen.tsx, OnboardingScreen.tsx, SavingsScreen.tsx,
  SignInScreen.tsx, and MoreScreen.tsx are complete. A full
  ranked-by-wordiness inventory of every remaining screen already exists
  (captured in PROGRESS3.md's session history) — next up per that list
  is whichever screen ranks after MoreScreen.tsx; that specific screen
  name isn't in this file's own carried-forward notes, so pull it from
  PROGRESS3.md's ranked inventory at the start of the next session.

📌 Decisions carried forward — still active
- Always retrieve/view exact current file contents before writing code;
  confirm design decisions before writing code; review real diffs before
  committing.
- PowerShell here-strings only, never bash heredoc syntax, for this project.
- Insist on real command output/diffs from Antigravity/Copilot, not
  narrative summaries — investigation-only unless a change is large and
  well-reviewed enough to justify applying+committing directly (never
  pushing — the person always runs `git push` themselves).
- Close/Save All open VS Code tabs before any commit, including
  PROGRESS-file-only commits — a routine checkpoint commit has silently
  reverted real code twice in this project's history when a tab was left
  open with stale content.
- After any round of fixes, independently re-verify against real, current
  code before considering it done — don't trust progress-log claims or
  commit messages alone. (This one bit us directly in the first on-device
  pass — several fixes logged as done in PROGRESS3.md did not actually work
  on a real device.)
- Never hand the person a conditional/branching instruction ("if the file
  says X do Y, otherwise do Z") — get the real answer via investigation
  first, then give one unconditional fix.
- For any fix small enough to hand-paste, the person applies it directly
  and runs git themselves; Antigravity/Copilot applying+committing directly
  is reserved for large, well-reviewed, scattered multi-file changes.
- Orphaned `households/{householdId}` Firestore documents from abandoned
  link codes are a known, accepted limitation — deferred, needs server-side
  cleanup, not a client patch.
- Reminder/notification-related bugs and testing are explicitly deferred to
  Phase C — real push-notification delivery and deep-linking are far more
  reliable to verify on an actual installed build (EAS/TestFlight) than
  through Expo Go. Do not schedule investigation time on these until C.1
  is done.

⚠️ Known issues / gotchas — carried forward, still open

🐞 Real bugs confirmed on-device (11 of 13 now verified fixed; #4 and #5/5b need a fresh investigation round)
1. ✅ VERIFIED ON-DEVICE — Offline sign-out → sign-in lockout. Root cause:
   Firestore's own connection (separate from Firebase Auth) can get stuck
   in a dead/backoff state after a period offline, even once the network
   and Auth both recover — so the very next Firestore read
   (loadWrappedHouseholdKey) failed with permission-denied, which the code
   was silently swallowing to `null` and then wrongly reporting as
   "Incorrect username or password." At the same time, the screen's static
   subtitle text was nearly identical to the "missing fields" validation
   error, so the two looked like conflicting messages stacked together.
   Fixed by: (a) no longer treating a Firestore permission/connection error
   as a wrong password — it now propagates and shows an accurate
   connection-related message instead; (b) calling `enableNetwork(db)`
   right after a successful Firebase Auth sign-in, to force Firestore to
   reconnect using the freshly-restored network instead of staying stuck;
   (c) reworded the subtitle and the "missing fields" error so they can
   never look like two conflicting errors again; (d) the offline
   sign-out's `deleteDeviceSession` write now times out after 1 second
   instead of hanging indefinitely when offline, which was a related cause
   of the app getting stuck mid-sign-out. `npx tsc --noEmit` clean.
   CONFIRMED on-device: airplane mode off/on, then signing in with the
   real username/password succeeded normally. No further action needed.
2. ✅ VERIFIED ON-DEVICE — Offline delete hangs instead of showing an
   error (Accounts/Bills/Debts). Root cause: all three screens' delete
   handlers route through the shared `saveModel()` in DataContext.tsx,
   which awaits Firestore's `setDoc()` to sync the change to the cloud —
   but `setDoc()` never rejects or times out on its own when offline, it
   just stays pending forever. So `saveModel()` never finished, the
   calling screen's `finally { setSaving(false) }` never ran, and the
   loading spinner stayed stuck until connectivity returned. This also
   explains why the earlier "add try/catch to Accounts/Bills/Debts delete"
   fix never worked: the `await` it wrapped never threw in the first place
   (it just hung), and separately `saveModel()` already catches its own
   internal write errors and never re-throws them to the caller, so that
   screen-level `catch` block was unreachable dead code even in a world
   where the hang wasn't the issue. Fixed by adding a `withTimeout()`
   helper in DataContext.tsx and racing both cloud-write paths (linked
   household `saveHouseholdData`, and unlinked personal
   `saveProfileCloudBackup`) against an 8-second timeout, so `saveModel()`
   now always resolves either way — on timeout it shows the existing
   "Sync Failed"/"Backup Failed" alert (data was already saved locally
   first, so nothing is lost), and the calling screen's `setSaving(false)`
   / `closeModal()` correctly fires. `npx tsc --noEmit` clean. CONFIRMED
   on-device: with airplane mode on, deleting an account, a bill, and a
   debt each showed a "Sync Failed" alert within ~8 seconds instead of
   hanging. No further action needed.
3. ✅ VERIFIED ON-DEVICE — Left to Spend caution threshold doesn't
   persist. Root cause: the threshold's TextInput only saved on `onBlur`,
   which React Native doesn't reliably fire when the screen is torn down
   (Back button, swipe-back gesture, tab switch, or app close) — so a
   typed value could be silently lost instead of saved. Fixed by adding a
   ~600ms auto-save-after-typing-stops effect alongside the existing
   onBlur save, so the value is written almost immediately no matter how
   the screen is later left. `npx tsc --noEmit` clean. CONFIRMED
   on-device: typed a new threshold value, fully closed the app (swiped
   away, not just backgrounded), reopened it, and both Settings and Home's
   Left to Spend widget showed the new value. No further action needed.
4. ⏸️ FIX APPLIED, TSC CLEAN, ON-DEVICE RE-TEST DEFERRED — FI Calculator
   (Savings tab). Fresh investigation (round 2, see session log above)
   found the preset/suggestion-button taps were a stale-closure bug —
   `handleSaveFi()` was called immediately after `setState(...)` in the
   same synchronous handler, so it read the OLD state value rather than
   the one just tapped. Fixed by giving `handleSaveFi` an optional
   overrides parameter so each button can pass its new value directly,
   mirroring the pattern already used for Emergency Fund's
   `handleSaveEf`. Separately found "Years Until FI" staying blocked with
   Current Savings blank was actually caused by Annual Expenses — the one
   FI field that never got an `onBlur` auto-save in the original fix, so
   it reverted to blank on leaving the screen, which blocks the
   calculation regardless of the other three fields; fixed by adding the
   missing `onBlur`, and corrected the placeholder text (which never
   mentioned Annual Expenses) to say so. `npx tsc --noEmit` clean (after
   a follow-up fix for 6 type errors caused by wrapping `handleSaveFi` in
   an overrides-object signature — `onBlur`/`onPress` needed a
   no-argument arrow wrapper instead of a direct function reference).
   Per the person's direction, on-device re-test is DEFERRED — will be
   tested together with bug #5/5b and batched with the rest of this pass
   before/alongside moving to Phase C, rather than tested alone now.
5. / 5b. ⏸️ FIX APPLIED (round 2), TSC CLEAN, ON-DEVICE RE-TEST
   DEFERRED — Emergency Fund "Saved" checkmark. The onBlur auto-save
   added to both fields (expenses, savings) IS confirmed working —
   editing either field and leaving the screen without tapping Save now
   sticks. Round 1's null-crash fix to `handleSaveEf` itself was
   confirmed NOT sufficient. Round 2 investigation found the real root
   cause one level up: `calcInputsFromModel()` used an all-or-nothing
   fallback (`model.calculatorInputs || {defaults}`) instead of merging
   field-by-field, so once any calculator field had ever been saved
   (e.g. from FI Calculator testing), EF-specific fields that were never
   separately saved came back as `undefined` — which became the literal
   string `"undefined"`, which failed `parseFloat`, which silently
   aborted `handleSaveEf` before `setEfSaved(true)`. Fixed by rewriting
   `calcInputsFromModel()` to always start from the full defaults object
   and spread the saved data on top, rather than choosing one or the
   other. `npx tsc --noEmit` clean. Per the person's direction, on-device
   re-test is DEFERRED — will be tested together with bug #4 in one
   combined pass, not tested alone.
6. ✅ VERIFIED ON-DEVICE — None of the 3 promised background-save
   warnings ever showed on-device. Root cause: same disease as bug #2 —
   five separate `saveProfileCloudBackup`/`saveRecoveryKey`/
   `deleteRecoveryKey` calls across `changePassword()`,
   `unlinkHousehold()`, `unlinkAndTransferOwnership()` (all in
   DataContext.tsx), and `handleRecoverWithKey()` (SignInScreen.tsx) had
   no timeout, so on a dead connection they just hung instead of
   rejecting into their `.catch()` warning. Two of the five also had no
   warning at all wired up (`changePassword()`'s linked-profile branch
   had no `Alert.alert()`; `unlinkAndTransferOwnership()`'s catch was
   empty) — both fixed to match their working siblings. Fixed by
   exporting `withTimeout()` as a module-level function from
   DataContext.tsx and wrapping all five call sites in it (8-second
   timeout each), plus adding/fixing the two missing warning alerts.
   `npx tsc --noEmit` clean. CONFIRMED on-device: with airplane mode on,
   each of the three flows (change password, recover via recovery key,
   unlink from household) showed its own warning alert within ~8 seconds
   instead of hanging. No further action needed.
7. ✅ VERIFIED ON-DEVICE (resolved as a side effect of bug #2) —
   Events/Goals/Groceries/Settings' 30 `saveModel()` call sites all have
   their own screen-level try/catch intending a specific error message,
   but `saveModel()` catches and swallows all network errors internally
   and never rethrows, so those 30 catch blocks are confirmed unreachable
   dead code. No code change was needed here — `saveModel()`'s own
   internal "Sync Failed"/"Backup Failed" alert, combined with bug #2's
   `withTimeout()` fix, already covers this. CONFIRMED on-device: with
   airplane mode on, saving/deleting on each of the four screens (Events,
   Goals, Groceries, Settings) showed the generic "Sync Failed"/"Backup
   Failed" alert within ~8 seconds instead of nothing happening. No
   further action needed.
8. ✅ VERIFIED ON-DEVICE — Travel checklist-item delete left its linked
   expense behind in Transactions. Root cause: `handleRemoveChecklistItem`
   only ever updated local component state — it never touched
   `model.travel` and never called the existing (and already-correct)
   `reconcileTravelChecklistTransactions`, which only ran later on "Save
   trip." So removing an item and then backing out of the modal without
   saving left everything, including its linked transaction, untouched;
   unlike every other delete button in the app, which persist right away.
   Fixed by making `handleRemoveChecklistItem` async: for an
   already-saved trip it now writes the removal straight to
   `model.travel` and strips the item's `expenseTransactionId` from
   `model.manualTransactions` in the same `saveModel()` call. `npx tsc
   --noEmit` clean. CONFIRMED on-device: checked off a cost-bearing
   checklist item on an existing trip, confirmed its transaction appeared
   in Transactions, removed the checklist item, and the transaction
   disappeared immediately without needing to tap "Save trip." No further
   action needed.
8b. ✅ Fixed, on-device re-test not really applicable — in
    `saveModel()`'s linked-household branch (DataContext.tsx), the
    personal local-snapshot backup call
    (`saveEncryptedProfileData(...).catch(() => {})`) failed completely
    silently with no alert at all. Fixed by giving it a real `.catch()`
    that logs and shows a warning, wrapped in the existing `withTimeout()`
    helper, deliberately left NOT awaited/blocking (AsyncStorage doesn't
    hang offline the way Firestore does, so no need to add up to 8 extra
    seconds to every save). `npx tsc --noEmit` clean. Hard to force a
    genuine AsyncStorage failure on demand to trigger this on a real
    device, so this stays a code-level confirmation rather than a forced
    on-device repro — no report of it firing incorrectly either.
9. ✅ VERIFIED ON-DEVICE (general fix); Face-ID-specific symptom still
   pending a real installed build — Biometric unlock failed outright on a
   Face ID device with fingerprint off. Root cause was two tangled
   issues: `attemptBiometricAuth` discarded the real error from
   `LocalAuthentication.authenticateAsync`, collapsing every kind of
   failure (locked out, not enrolled, missing permission, genuine error)
   into a silent `false` with no message shown. Separately, the specific
   "Face ID fails, fingerprint works" symptom is believed caused by
   testing through Expo Go, since it uses its own separate pre-built
   permissions rather than this project's `app.json`. Fixed the
   general error-swallowing bug by changing `attemptBiometricAuth`'s
   return type to include the real error code, adding a
   `biometricErrorMessage()` translator, and wiring both call sites
   (PinUnlockScreen.tsx, SettingsScreen.tsx) to show the translated
   message instead of doing nothing. `npx tsc --noEmit` clean. CONFIRMED
   on-device: triggering a biometric failure on purpose showed a real
   error message instead of nothing happening. STILL NEEDS: the original
   Face-ID-specific "fails to even prompt" symptom needs separate
   re-verification on a real installed build once Phase C (EAS Build) is
   reached, since it may be an Expo Go artifact rather than an app bug —
   not re-tested this pass.
10. ✅ VERIFIED ON-DEVICE — Turning PIN off showed no loading indicator,
    read as frozen. Root cause: the "Turn Off" action was an inline
    anonymous async callback with no busy-state tracking at all, unlike
    every other async action on this screen. Fixed by adding a `pinBusy`
    state variable, wrapping the existing `removePin(username)` call in
    `setPinBusy(true)`/`try...finally` (also adding a real error alert on
    failure, which didn't exist before), disabling both the "Turn Off"
    and "Change PIN" buttons while busy, and swapping the "Turn Off"
    label for an ActivityIndicator during the action. `npx tsc --noEmit`
    clean. CONFIRMED on-device: tapping "Turn Off" showed a spinner and
    disabled the button instead of appearing to do nothing until it
    completed. No further action needed.
11. ✅ VERIFIED ON-DEVICE — Category Watchlist "over budget" wording
    fired at exactly 100% instead of only once genuinely over 100%. Root
    cause: `getCategoryBudgetStatus` (transactions.ts) checked
    `pct >= 100` for the "Over budget" state, so hitting the budget
    exactly was misclassified as over it. Fixed by changing the check to
    `pct > 100` (strictly exceeding) and adding a distinct "At budget"
    tier for exactly `pct >= 100` in the existing orange caution color.
    `npx tsc --noEmit` clean. CONFIRMED on-device: spending that exactly
    equaled a ₱1,000 category budget showed "At budget" in orange, and
    one peso over (₱1,001) correctly flipped to "Over budget" in red. No
    further action needed.
12. ✅ VERIFIED ON-DEVICE — "Which of these is you?" picker didn't update
    Transactions live, needed a full app restart to take effect. Root
    cause: the selected person id is stored in AsyncStorage outside
    DataContext/HouseholdModel, and both consuming screens
    (TransactionsScreen.tsx, reports/PersonSpendingReport.tsx) only ever
    read it once on mount — since React Navigation's bottom tabs keep
    screens mounted rather than remounting on tab switch, a change made
    on ProfileScreen never reached either already-mounted screen. Fixed
    by reusing the same pub-sub listener pattern this codebase already
    uses for the identical problem in autoLock.ts — added
    `subscribeToMyPersonId` to myPerson.ts, notified on set/clear, and
    subscribed to it in both affected screens' existing useEffect blocks.
    `npx tsc --noEmit` clean. CONFIRMED on-device: changed "Which of
    these is you?" on Profile, switched back to Transactions without
    restarting the app, and "Mine" labeling updated immediately; same
    confirmed on the Person Spending report. No further action needed.
13. ✅ VERIFIED ON-DEVICE — AccountsScreen Cards/List toggle "Stacked
    card view" floating label didn't appear on tap. Root cause: a
    combination of `LayoutAnimation.configureNext` disrupting
    `IconLabelHint`'s own measurement call, the tooltip defaulting to
    `position="above"` with no room above it at the top of the screen,
    and `IconLabelHint`'s off-screen placeholder position (`top: -1000`)
    being far enough outside the viewport that Android could skip firing
    `onLayout` for it entirely. Fixed by removing the
    `LayoutAnimation.configureNext` call from `handleToggleViewMode`,
    setting `position="below"` on both toggle labels, and changing the
    off-screen placeholder position to the icon's own known y-coordinate
    instead of a hardcoded `-1000`. `npx tsc --noEmit` clean. CONFIRMED
    on-device: tapping the Cards/List toggle showed the floating label
    for each icon. No further action needed.

🎨 Design-change requests surfaced during testing (need scoping, not quick fixes)
- ⏸️ IMPLEMENTED, TSC CLEAN, ON-DEVICE RE-TEST PENDING — Replace
  Android's native date picker with the app's own themed calendar
  popup. See session log above for full detail — DateField.tsx now
  renders a fully custom in-app calendar on Android (zero new
  dependencies, all 15 call sites unaffected, iOS untouched). Needs a
  real Android device test before this can be marked done.
- ⏸️ IMPLEMENTED, TSC CLEAN, ON-DEVICE RE-TEST PENDING — Bottom nav:
  Calendar dropped as a bottom tab (now 4 tabs: Home, To-Pay,
  Transactions, More); CalendarScreen moved into RootStack.tsx as a
  plain stack screen (`title: 'Calendar'`, back button reads "Home");
  a small tappable date pill (icon + today's date) was added to
  HomeScreen.tsx's top row, navigating to Calendar on tap. See session
  log above for full detail. Needs a real on-device test to confirm the
  new stack screen's back-navigation and the Home date pill both behave
  correctly.
- ⏸️ IMPLEMENTED, TSC CLEAN, ON-DEVICE RE-TEST PENDING — PIN "Turn Off"
  text button replaced with a toggle switch, matching the biometrics
  toggle pattern already used elsewhere in Settings. "Change PIN" moved
  to its own row underneath, shown only when a PIN is set. The existing
  `pinBusy`/`removePin`/confirmation-alert logic from bug #10 is
  untouched — only the on/off control changed from a button to a
  toggle. See session log above for full detail. Needs a real on-device
  test (both toggle directions, plus "Change PIN" still opening the
  modal) before this can be marked done.
- ⏸️ IMPLEMENTED, TSC CLEAN, ON-DEVICE RE-TEST PENDING — SUB/CANCELLED
  badge on Bills redesigned from plain text into a hollow-bordered
  badge box (gold border for SUB, faint border for CANCELLED). Only one
  spot in the whole codebase needed the change (BillsScreen.tsx's
  collapsed bill row). See session log above for full detail. Low
  visual risk (pure style change), but still worth a quick look
  on-device to confirm spacing/alignment looks right next to the bill
  name.
- ⏸️ IMPLEMENTED, TSC CLEAN, ON-DEVICE RE-TEST PENDING — "Which of
  these is you?" now requires an explicit Confirm/Cancel step instead
  of saving instantly on tap. Tapping a name only updates local pending
  state; Confirm calls the same real `setMyPersonId` used before (so
  bug #12's live-update-without-restart behavior is unchanged), Cancel
  discards the pending pick. See session log above for full detail.
  Needs a real on-device test: tap a different person, confirm
  Transactions/Person Spending still update live without a restart
  after tapping Confirm, and confirm Cancel correctly reverts the
  highlight to the previously-saved person.
- ⏸️ IMPLEMENTED, TSC CLEAN, ON-DEVICE RE-TEST PENDING — Reports
  screen redesigned with a checkbox-driven show/hide list for its 9
  report tabs. A new trailing "Customize" icon opens a BottomSheet
  checkbox list (per-profile AsyncStorage preference, new
  reportVisibility.ts file); unchecking a report removes its tab from
  the row, unchecking the active tab auto-switches to the next visible
  one, and unchecking everything shows an empty-state message instead
  of a blank screen. See session log above for full detail. Needs a
  real on-device test: open Customize, uncheck a few reports (including
  the currently active one) and confirm the tab row/active report
  update correctly, uncheck all 9 and confirm the empty-state message
  appears, re-check some and confirm they reappear, and confirm the
  tag-filter toolbar (on the 6 tag-filtered reports) still works
  normally throughout.
- ⏸️ IMPLEMENTED, TSC CLEAN, ON-DEVICE RE-TEST PENDING —
  ToPayScreen.tsx and PlanningScreen.tsx's segmented pill tabs reversed
  from icon-only circles back to icon + title pills, restoring each
  screen's real pre-iconization pill style. `IconLabelHint` dropped
  from both screens in favor of a plain icon + Text pill, since the
  floating tooltip is redundant once the label is always visible. See
  session log above for full detail. Needs a real on-device test:
  confirm both screens' pills look right (spacing, active/inactive
  colors) and that tapping still switches sub-tabs correctly on both
  screens (Bills/Debts/Loans on ToPay; Groceries/Travel/Events/Goals on
  Planning).
- Bottom nav: drop Calendar as a bottom tab entirely, replace with a small
  tappable date element at the top-center of Home that navigates to
  Calendar.
- ⏸️ IMPLEMENTED, TSC CLEAN, ON-DEVICE RE-TEST PENDING — Enable swipe on
  Transactions' bill-derived rows (Option B — navigate to the source
  Bill instead of allowing delete). Reuses a new transient pub-sub
  module (openBillRequest.ts) rather than the notification-only
  `openBillId` deep-link chain, specifically so it works safely from
  inside an already-open app and so a repeat swipe of the same bill
  still works. See session log above for full detail. Needs a real
  on-device test: swipe a bill-sourced transaction row, confirm a gold
  "View Bill" action appears (not the red delete button), confirm
  tapping it switches to the To-Pay tab with that bill's edit sheet
  already open, and confirm swiping the SAME bill's row a second time
  still opens it (not just the first time). Also confirm manual
  transaction rows still swipe-to-delete exactly as before.
- ⏸️ IMPLEMENTED, TSC CLEAN, ON-DEVICE RE-TEST PENDING — Swipe-to-
  navigate on Debt/Loan/Income/Savings-derived Transactions rows.
  Debts/Loans reuse the same pub-sub mechanism as Bills (new
  openDebtRequest.ts/openLoanRequest.ts, mirrored 1:1, Bills left
  untouched); Income/Savings use a simpler plain-navigation-param
  approach instead, since they're standalone RootStack screens rather
  than ToPayScreen tabs and don't need the pub-sub/nonce mechanism at
  all. See session log above for full detail. Needs a real on-device
  test: swipe a debt-sourced row (gold "View Debt" action → opens on
  the Debts sub-tab), a loan-sourced row (→ Loans sub-tab), an
  income-sourced row (→ Income screen with that source's edit sheet
  open), and a savings-sourced row (→ Savings screen with that goal's
  edit sheet open) — confirm each opens the right record, and confirm
  a second swipe of the same record still works for all four.

🔔 Deferred to Phase C — do not chase now
- Subscription reminder tap → deep-link to To-Pay → Bills → specific bill
  (needs a real fired reminder).
- "Bill reminders" / "Weekly recap" independent toggles in Settings →
  Notifications (tester couldn't even locate this option — needs its own
  investigation once real-notification testing is possible).
- Subscription bills not double-notifying.
- Weekly Spending Recap: toggle/day-pills/hour input, turning it off, and
  the actual notification firing with a matching amount.
- Subscription Cancel-Reminder: reminder wording, warm-app tap-to-deep-
  link, cold-start tap-to-deep-link.

⏸️ Could not be tested yet (not pass/fail — needs the right conditions)
- Legacy-profile crash guards on Home/Dashboard (no legacy profile
  available to test with).
- Two-device sync checks throughout (Left to Spend, Category Watchlist,
  Yours/Mine/Ours labeling, FI Calculator) — single-device household right
  now.

✅ Confirmed working as designed in the first on-device pass
- "Copy Recovery Key" in Settings → Security.
- Bills/Loans/Debts summary-line ordering consistency.
- Lock screen "Use password instead" flow.
- Solo/unlinked profile correctly has no "which of these is you?" picker
  (documented gap, not a bug).

📁 Files in the repo
See PROGRESS3.md's own "Files in the repo" section for the full inventory
through the end of Phase B Part 2 (B2.1–B2.3 batch 4, bottom nav redesign,
SettingsScreen.tsx/ProfileScreen.tsx fewer-words pass). New/modified files
from here on will be tracked fresh in this file.

- src/openBillRequest.ts — NEW. Transient (non-persisted) pub-sub module
  signaling "open this bill now" from TransactionsScreen to ToPayScreen/
  BillsScreen, with a nonce so repeat requests for the same bill still fire.
- src/openDebtRequest.ts — NEW. Exact mirror of openBillRequest.ts for
  Debts.
- src/openLoanRequest.ts — NEW. Exact mirror of openBillRequest.ts for
  Loans.
- src/components/SwipeableRow.tsx — MODIFIED. Added an optional
  `viewAction` prop (non-destructive alternative to the delete button).
- src/screens/BillsScreen.tsx — MODIFIED. Added an optional
  `openBillNonce` prop; auto-open guard now compares `{ id, nonce }`.
- src/screens/DebtsScreen.tsx — MODIFIED. Added optional
  `openDebtId`/`openDebtNonce` props with the same guard-ref effect
  pattern as BillsScreen.
- src/screens/LoansScreen.tsx — MODIFIED. Added optional
  `openLoanId`/`openLoanNonce` props with the same guard-ref effect
  pattern as BillsScreen.
- src/screens/IncomeScreen.tsx — MODIFIED. Added optional
  `openIncomeId`/`openIncomeNonce` props with the same guard-ref effect
  pattern, read via RootStack.tsx's route params rather than ToPayScreen.
- src/screens/SavingsScreen.tsx — MODIFIED. Added optional
  `openSavingsId`/`openSavingsNonce` props with the same guard-ref
  effect pattern, read via RootStack.tsx's route params.
- src/screens/ToPayScreen.tsx — MODIFIED. Subscribes to openBillRequest.ts,
  openDebtRequest.ts, and openLoanRequest.ts; forwards `{ id, nonce }` to
  BillsScreen/DebtsScreen/LoansScreen respectively.
- src/navigation/RootStack.tsx — MODIFIED. Added optional
  `openIncomeId`/`openIncomeNonce` and `openSavingsId`/`openSavingsNonce`
  params to `Income`/`Savings` in `RootStackParamList`; both screens now
  registered via a render-callback that extracts `route.params` and
  passes them down as plain props.
- src/screens/TransactionsScreen.tsx — MODIFIED. Added `useNavigation()`,
  five source-lookup helpers (bill/debt/loan/income/saving), and a swipe
  `viewAction` covering all five derived source types.

▶️ Next step
- Swipe-to-navigate on Debt/Loan/Income/Savings-derived Transactions
  rows is now IMPLEMENTED and `npx tsc --noEmit` clean — fold into the
  same combined on-device pass described below: swipe each of the four
  new row types and confirm they open the right record on the right
  screen/tab, and that a repeat swipe of the same record still works.
- With this, the "fewer words" pass (next screen per PROGRESS3.md's
  ranked list, after MoreScreen.tsx) is the only remaining genuinely
  open new-work item besides the on-device re-test pass and the
  unscheduled B.12b item.
- Bugs #4 (FI Calculator) and #5/5b (Emergency Fund) both now have
  round-2 fixes applied and `npx tsc --noEmit` clean — neither has been
  re-tested on a real device yet. Next step: do ONE combined on-device
  re-test pass covering both together, per the person's standing
  direction — this closes out the entire original 13-bug list once
  confirmed.
- The new Android in-app date-picker calendar (DateField.tsx) is
  implemented and `npx tsc --noEmit` clean, but not yet tested on a
  real Android device — worth folding into the same on-device pass as
  bugs #4/#5-5b, checking a few different screens (e.g. Bills' due
  date, Savings' target date) since it's a shared component used
  everywhere a date is picked.
- The bottom-nav Calendar-tab removal + Home date shortcut is also
  implemented and `npx tsc --noEmit` clean, not yet tested on-device —
  fold into the same combined on-device pass: confirm the 4-tab bar
  looks right, confirm tapping the new date pill on Home opens
  Calendar with a working back button to Home, and confirm nothing
  else (e.g. muscle memory reaching for the old tab position) feels
  broken.
- The PIN "Turn Off" → toggle switch redesign is also implemented and
  `npx tsc --noEmit` clean, not yet tested on-device — fold into the
  same combined on-device pass: toggle the PIN off (confirm the
  existing confirmation alert + spinner still work exactly as before),
  toggle it back on (confirm SetPinScreen opens), and confirm "Change
  PIN" still opens the modal correctly when a PIN is set.
- The SUB/CANCELLED hollow-box badge redesign is also implemented and
  `npx tsc --noEmit` clean — fold a quick visual check into the same
  on-device pass (badge spacing/alignment next to the bill name, both
  SUB and CANCELLED states).
- The "Which of these is you?" confirm/save step is also implemented
  and `npx tsc --noEmit` clean — fold into the same on-device pass: tap
  a different person, confirm the Confirm/Cancel row appears, confirm
  Cancel reverts the highlight without saving, and confirm tapping
  Confirm still updates Transactions/Person Spending live (bug #12
  behavior) without needing an app restart.
- The Reports screen checkbox show/hide redesign is also implemented
  and `npx tsc --noEmit` clean — the person is deferring on-device
  testing of this and every other pending design-change item until
  the whole current batch is done. Fold into the same combined
  on-device pass: Customize BottomSheet open/close, checking/
  unchecking individual reports, the active-tab auto-switch, the
  empty-state message when everything's unchecked, and the tag-filter
  toolbar still working correctly on the 6 tag-filtered reports.
- The ToPayScreen/PlanningScreen icon+title pill reversal is also
  implemented and `npx tsc --noEmit` clean — fold into the same
  combined on-device pass: confirm both screens' pills render and
  switch sub-tabs correctly.
- Swipe-to-navigate on Bills-derived Transactions rows is IMPLEMENTED
  and `npx tsc --noEmit` clean — fold into the same combined on-device
  pass: swipe a bill-sourced row (confirm the gold "View Bill" action,
  not delete), confirm it opens the right bill on the To-Pay tab, and
  confirm a second swipe of the same bill still works.
- The same swipe-to-navigate behavior for debt/loan/income/savings-
  derived rows is DECIDED (same approach) but deferred as its own
  separate, later checkpoint — none of those four screens have any
  deep-link wiring today, unlike Bills, so each needs that built first.
  This is the next design-change item to scope/build once ready.
- This closes out the rest of the design-change request list surfaced
  during the first on-device testing pass.
- Bug #9's Face-ID-specific "fails to even prompt" symptom still needs
  re-verification on a real installed build in Phase C (EAS Build) —
  believed to be an Expo Go limitation, not re-testable until then.
- Leave all reminder/notification testing and bugs alone until Phase C
  (C.1, EAS Build) is done — see the "🔔 Deferred to Phase C" list above.
- Once ready, separately scope and prioritize the design-change requests
  listed above (Android date picker, PIN toggle, SUB badge redesign,
  confirm-step for "which of these is you?", bottom-nav Calendar removal,
  Transactions swipe-to-delete on derived rows, Reports checkbox redesign,
  ToPay/Planning icon+title reversal) — these are new work, not bug fixes.
- Continue the "fewer words" pass: consult PROGRESS3.md's ranked
  inventory for the next screen after MoreScreen.tsx, and proceed
  onward down that list.
- Once the bug-fixing pass is far enough along (or the person decides to
  move on regardless), proceed to Phase C (Publishing) — see
  `4-REMAINING-WORK-ROADMAP.md`: C.1 (EAS Build → real installable
  .apk/TestFlight link) and, optionally, C.2 (App Store / Play Store
  publishing).
- B.12b-1 (Pension/Social Security offset) is now IMPLEMENTED and `npx tsc
  --noEmit` clean — see the "B.12b-1: Pension/Social Security offset
  (implemented)" session entry above for full detail. On-device testing is
  deliberately deferred by the person until right before moving to Phase C.
  B.12b-2 (multi-account selector) and B.12b-3 (scenario-comparison modal)
  remain unstarted — see the "B.12b scoped via Antigravity investigation"
  session entry for their original scoping detail.

📚 Older progress: PROGRESS3.md (Phase B Part 2 + first on-device testing
pass, now closed), PROGRESS2.md (Phase B build, B.1–B.14, closed),
PROGRESS1.md (Phase A, closed), PROGRESS.md (original Phases 0–11, closed).


## 📋 Full "fewer words" ranked inventory (regenerated — original list was lost, see known issues)

Completed already: SettingsScreen.tsx, ProfileScreen.tsx, OnboardingScreen.tsx, SavingsScreen.tsx, SignInScreen.tsx, MoreScreen.tsx

Remaining, ranked most-items-first:

1. LoansScreen.tsx (18 items)
2. IncomeScreen.tsx (14 items)
3. CreateProfileScreen.tsx (13 items)
4. GroceriesScreen.tsx (13 items)
5. DebtsScreen.tsx (11 items)
6. TransactionsScreen.tsx (11 items)
7. BillsScreen.tsx (9 items)
8. EventsScreen.tsx (8 items)
9. GoalsScreen.tsx (8 items)
10. CsvImportModal.tsx (7 items)
11. TravelScreen.tsx (7 items)
12. LoanPayoffSimulatorModal.tsx (5 items)
13. AccountsScreen.tsx (3 items)
14. DashboardScreen.tsx (3 items)
15. PinUnlockScreen.tsx (3 items)
16. CashFlowForecastReport.tsx (3 items)
17. TaxSummaryReport.tsx (3 items)
18. SetPinScreen.tsx (2 items)
19. PaymentMethodsReport.tsx (2 items)
20. PersonSpendingReport.tsx (2 items)
21. SubscriptionAuditReport.tsx (2 items)
22. CalendarScreen.tsx (1 item)
23. HomeScreen.tsx (1 item)
24. ReportsScreen.tsx (1 item)
25. MerchantSpendingReport.tsx (1 item)
26. PaymentMethodPicker.tsx (1 item)
27. InsightsScreen.tsx (0 items) — skip, nothing to trim
28. IntroScreen.tsx (0 items) — skip
29. PlanningScreen.tsx (0 items) — skip
30. ToPayScreen.tsx (0 items) — skip
31. MonthlyCloseOutReport.tsx (0 items) — skip
32. WeeklyDigestReport.tsx (0 items) — skip
33. YearInReviewReport.tsx (0 items) — skip

▶️ Next step: LoansScreen.tsx (18 items) — the current top of the list.


- Fixed 2026: the full ranked "fewer words" screen inventory had only ever
  existed in a since-closed chat session, never saved to a file. Regenerated
  via Antigravity re-scan (see inventory section above) and now permanently
  captured in PROGRESS4.md. Going forward, any generated list like this
  must be pasted into PROGRESS4.md the same session it's produced.



## ✅ LoansScreen.tsx — "fewer words" pass complete (18 items trimmed)

Trimmed all 18 flagged items: 7 validation/error messages, 2 delete-confirmation
alert bodies (identical text, both call sites), 1 empty-state message, 2 direction
pill labels (Borrowed/Lent — dropped parenthetical explanations), 1 input label,
1 placeholder, 1 more input label, 1 field hint, 1 unsaved-state hint, 1 delete
button label. Verified via `npx tsc --noEmit` from mobile-app\ — clean.

▶️ Next step: IncomeScreen.tsx (14 items) — next on the ranked inventory list above.



## ✅ IncomeScreen.tsx — "fewer words" pass complete (14 items trimmed)

Trimmed all 14 flagged items: 7 validation/error messages (amount, day-of-month,
two date-format errors, payment-log entry/date/amount errors), 2 delete-
confirmation alert bodies (identical text, both call sites), 1 empty-state
message, 1 input label ("Source name"), 1 DateField label (biweekly anchor,
converted from a question to a plain label), 1 section hint, 1 delete button
label. Verified via `npx tsc --noEmit` from mobile-app\ — clean.

### Session — B.12b-1: Pension/Social Security offset (implemented)

Investigated via Antigravity (investigation-only, no commits from the tool)
per the round-2-style scoping already done for B.12b in a prior session.
Antigravity supplied the full real contents of `CalculatorInputs`
(types.ts), every real occurrence of `fiAnnualExpenses`/`fiExpensesNum`/
`fiExpensesDisplay` in SavingsScreen.tsx, the full real `fiNumber`
calculation block, the full real `handleSaveFi` function, and confirmed
the existing "optional numeric input with onBlur auto-save" pattern
already used by the Expected Annual Return / Monthly Savings fields on
this same screen (nullable local state → `xDisplay` fallback to stored
value → parsed number → included in `handleSaveFi`'s overrides object →
`onBlur={() => handleSaveFi()}`).

Implemented (hand-pasted by the person after review, as 6 snippets across
types.ts and SavingsScreen.tsx), matching that exact existing pattern
rather than inventing a new one:
- Added a new `fiGuaranteedAnnualIncome: number | ''` field to
  `CalculatorInputs` (types.ts).
- Added the matching default fallback in `calcInputsFromModel()`.
- Added a new `fiGuaranteedIncomeInput` local state variable, plus its
  `fiGuaranteedIncomeDisplay`/`fiGuaranteedIncomeNum` display/parse
  mirror pair, following the exact same shape as the other FI fields.
- Changed the FI-number calculation to first compute
  `fiNetAnnualExpenses = max(0, fiExpensesNum - fiGuaranteedIncomeNum)`
  (treating a blank/invalid offset as 0, and never letting the net go
  negative), then divide THAT by the withdrawal rate instead of dividing
  raw `fiExpensesNum` directly.
- Extended `handleSaveFi`'s overrides parameter, parsing/validation, and
  the object passed to `saveModel()` to include the new field, following
  the exact same per-field pattern as every other FI input in this
  function.
- Added a new "Pension / Social Security (optional)" TextInput between
  the Annual Expenses suggestion row and the "Current savings /
  investments" label, with a one-line hint explaining it's subtracted
  before the FI target is calculated, and `onBlur={() => handleSaveFi()}`
  matching every other FI field's auto-save convention.

Leaving the field blank behaves exactly as before this change (subtracts
0, no change to the existing FI number for anyone who doesn't use it).
`npx tsc --noEmit` clean (confirmed by the person from mobile-app\ — 0
errors). Per the person's direction, on-device testing of this is being
held until right before moving to Phase C, batched together with the
other pending on-device items rather than tested in isolation now.

▶️ Next step: CreateProfileScreen.tsx (13 items) — next on the ranked inventory list above. B.12b-2 (multi-account selector) and B.12b-3 (scenario-comparison modal) remain unstarted.

