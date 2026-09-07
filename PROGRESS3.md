Household Finance Mobile App — Progress Log (Phase B on-device testing → Phase C: Publishing)

This file picks up exactly where PROGRESS2.md left off. PROGRESS2.md is now
closed/historical (all of Phase B's checkpoints B.1–B.14 are code-complete;
see it for full build detail on any of them). PROGRESS1.md (Phase A) and
PROGRESS.md (original Phases 0–11) are closed/historical before that.


📅 Session entries

### Session — Swipe-to-delete toggle, checkpoint 3 of 3, part 2 (AccountsScreen — flat/list rows only)
- Wrote a follow-up Antigravity investigation-only prompt to get the
  real current code needed to wire AccountsScreen specifically: its
  `useData()` scope, imports, exactly how "stacked" vs. "flat/list" is
  decided, the current delete function, the exact row JSX for both
  render branches, and — critically — whether the stacked cards' tap-
  to-expand behavior was implemented as a pan gesture (which could
  conflict with SwipeableRow's own pan gesture) or something simpler.
- Investigation found the tap-to-expand interaction is NOT a pan
  gesture at all — it's a plain `TouchableOpacity.onPress` combined
  with React state (`expandedAccountId`) and `LayoutAnimation`, in both
  `AccountCard.tsx` (a purely presentational component) and
  `AccountsScreen.tsx` (which owns all the expand/collapse logic).
  This removes the originally-flagged risk of two competing pan-gesture
  recognizers. Confirmed `isStackedSection` (`viewMode === 'stacked' &&
  accounts.length >= 2`) is the exact real condition already
  distinguishing stacked overlapping cards from flat/list ones, and
  that the existing delete function (`performDelete()`/`handleDelete()`)
  is keyed off stored `activeGroup`/`editingId` state, not an explicit
  id argument.
- Even with the pan-gesture risk removed, kept the original decision to
  wrap ONLY the flat/list branch (`!isStackedSection`) in `SwipeableRow`
  this session, leaving stacked overlapping cards unwrapped for now —
  stacked cards still have negative overlapping margins and dynamic
  z-index tied to `expandedAccountId`, and confirming a swipe gesture
  behaves well against that layout is worth verifying on-device before
  trusting it, even without a second pan recognizer in the mix. Tapping
  a stacked card still opens the edit modal's own Delete button either
  way, so nothing is undeletable.
- Gave the person exact paste/replace snippets for `AccountsScreen.tsx`:
  added a `SwipeableRow` import (no `Alert` import needed — already
  present); a new `performDeleteAccountById(group, id)` +
  `handleSwipeDeleteAccount(group, account)` pair added alongside the
  existing modal-based `performDelete()`/`handleDelete()`, reusing the
  same confirmation title/message; and the flat/list branch's
  `<AccountCard>` wrapped in `<SwipeableRow>`, while the stacked
  branch's `<AccountCard>` return was left completely untouched.
- `npx tsc --noEmit` run from `mobile-app\` after pasting — clean, no
  errors. This completes checkpoint 3 (all 5 non-CollapsibleRow
  screens now handled — Goals, Events, Travel, Groceries
- Wrote an Antigravity investigation-only prompt for checkpoint 3,
  covering the 5 screens that render their own row markup instead of
  using `CollapsibleRow` — GoalsScreen, TravelScreen, EventsScreen,
  GroceriesScreen, AccountsScreen — asking for each screen's exact
  `useData()` scope, every distinct deletable-row `.map()` block (with
  full current delete function bodies and whether delete is keyed off
  `editingId` or takes an explicit id), the exact row JSX for each,
  current imports, and an explicit flag for any nested deletable rows
  (e.g. checklist items inside a trip or event).
- Antigravity's investigation confirmed: GoalsScreen and EventsScreen
  each have one flat top-level list with a straightforward `editingId`-
  keyed delete function; TravelScreen's top-level trip list is the same
  shape, but its checklist items nested inside the edit modal already
  have their own inline "X" delete button right there in the form;
  GroceriesScreen's main Grocery List tab is the same shape, but its
  separate Calculator-tab entries also already have their own inline
  "X" delete button in the row. AccountsScreen was flagged as needing a
  real decision before writing any code: its "stacked" account cards
  overlap by 80px and already implement their own tap-to-expand pan
  gesture, so wrapping an overlapping stacked card in `SwipeableRow`
  (which adds its own pan-gesture recognizer) risks the two gestures
  fighting each other in a way that can't be verified from code alone —
  it would need real on-device testing to know if it feels broken.
- Decided: only wrap the 4 unambiguous screens (Goals, Events, Travel,
  Groceries) this session, each following the exact same pattern as
  checkpoint 2 — a new `performDelete*ById(id)` + `handleSwipeDelete(item)`
  pair added alongside each screen's existing `editingId`-keyed
  `handleDelete()`, reusing the same confirmation title/message on both
  paths, and the existing row's `<TouchableOpacity>` wrapped in
  `<SwipeableRow enabled={Boolean(model.settings.swipeToDeleteEnabled)}
  onDelete={...}>`. For Travel and Groceries specifically, deliberately
  left the nested checklist items / Calculator-tab rows unwrapped, since
  they already have a one-tap inline delete visible in the row itself —
  same reasoning as not double-tooling something that's already a single
  tap away. AccountsScreen's own decision (recommended: enable swipe only
  on flat/list-mode rows via the existing `!isStackedSection` condition,
  and skip stacked overlapping cards entirely for now, tapping still
  opening the edit modal's own Delete button either way) is still
  pending the person's confirmation — see ▶️ Next step.
- Gave the person paste/replace snippets for all 4 files: `Alert` import
  added to each (none had it yet), `SwipeableRow` import added to each,
  a new `performDelete*ById()` + `handleSwipeDelete()` pair inserted
  right after each screen's existing `handleDelete()`, and the row's
  `<TouchableOpacity>` wrapped in `<SwipeableRow>...</SwipeableRow>` at
  both its opening and closing tags. EventsScreen's and TravelScreen's
  delete-by-id handlers each reuse the same cascade-cleanup logic as
  their existing modal-based delete (removing a linked savings goal
  and/or linked expense transaction(s) alongside the row itself).
- `npx tsc --noEmit` run from `mobile-app\` after pasting all 4 files —
  clean, no errors.
- On-device testing explicitly deferred — see ⚠️ Known issues and
  ▶️ Next step. AccountsScreen (checkpoint 3, part 2) not yet started,
  pending the person's decision on the stacked-card gesture-conflict
  question above.

### Session — Swipe-to-delete toggle, checkpoint 2 of 3 (wire SwipeableRow into CollapsibleRow's 6 screens)
- Wrote 2 Antigravity investigation-only prompts to map out exactly how
  each of the 6 CollapsibleRow-based screens (Bills, Debts, Income,
  Loans, Savings, Transactions) currently deletes a row, before writing
  any wiring code: (1) confirmed CollapsibleRow.tsx has no onDelete prop
  at all, confirmed SwipeableRow.tsx's real prop signature was unchanged
  from checkpoint 1, confirmed the app's standard `useData()` pattern for
  reading `model.settings`, and confirmed all 6 screens (plus 3 more that
  import CollapsibleRow but don't render it — Events, Goals, Travel);
  (2) got each of the other 5 screens' (all but Bills, already known)
  exact current delete function, exact CollapsibleRow JSX block, and
  exact top-of-file imports.
- Design decision: rather than adding an `onDelete` prop to the shared
  `CollapsibleRow.tsx` (which every one of the 9 importing screens would
  need touching), each screen instead wraps its own existing
  `<CollapsibleRow>` call in `<SwipeableRow enabled={...}
  onDelete={...}>` at the render site. `CollapsibleRow.tsx` itself is
  untouched. Every screen already had `model`/`saveModel` in scope, so
  reading `model.settings.swipeToDeleteEnabled` needed no new imports.
  Each screen got its own new `performDelete*ById(id)` +
  `handleSwipeDelete(item)` pair, separate from the existing modal-based
  `performDelete()`/`handleDelete()` (which are keyed off `editingId`
  and stay exactly as they were, since the in-modal Delete button still
  needs them) — swiping doesn't open the edit modal first, so it needs
  its own by-id delete path. Same confirmation wording (title/message)
  reused for both the modal and swipe paths on every screen, so nothing
  about the "this can't be undone" warning differs depending on how the
  delete was triggered.
- TransactionsScreen is the one screen where `enabled` is NOT just
  `model.settings.swipeToDeleteEnabled` — it's
  `isManual && Boolean(model.settings.swipeToDeleteEnabled)`, since only
  manual transactions are deletable at all on that screen (bill/debt/
  loan/income/savings-derived rows are read-only there and already show
  "edit it there" instead of a Delete option). Its delete-by-id handler
  also reuses the existing refund-transaction cascade logic (deleting a
  transaction that has a linked refund transaction removes both).
- Gave the person exact paste/replace snippets for all 6 files: new
  `import SwipeableRow from '../components/SwipeableRow';` line, a new
  `performDelete*ById()` + `handleSwipeDelete()` pair inserted right
  after each screen's existing `handleDelete()`, and the CollapsibleRow
  JSX wrapped in `<SwipeableRow>...</SwipeableRow>` at both its opening
  and closing tags.
- Applying the Transactions snippet produced a duplicate-import compile
  error (`makeId`/`CollapsibleRow`/`DateField` each declared twice, with
  one line accidentally merged onto another) — a paste mechanics slip,
  not a design problem. Fixed by replacing the garbled import block with
  4 clean lines.
- `npx tsc --noEmit` run from `mobile-app\` after the fix — clean, no
  errors, across all 6 files.
- On-device testing explicitly deferred — see ⚠️ Known issues and
  ▶️ Next step.

### Session — Swipe-to-delete toggle + settings preview (new feature, checkpoint 1 of 3)
- Wrote 2 Antigravity investigation-only prompts to map out how list rows
  currently work app-wide before designing anything: (1) shared vs.
  per-screen row components, current delete flow, installed gesture/
  animation libraries, `App.tsx`'s root wrapping, `IconLabelHint`'s
  animation approach, an existing Settings toggle end-to-end, and
  `SettingsScreen.tsx`'s section layout; (2) exact current contents of
  `index.js`, the `Settings` type, the default settings object, and the
  exact `SettingsScreen.tsx` text around the intended insertion point,
  plus confirming the correct `npx expo install` command and that no
  swipe-related file already exists.
- Investigation confirmed: 6 screens (Bills, Debts, Income, Loans,
  Transactions, Savings) share `CollapsibleRow.tsx`; 5 screens (Goals,
  Travel, Events, Groceries, Accounts) implement their own row markup
  and import `CollapsibleRow` without using it. Every screen's delete
  flow is currently "tap row/Edit → modal → Delete button inside modal";
  no swipe, long-press, or context-menu delete exists anywhere yet.
  Neither `react-native-gesture-handler` nor `react-native-reanimated`
  was installed; `App.tsx`'s root was not wrapped in
  `GestureHandlerRootView`. `IconLabelHint` uses the base `Animated` API
  (`useNativeDriver: true`), confirming no new animation library was
  needed for the preview. The existing `weeklyRecapEnabled` toggle
  pattern (custom track/thumb `TouchableOpacity`, not a native
  `<Switch>`) and its exact save-through-`saveModel()`-to-
  AsyncStorage/Firestore path were confirmed and reused as-is for the
  new setting.
- Scoped this as the first of 3 checkpoints: (1) this session — install
  the dependency, build the reusable `SwipeableRow` component and a
  standalone `RowInteractionPreview` component, add a new Settings
  section with the toggle + live preview, wire up `App.tsx`'s
  `GestureHandlerRootView` — nothing rolled out to any real list yet,
  matching the same "build it standalone, verify it, then roll out"
  approach used for `IconLabelHint`/B2.1; (2) next — wire `SwipeableRow`
  into `CollapsibleRow`, covering all 6 screens that already use it at
  once; (3) final — wire it individually into the 5 screens that don't
  use `CollapsibleRow` (Goals, Travel, Events, Groceries, Accounts).
- Added a new `swipeToDeleteEnabled: boolean` field to the `Settings`
  type and to `defaultModel.ts`, defaulting to `false` so tap-to-open
  stays the behavior for every existing profile until they explicitly
  opt in.
- Built `mobile-app/src/components/SwipeableRow.tsx` (new file) — a
  reusable wrapper around `react-native-gesture-handler`'s `Swipeable`,
  gated by an `enabled` prop (renders children unwrapped when disabled,
  so it's a true no-op until checkpoint 2/3 actually pass `enabled`
  from the new setting); swipe-left reveals a red delete action with a
  scaling trash icon.
- Built `mobile-app/src/components/RowInteractionPreview.tsx` (new
  file) — a self-contained, looping demo row for the Settings screen:
  in "swipe" mode it animates a fake row sliding left to reveal a
  delete icon behind it and back; in "tap" mode it animates a fake row
  expanding open to reveal a "Delete this bill" demo button and
  collapsing again. Neither mode depends on `SwipeableRow` or real
  gesture-handler interaction — it's a pure `Animated`-driven loop, so
  it works even before any screen is actually wired up.
- Added a new "List Rows" section to `SettingsScreen.tsx`, positioned
  between "Appearance" and "Notifications," with a 2-option pill row
  ("Swipe to delete" / "Tap to open") following the same active/
  inactive pill styling as the existing `MODE_OPTIONS` row, a new
  `handleSetSwipeToDelete()` save handler modeled directly on
  `toggleWeeklyRecap()`, and the new `RowInteractionPreview` rendered
  live below the pills, switching mode based on the current setting.
- Updated `mobile-app/index.js` to import `react-native-gesture-handler`
  as the very first line (a hard requirement of the library, confirmed
  via investigation before writing the change) and wrapped `App.tsx`'s
  top-level `export default function App()` in
  `<GestureHandlerRootView style={{ flex: 1 }}>`.
- `npx tsc --noEmit` run from `mobile-app\` after all files pasted —
  clean, no errors.
- On-device testing explicitly deferred — see ⚠️ Known issues and
  ▶️ Next step. Priority checks: does the app launch without a red
  screen now that a new native module (`react-native-gesture-handler`)
  is linked; does the new Settings section render; does switching
  between the two options correctly swap which preview animation plays.

### Session — B2.3 batch 3b build (follow-up "✓" cleanup: Events, Goals, CreateProfile, Settings, Savings, Profile)
- Wrote an Antigravity investigation-only prompt for batch 3b — the 6
  follow-up "✓" occurrences flagged during batch 3's earlier passes but
  explicitly left untouched: EventsScreen's/GoalsScreen's inline
  card-title checkmark, CreateProfileScreen's/SettingsScreen's "Copied! ✓"
  copy-recovery-key button state, SavingsScreen's FI Calculator "Saved ✓"
  button, and ProfileScreen's "✓ New Owner" transfer-owner badge.
- Antigravity's investigation confirmed all 6 files already import
  Ionicons, so no new imports were needed anywhere. Found: EventsScreen's
  and GoalsScreen's title checkmarks are embedded directly inside a
  single `<Text>` node's string, inside a column-flex parent container
  (no `flexDirection: 'row'` yet); CreateProfileScreen's and
  SettingsScreen's copy buttons already have a row-flex container and
  already conditionally render an icon in the un-copied state, so
  extending that same conditional to the copied state was a small,
  low-risk change; SavingsScreen's "Saved" button has no row-flex on its
  shared `saveButton` style (column by default); ProfileScreen's "New
  Owner" badge is already its own sibling `<Text>` element with a
  row-flex parent, just needing the checkmark split out of the string.
  Antigravity also flagged a 7th, out-of-scope "✓" occurrence inside
  BillsScreen's subscription checkbox, surfaced with only one line and no
  surrounding context — deferred to a follow-up investigation rather than
  guessed at.
- Reviewed and decided: use `checkmark-circle` (green, `#10b981`) for the
  2 persistent row-status indicators (EventsScreen/GoalsScreen title
  checkmarks), matching the existing "done" color already used elsewhere
  on those same screens, rather than a plain checkmark — these are
  ongoing status markers on a list row, not one-off confirmations. Use a
  plain `checkmark` (no circle) for the 3 transient-confirmation cases
  (CreateProfileScreen/SettingsScreen "Copied!", SavingsScreen "Saved",
  ProfileScreen "New Owner" selection) since those already read clearly
  as a brief state change rather than a lasting status. For
  EventsScreen/GoalsScreen, wrapped the title `<Text>` in a new row
  container (`eventTitleRow`/`goalTitleRow`) so the icon sits beside
  (not stacked under) the text, and added `flexShrink: 1` to the title
  style so a long title still truncates correctly with the icon in view.
  For SavingsScreen's save button, applied `flexDirection: 'row'` +
  `alignItems`/`justifyContent: 'center'` inline on that one button
  rather than editing the shared `saveButton` style, in case other
  buttons elsewhere reuse that same style. For ProfileScreen's badge,
  wrapped the icon+text pair in a small inline row `View` rather than
  adding a new named style, since it's a one-off badge used in a single
  spot.
- Gave the person paste/replace snippets for all 6 files: EventsScreen's
  and GoalsScreen's title rows (new `eventTitleRow`/`goalTitleRow` row
  styles, checkmark-circle icon, `flexShrink: 1` added to the title
  style); CreateProfileScreen's and SettingsScreen's copy buttons (single
  Ionicons element now switches between `copy-outline` and `checkmark`
  based on copied state, replacing the separate conditional-icon +
  embedded-"✓"-string pattern); SavingsScreen's save button (inline
  row-flex style merge, conditional checkmark icon added, "✓" removed
  from the button text string); ProfileScreen's "New Owner" badge (split
  into an icon+text row instead of one string with an embedded "✓").
- `npx tsc --noEmit` run from `mobile-app\` — clean, no errors.
- On-device testing explicitly deferred — see ⚠️ Known issues and
  ▶️ Next step.
- Identified, not yet investigated: a 7th "✓" occurrence inside
  BillsScreen's subscription checkbox (a custom checkbox mark, not part
  of any originally-flagged pattern) — needs its own investigation prompt
  before any fix is written, since only one out-of-context line was
  surfaced this pass.

### Session — B2.3 batch 3, Pass 4 build (Auth, security & profile: SignIn, CreateProfile, PinUnlock, Profile, Settings)
- Wrote an Antigravity investigation-only prompt for B2.3 batch 3, Pass 4:
  the character/emoji cleanup pass for SignInScreen, CreateProfileScreen,
  PinUnlockScreen, ProfileScreen, SettingsScreen.
- Antigravity's investigation found: a raw "✕" close button on
  SignInScreen's revoked-session banner (not in the original flagged
  list); ⚠️ warning-banner emoji on both SignInScreen and ProfileScreen;
  📋 copy-recovery-key emoji on both CreateProfileScreen and
  SettingsScreen; 🔄 retry-biometric emoji on PinUnlockScreen; a raw "✓"
  checkbox mark on CreateProfileScreen's recovery-key-saved
  acknowledgment; raw "›" chevrons on ProfileScreen's 2 shortcut rows and
  SettingsScreen's profile card row; raw "▲"/"▼" reorder buttons on
  SettingsScreen's categorization rules; and ProfileScreen's "✓ Linked"
  household-status badge (single-`<Text>` pattern). Confirmed the
  "Copied! ✓" button text (CreateProfileScreen + SettingsScreen) and
  ProfileScreen's "✓ New Owner" transfer-owner badge exist exactly where
  already tracked, unchanged — still batch 3b scope, not touched this
  pass. Confirmed none of the 5 files import Ionicons yet.
- Reviewed and decided: recovery-key copy buttons use `copy-outline`
  (not `clipboard-outline`) — a clipboard icon reads as "paste" or "to-do
  list" on mobile, while copy-outline unambiguously signals "copy to
  clipboard," matching conventions in password managers (1Password,
  Bitwarden); use `close` (not `close-circle`) for SignInScreen's banner
  dismiss button, consistent with prior passes; use `chevron-forward` for
  both `›` nav-chevron locations and `chevron-up`/`chevron-down` for the
  `▲`/`▼` reorder buttons, consistent with earlier batches' reasoning.
  For the single-`<Text>`-with-embedded-character patterns (SignInScreen's
  banner, CreateProfileScreen's copy button, PinUnlockScreen's retry
  button, ProfileScreen's peer-recovery banner and "✓ Linked" badge), the
  container needed `flexDirection: 'row'` + `alignItems`/`justifyContent`
  added so the icon sits beside the text instead of stacking under it.
  CreateProfileScreen's checkbox mark and both `›` chevrons already had
  dedicated containers, so no style changes were needed for those.
- Gave the person paste/replace snippets for all 5 files: added the
  `Ionicons` import to each; SignInScreen's revoked-session banner
  (⚠️ → `warning-outline`, ✕ → `close`, both JSX + container style);
  CreateProfileScreen's copy-recovery-key button (📋 → `copy-outline`,
  shown only in the un-copied state, JSX + container style) and
  recovery-key-saved checkbox (✓ → `checkmark`, icon swap only);
  PinUnlockScreen's retry-biometric button (🔄 → `refresh-outline`, JSX
  + container style); ProfileScreen's 2 shortcut-row chevrons
  (› → `chevron-forward`, icon swap only), peer-recovery banner
  (⚠️ → `warning-outline`, JSX + container style), and "✓ Linked" badge
  (✓ Linked text → Ionicons checkmark + "Linked" text in a row);
  SettingsScreen's profile-card chevron (› → `chevron-forward`, icon swap
  only), categorization-rule reorder buttons (▲/▼ → `chevron-up`/
  `chevron-down` with opacity 0.3 when disabled, icon swap only), and
  copy-recovery-key button (📋 → `copy-outline`, shown only in the
  un-copied state, JSX + container style). Old `*Text`-only styles
  (`revokedBannerText`'s embedded characters, `checkmark`, `chevron`,
  `profileChevron`, `reorderBtnText`) left in place, harmless, per the
  established convention.
- `npx tsc --noEmit` [PENDING — person to run after pasting all 5 files].
- On-device testing explicitly deferred — see ⚠️ Known issues and
  ▶️ Next step.

### Session — B2.3 batch 3, Pass 3 build (Transactions & money flows: Transactions, CsvImportModal, Loans, Income, Savings)
- Wrote an Antigravity investigation-only prompt for B2.3 batch 3, Pass 3:
  the character/emoji cleanup pass for TransactionsScreen, CsvImportModal,
  LoansScreen, IncomeScreen, SavingsScreen.
- Antigravity's investigation confirmed CsvImportModal actually lives at
  `mobile-app/src/screens/CsvImportModal.tsx` (not `src/components/` as
  originally guessed). Found: 📎 (TransactionsScreen attach-receipt
  button), 📄 (CsvImportModal choose-file button), 📊 (LoansScreen
  Payoff Simulator button) as emoji-icons; a raw "✓" TransactionsScreen
  refund-tracking toggle (single-`<Text>` pattern, same as batch 3 Pass
  2's toggles); a raw "✓" checkbox mark inside CsvImportModal's
  duplicate-row indicator (already a dedicated centered `View`, no style
  change needed); and 3 raw delete-row characters — LoansScreen's `✕`,
  IncomeScreen's `×` (intentionally red, `#e5484d`, distinct from the
  other screens' muted ink color), and SavingsScreen's `✕` (already a
  circular 36×36 button, no style change needed). Confirmed none of the
  5 files import Ionicons yet. Also reconfirmed SavingsScreen's FI
  Calculator "Saved ✓" button text as already-tracked batch 3b scope,
  not touched this pass.
- Reviewed and decided: CsvImportModal's file-picker icon shows in both
  states (before and after a file is chosen), rather than only on the
  initial "Choose a CSV file" text, so the button reads consistently
  either way; use `close` (not `close-circle`) for all 3 delete-row
  swaps, consistent with prior passes' reasoning; keep IncomeScreen's
  red delete-icon color as an intentional distinction, matching the
  batch 3 Pass 1 precedent for the same screen family. For
  TransactionsScreen's refund toggle and TransactionsScreen's
  attach-receipt button, LoansScreen's simulator button, and
  CsvImportModal's choose-file button (all single-`<Text>`-with-embedded-
  character patterns), the container style needs `flexDirection: 'row'`
  + `justifyContent: 'center'` added so the icon sits beside the text.
  CsvImportModal's duplicate-row checkbox and LoansScreen/IncomeScreen/
  SavingsScreen's delete buttons already had dedicated centered
  containers, so no style changes were needed for those.
- Gave the person paste/replace snippets for all 5 files: added the
  `Ionicons` import to each; TransactionsScreen's `receiptPickButton`
  (📎 → `attach-outline`, JSX + container style) and `refundToggle`
  (✓ → `checkmark`, JSX + container style); CsvImportModal's `pickButton`
  (📄 → `document-text-outline`, JSX + container style) and duplicate-row
  `checkbox` mark (✓ → `checkmark`, icon swap only); LoansScreen's
  `simulatorButton` (📊 → `stats-chart-outline`, JSX + container style)
  and `paymentRemoveBtn` (✕ → `close`, icon swap only); IncomeScreen's
  `paymentLogRemoveBtn` (× → `close`, red color preserved, icon swap
  only); SavingsScreen's `contribRemoveButton` (✕ → `close`, icon swap
  only). Old `*Text`-only styles (`checkboxMark`, `paymentRemoveBtnText`,
  `paymentLogRemoveText`, `contribRemoveButtonText`) left in place,
  harmless, per the established convention.
- `npx tsc --noEmit` [PENDING — person to run after pasting all 5 files].
- On-device testing explicitly deferred — see ⚠️ Known issues and
  ▶️ Next step.

### Session — B2.3 batch 3, Pass 2 build (Planning & checklists: Events, Goals, Groceries, Travel)
- Wrote an Antigravity investigation-only prompt for B2.3 batch 3, Pass 2:
  the character/emoji cleanup pass for EventsScreen, GoalsScreen,
  GroceriesScreen, and TravelScreen.
- Antigravity's investigation found no emoji in any of the 4 files, and
  turned up 2 raw `✕` delete buttons (GroceriesScreen's calculator row,
  TravelScreen's checklist row), a raw `✓` inside TravelScreen's custom
  checklist checkbox, and 4 ad hoc "✓ [status text]" toggles (Events'
  "Completed" and "Auto-saving" toggles, Goals' "Completed" toggle,
  Groceries' "Marked as bought" toggle). It also flagged that
  TravelScreen's own "Auto-saving" toggle does NOT currently use a "✓"
  text character at all — it already has a separate dot-indicator `View`
  instead, confirming the swap-to-checkmark decision already recorded in
  PROGRESS3.md rather than uncovering a new inconsistency. Confirmed
  none of the 4 files import Ionicons yet. Card-title inline checkmarks
  on EventsScreen/GoalsScreen were reconfirmed as deferred to batch 3b,
  not touched this pass.
- Reviewed and decided: use `close` (not `close-circle`) for both raw-✕
  delete buttons, consistent with Pass 1/batch 3's reasoning (both
  containers are already circles); use a real `Ionicons checkmark` for
  every "✓ [status]" toggle instead of the raw character; for the 4
  single-`<Text>` toggles (Events' 2, Goals' 1, Groceries' 1), the
  container style needs `flexDirection: 'row'` + `justifyContent:
  'center'` added so the new icon sits beside the text instead of
  stacking under it (TravelScreen's own toggle already had
  `flexDirection: 'row'`, so no style change was needed there — just the
  dot `View` swapped for a conditional Ionicons checkmark).
- Gave the person paste/replace snippets for all 4 files: added the
  `Ionicons` import to each; EventsScreen's `trackSavingsToggle` and
  `completedToggle` (JSX + container styles); GoalsScreen's
  `completedToggle` (JSX + container style); GroceriesScreen's
  `calcRemoveButton` (icon swap) and `purchasedToggle` (JSX + container
  style); TravelScreen's `removeItemButton` (icon swap), checklist
  `checkbox` mark (icon swap), and `trackToggle` (dot → checkmark swap,
  no style change). Old `*ToggleText`-only styling and now-unused
  `checkboxMark`/`trackToggleDot`/`trackToggleDotActive` styles left in
  place, harmless, per the established convention.
- `npx tsc --noEmit` [PENDING — person to run after pasting all 4 files].
- On-device testing explicitly deferred — see ⚠️ Known issues and
  ▶️ Next step.

### Session — B2.3 batch 3, Pass 1 build (Calendar + report year-nav chevrons)
- Wrote an Antigravity investigation-only prompt for B2.3 batch 3: the
  character/emoji cleanup pass — swapping raw characters (‹ › ✕ × ▲ ▼ ›)
  and emoji (📊 📎 📄 📋 🔄 ⚠️) for real Ionicons across all flagged
  screens, plus the ad hoc "✓" characters inside status toggle text.
- Antigravity's investigation covered all 17 flagged files in one pass
  and flagged real trade-offs: (1) Groceries/Travel/Savings' delete
  buttons already render inside a circular container, so using
  `close-circle` there would create a visible double-circle — `close`
  (no circle) is correct everywhere instead; (2) IncomeScreen's delete
  icon uses an intentional red accent (`#e5484d`) distinct from the
  other 4 screens' muted ink color; (3) TravelScreen's "Auto-saving"
  toggle uses a plain `<View>` dot indicator, not a text "✓" character,
  unlike the otherwise-identical toggle on EventsScreen; (4) none of the
  17 files currently import Ionicons at all; (5) several additional "✓"
  occurrences exist beyond the original flagged list (card-title inline
  checkmarks on EventsScreen/GoalsScreen, "Copied! ✓"/"Saved ✓" button
  text, a "✓ New Owner" badge) that weren't part of the original scope.
- Reviewed and decided: keep `close` (not `close-circle`) consistently
  across all 5 delete-button screens per Antigravity's flag; keep
  IncomeScreen's red delete icon as an intentional distinction, not an
  inconsistency to fix; replace TravelScreen's dot indicator with the
  same checkmark pattern as EventsScreen for consistency now that the
  pattern is being touched everywhere else; use solid chevron glyphs
  (not `-outline`) to match existing `fontWeight: 600/700` visual
  weight. Explicitly deferred the newly-discovered extra "✓" occurrences
  (card-title checkmarks, "Copied!"/"Saved ✓" button text, "New Owner"
  badge) to a new follow-up batch (3b) rather than folding them into this
  pass's scope.
- Split the work into 4 domain-clustered passes to keep each review/paste
  cycle manageable: Pass 1 (navigation & reports, 3 files), Pass 2
  (planning & checklists, 4 files), Pass 3 (transactions & money flows,
  5 files), Pass 4 (auth, security & profile, 5 files).
- Gave the person paste/replace snippets for Pass 1: `CalendarScreen.tsx`
  (month nav ‹ › → `chevron-back`/`chevron-forward`, size 20), 
  `YearInReviewReport.tsx` and `TaxSummaryReport.tsx` (year nav ‹ › →
  same chevrons, size 18) — each file also needed a new `Ionicons` import
  added, since none of the 17 files had it. Old `*NavButtonText`/
  `yearNavBtnText` styles left in place as unused.
- Person applied all 3 files. `npx tsc --noEmit` run from `mobile-app\`
  — clean, no errors.
- On-device testing explicitly deferred to a later session — see
  ⚠️ Known issues and ▶️ Next step.

### Session — B2.3 batch 2 build (ToPayScreen + PlanningScreen icon sub-tabs)
- Wrote an Antigravity investigation-only prompt for B2.3 batch 2,
  covering all 5 remaining segmented-pill screens: ToPayScreen,
  PlanningScreen, InsightsScreen, SavingsScreen, GroceriesScreen.
- Antigravity's investigation flagged real trade-offs on 3 of the 5:
  InsightsScreen's Dashboard/Reports pills would visually stack directly
  above ReportsScreen's own row of 9 icon pills; SavingsScreen's
  "Emergency Fund" and "FI Calculator" don't have icons that read clearly
  without already knowing what they mean; GroceriesScreen's 2-way toggle
  already reads fine as text with no real gain from converting.
- Reviewed each flag and decided: ToPayScreen and PlanningScreen convert
  to icons as planned (no real objections on either). InsightsScreen,
  SavingsScreen, and GroceriesScreen are reclassified from ICONIZE to
  KEEP AS TEXT in the B2.2 audit — converting them would hurt scannability
  or lose a currently-working full-width layout for no benefit.
- Gave the person paste/replace snippets for `ToPayScreen.tsx` (tabs array
  with icon field: receipt-outline/card-outline/business-outline; pill
  JSX swapped to IconLabelHint; pill styles converted to fixed 38×38
  circles) and `PlanningScreen.tsx` (tabs array with icon field:
  cart-outline/airplane-outline/balloon-outline/flag-outline; same JSX
  and style swap).
- Person applied both files' snippets, then hit 2 compile errors on
  `npx tsc --noEmit`: PlanningScreen was missing its `IconLabelHint`/
  `Ionicons` imports (flagged as "add if not already present" instead of
  given as an exact snippet — gap in the original instructions), and
  ToPayScreen's `ToPayScreenProps` type was undefined — it had been used
  in the function signature all along but was never actually declared
  anywhere in the file. Fixed both: added the two missing import lines to
  PlanningScreen, and added an inline `interface ToPayScreenProps {
  initialOpenBillId?: string; }` to ToPayScreen just above its component
  function.
- `npx tsc --noEmit` re-run after both fixes — clean, no errors.
- On-device testing explicitly deferred — see ⚠️ Known issues and
  ▶️ Next step.

### Session — B2.3 batch 1 build (ReportsScreen icon sub-tabs)
- Wrote an Antigravity investigation-only prompt for B2.3 batch 1: convert
  ReportsScreen.tsx's 9 report sub-tab pills (currently text pills in a
  horizontal ScrollView) to icon-only pills using IconLabelHint.
- Antigravity's investigation confirmed the real current code: tabs are
  defined as a `{ id, label }[]` array (`REPORT_TABS`), selection tracked
  via `activeReport` state, active pill marked via `pillActive`/
  `pillTextActive` style swaps (gold background, dark text). Confirmed
  IconLabelHint's props signature is unchanged since B2.1.
- Reviewed Antigravity's proposal: all 9 icon picks were reasonable;
  swapped "Year in Review" from the proposed `sparkles-outline` to the
  offered alternative `trophy-outline` (reads more clearly as an annual
  recap/achievement rather than a generic "new/AI" icon). Confirmed
  IconLabelHint does NOT need a "selected" prop added — wrapping it in a
  `View` carrying the active pill background and passing a different
  `color` down is the right approach, consistent with how B2.1 wired it
  into AccountsScreen. Kept the label reveal position as `"above"`
  (Antigravity had proposed `"below"`) since these pills sit above the
  report content with nothing below them to collide with, and `"above"`
  matches the existing AccountsScreen precedent.
- Confirmed via screen-width math that the horizontal ScrollView must
  stay — 9 icon pills at an accessible tap size (~38pt circles) total
  ~434pt of content width, which exceeds a 360–393pt phone screen even
  before padding/gaps.
- Gave the person 3 paste/replace snippets for `ReportsScreen.tsx`: (1)
  add `IconLabelHint`/`Ionicons` imports and convert `REPORT_TABS` to
  include an `icon: keyof typeof Ionicons.glyphMap` field per tab, using
  the 9 confirmed icon names; (2) replace the `.map()` pill JSX to render
  each pill as a `View` + `IconLabelHint` instead of `TouchableOpacity` +
  `Text`; (3) replace the `pill`/`pillActive` styles with fixed-size
  circle styles (38×38, `borderRadius: 19`) and flagged `pillText`/
  `pillTextActive` as now-unused (left in place, harmless, cleanup
  optional).
- Person applied all 3 snippets by hand. `npx tsc --noEmit` run from
  `mobile-app\` — clean, no errors.
- On-device testing explicitly deferred by the person to a later session
  — see ⚠️ Known issues and ▶️ Next step.

### Session — B2.1 build (IconLabelHint component)
- Wrote an Antigravity investigation-only prompt for B2.1. Antigravity
  confirmed the project's existing conventions: Ionicons icon library,
  useTheme()/makeStyles(colors) for styling, no animation library beyond
  the base React Native Animated API, no existing tooltip/popover pattern
  to reuse.
- Reviewed Antigravity's proposed draft and fixed two real issues before
  finalizing: (1) it used `NodeJS.Timeout` as a type, which doesn't
  resolve in this project (no @types/node installed) — swapped to
  `ReturnType<typeof setTimeout>`; (2) it rendered the tooltip at a
  guessed size before measuring the real one, which would visibly jump
  for longer labels — restructured to measure invisibly first, then fade
  in only once the real size/position is known.
- Created `mobile-app/src/components/IconLabelHint.tsx` (new file) — a
  reusable component: icon-only by default, quick tap OR long-press
  reveals a floating label that auto-fades (~2.4s default) or dismisses
  early on an outside tap. Uses a transparent Modal to escape parent
  overflow clipping.
- Wired it into `mobile-app/src/screens/AccountsScreen.tsx`'s existing
  Cards/List view-mode toggle buttons as a real, working test spot —
  the toggle still functions exactly as before, plus now also shows a
  floating label on tap/long-press.
- `npx tsc --noEmit` run — clean, no errors.
- On-device testing (the 5-point checklist) explicitly deferred by the
  person to a later session — see ⚠️ Known issues and ▶️ Next step above.

✅ Carried forward from PROGRESS2.md — still true, not yet re-verified this file
- All of Phase B's checkpoints (B.1 through B.14) are CODE-COMPLETE and
  `npx tsc --noEmit` clean. Full build detail for each lives in PROGRESS2.md.
- Everything B.4b and earlier (B.1–B.4b, plus B.5's UI/UX Batch 1/2/Calendar
  work, plus B.6's date-field rollout) has ALREADY been verified on a real
  device once, in PROGRESS2.md's own "full on-device testing pass" session —
  see PROGRESS2.md for the full checklist of what was confirmed working, and
  the 7 real bugs that pass found (6 fixed and code-complete, 1 documented as
  an accepted Android platform limitation — Calendar's native date-picker
  styling).
- Everything from B.7 onward (B.7, B.8, B.9, B.10, B.11, B.12a, B.13a, B.13b,
  B.14, plus the post-B.14 audit's 4 must-fix bugs and 6 lower-priority
  fixes) is CODE-COMPLETE but has NEVER been tested on a real device yet —
  this is the main outstanding work this file exists to track.
- B.12b (pension/Social Security offset, multi-account selector, and a
  possible scenario-comparison modal for the FI calculator) was explicitly
  deferred and remains UNBUILT.

📌 Decisions carried forward from PROGRESS2.md — still active
- Always retrieve/view exact current file contents before writing code;
  confirm design decisions before writing code; review real diffs before
  committing.
- PowerShell here-strings only, never bash heredoc syntax, for this project.
- Insist on real command output/diffs from Antigravity, not narrative
  summaries — Antigravity is investigation-only unless a change is large and
  well-reviewed enough to justify applying+committing directly (never
  pushing — the person always runs `git push` themselves).
- Close/Save All open VS Code tabs before any commit, including
  PROGRESS-file-only commits — a routine checkpoint commit has silently
  reverted real code twice in this project's history when a tab was left
  open with stale content.
- After any round of fixes, independently re-verify against real, current
  code before considering it done — don't trust progress-log claims or
  commit messages alone.
- Never hand the person a conditional/branching instruction ("if the file
  says X do Y, otherwise do Z") — get the real answer via investigation
  first, then give one unconditional fix.
- For any fix small enough to hand-paste, the person applies it directly
  and runs git themselves; Antigravity applying+committing directly is
  reserved for large, well-reviewed, scattered multi-file changes.
- Orphaned `households/{householdId}` Firestore documents from abandoned
  link codes are a known, accepted limitation — deferred, needs server-side
  cleanup, not a client patch.
- Testing has been running in **batched mode** since partway through Phase
  B (build several checkpoints back-to-back, `npx tsc --noEmit` after each,
  defer on-device testing until a consolidated pass) — this was an explicit,
  informed trade-off. Now that every original Phase B checkpoint is
  code-complete, **this file's first job is running that consolidated
  on-device pass** for everything from B.7 onward.

⚠️ Known issues / gotchas — the on-device testing checklist to run through
Everything below is CODE-COMPLETE and `npx tsc --noEmit` clean, but UNTESTED
on a real device. This is the priority list for this file's first session.

- **B.7 "Left to Spend" hero stat + Settings caution threshold.** Check: the
  Settings number field saves/persists (and syncs to a 2nd linked device, if
  available); the Home hero card shows the right amount, right red/orange/
  green color, right "until payday" vs. "through end of month" caption; the
  end-of-month fallback and the earliest-of-multiple-paydays logic both work.
- **B.8 Category Watchlist.** Check: adding/removing a watched category +
  limit in Settings; the Dashboard card appears/disappears correctly and
  shows correct spend-vs-limit; red/orange/green thresholds trigger at the
  right spend percentages.
- **B.9 Yours/Mine/Ours + transaction Notes.** Check: the "Which of these is
  you?" picker on ProfileScreen saves/persists and shows the right person on
  reopen; a transaction shows "Mine" on your device and your real name on a
  linked device; shared transactions show "Ours"; Person Spending report
  labels match; the Notes field saves/edits/displays correctly. Known,
  accepted gap (not a bug): the picker only exists inside ProfileScreen's
  "Linked" section, so a solo/unlinked profile can't set "which person is me"
  yet.
- **B.10 Refund tracker.** Check: the "Expecting a refund?" toggle only shows
  on money-out transactions and disappears once refunded; partial refund
  amounts save/display; Mark as Received creates a real linked income
  transaction and updates totals; Undo removes it and reverts the badge;
  deleting an already-refunded expense cleans up its linked transaction too.
- **B.11 Weekly spending recap.** Check: toggle on/off persists; the Sun–Sat
  day pills render with correct selected styling; the hour input saves; and
  — hardest to verify, needs an actual wait — the notification fires at the
  chosen day/hour with a total matching the Weekly Digest report.
- **B.12a Expanded FI calculator.** Check: the SWR preset/Custom pill row;
  net-worth and monthly-savings suggestion rows; the Years Until FI result
  appearing/disappearing correctly based on inputs filled in; the show/hide
  projected-date toggle; Save persisting all 3 new fields.
- **B.13a/B.13b Tags + report filtering.** Check: a comma-separated tag saves
  on a new transaction and re-populates correctly on edit, with extra
  spaces/empty entries trimmed; the tag-pill toolbar appears ONLY on Monthly
  Close-out, Year in Review, Person Spending, Weekly Digest, Merchant
  Spending, and Tax Summary (never on Cash-Flow Forecast, Subscription
  Audit, or Payment Methods) and only when at least one tag exists anywhere;
  selecting a tag narrows each report correctly; "All" clears the filter.
- **B.14 Subscription cancel-reminder.** Check: the "This is a subscription"
  toggle saves/persists/re-populates on edit; the SUB/CANCELLED badge shows
  correctly; Keep/Cancel/Reactivate work (with the Cancel confirmation
  dialog); the reminder fires with correct name/date/amount wording; tapping
  it while backgrounded navigates to Bills (live-listener path); tapping it
  while the app was fully closed ALSO navigates to Bills once signed in
  (cold-start path — the harder case, worth deliberately testing rather than
  assuming it works); a normal bill-due notification tap does NOT trigger
  any navigation.
- **Post-B.14 audit's 4 must-fix bugs.** Check: a bill's subscription toggle
  actually persists through save now; tapping a subscription reminder
  correctly switches the bottom tab bar to To-Pay before opening the bill;
  turning off "Bill reminders" no longer also silently turns off "Weekly
  recap"; an older/legacy profile missing `income` or `categoryBudgets`
  no longer crashes Home/Dashboard on load (hardest to verify without an
  actual legacy profile on hand).
- **Post-B.14 audit's 6 lower-priority fixes** (delete try/catch on
  Accounts/Bills/Debts, the duplicate-notification fix for subscription
  bills, and Alert-confirm on the 3 Settings mini-form deletes) — lower
  risk, but still unverified on-device.
- **B2.1 IconLabelHint component — on-device testing deferred.** Code is
  complete and `npx tsc --noEmit` clean, wired into AccountsScreen's
  Cards/List view toggle as a real test spot. NOT yet tested on a real
  device. When ready, check all five: (1) quick tap on Cards icon switches
  view AND briefly shows "Stacked card view" label; (2) quick tap on List
  icon switches view AND shows "List card view" label; (3) long-press on
  either icon shows the label WITHOUT switching the view; (4) tapping
  elsewhere while a label is showing dismisses it early instead of waiting
  out the ~2.4s auto-fade; (5) label never gets visually clipped at the
  screen edge. Also flagged during review: this component uses a
  transparent Modal to escape card overflow clipping — if an icon using
  this component ever ends up living inside an already-open BottomSheet
  (also a Modal) in a later batch, watch for Android-specific flakiness
  (two native Modals open at once is a known trouble spot); no fix needed
  unless that combination is actually hit.
- **Swipe-to-delete toggle, checkpoint 3 of 3 (complete) — wired into
  Goals/Events/Travel/Groceries/Accounts — on-device testing
  deferred.** Code is complete and `npx tsc --noEmit` clean: GoalsScreen,
  EventsScreen, TravelScreen (top-level trip rows only), GroceriesScreen
  (main Grocery List tab only), and AccountsScreen (flat/list rows only)
  now each wrap their row in `SwipeableRow`, reading the same
  `model.settings.swipeToDeleteEnabled` setting as checkpoints 1 and 2
  (still defaults to `false`). Each screen has its own new by-id delete
  path used only by the swipe gesture; every existing modal Delete
  button is untouched. Deliberately NOT wrapped: TravelScreen's
  checklist items nested inside a trip's edit modal, GroceriesScreen's
  Calculator-tab entries (both already have their own inline "X" delete
  button in the row), and AccountsScreen's stacked overlapping cards
  (`isStackedSection` true — these have negative overlapping margins and
  dynamic z-index tied to which card is expanded, so swipe wasn't added
  there this pass; tapping a stacked card still opens the edit modal's
  own Delete button). NOT yet tested on a real device. When ready, with
  "Swipe to delete" turned ON in Settings, check on EACH of the 5
  screens: (1) swiping a row left reveals the red delete action and
  tapping it deletes that exact row after the same confirmation dialog
  the modal's Delete button shows; (2) tapping a row (not swiping) still
  opens it into its normal expand/edit view exactly as before; (3) with
  "Tap to open" selected instead in Settings, swiping a row does nothing
  at all. Also check: (4) deleting an event or trip via swipe correctly
  removes its linked savings goal and/or linked expense transaction(s)
  too, same as the modal's Delete button already does; (5) TravelScreen's
  nested checklist items and GroceriesScreen's Calculator-tab rows are
  unaffected by the swipe setting either way; (6) on AccountsScreen
  specifically — a section with 2+ accounts in Stacked view mode shows
  NO swipe-to-delete on any of its cards (tap-to-expand, then tap again
  to open the edit modal, exactly as before), while a section with only
  0–1 accounts, or the whole screen switched to List view mode, DOES
  show swipe-to-delete on those flat rows; switching between Stacked and
  List view mode doesn't break or duplicate any row.
- **Swipe-to-delete toggle, checkpoint 2 of 3 — wired into
  CollapsibleRow's 6 screens — on-device testing deferred.** Code is
  complete and `npx tsc --noEmit` clean: Bills, Debts, Income, Loans,
  Savings, and Transactions now each wrap their CollapsibleRow rows in
  `SwipeableRow`, reading `model.settings.swipeToDeleteEnabled` (still
  defaults to `false`, so nothing changes for anyone who hasn't opted in
  via Settings → List Rows). Each screen has its own new by-id delete
  path used only by the swipe gesture; the existing modal Delete button
  is untouched and still works the old way. NOT yet tested on a real
  device. When ready, with "Swipe to delete" turned ON in Settings,
  check on EACH of the 6 screens: (1) swiping a row left reveals the red
  delete action and tapping it deletes that exact row (not a
  neighboring one) after the same confirmation dialog the modal's
  Delete button shows; (2) tapping a row (not swiping) still opens it
  into its normal expand/edit view exactly as before; (3) with "Tap to
  open" selected instead in Settings, swiping a row does nothing at
  all — it should feel like the feature isn't there. Also check on
  TransactionsScreen specifically: (4) swiping a non-manual row (a
  bill/debt/loan/income/savings-derived entry) does nothing, since only
  manual transactions are deletable there; (5) deleting a manual
  transaction that has a linked refund transaction via swipe removes
  both, same as the modal's Delete button already does.
- **Swipe-to-delete toggle + Settings preview (checkpoint 1 of 3) —
  on-device testing deferred, plus a new native dependency added.**
  Code is complete and `npx tsc --noEmit` clean:
  `react-native-gesture-handler` was installed and `App.tsx`'s root is
  now wrapped in `GestureHandlerRootView`; a new "List Rows" section in
  Settings lets the person choose "Swipe to delete" vs. "Tap to open"
  (defaults to Tap, so no existing behavior changes until someone opts
  in), with a live looping preview animation for whichever option is
  selected. NOTHING is wired into any real list yet — `SwipeableRow`
  exists as a standalone component but isn't used by `CollapsibleRow`
  or any screen. NOT yet tested on a real device. Since this is the
  first time a native gesture module has been added to the project,
  test on BOTH platforms if possible, and check: (1) the app actually
  launches without a red error screen or crash on startup (this is the
  main risk — a missing/misordered gesture-handler import at the top of
  `index.js` is a known cause of silent native crashes); (2) Settings →
  "List Rows" section renders with both pill options and the preview
  box; (3) tapping "Swipe to delete" switches the preview to the
  slide-left-reveal-delete animation, and tapping "Tap to open" switches
  it to the expand-open-reveal-delete-button animation, looping
  correctly either way; (4) the choice persists after closing and
  reopening Settings (and syncs to a linked device, if available); (5)
  every existing screen's real delete flow (tap → modal → Delete) still
  works completely unchanged, since nothing was wired up this checkpoint.
- **B2.3 batch 3, Pass 1 — Calendar + report year-nav chevrons — on-device
  testing deferred.** Code is complete and `npx tsc --noEmit` clean:
  CalendarScreen's month-nav buttons and YearInReviewReport's/
  TaxSummaryReport's year-nav buttons now render real Ionicons chevrons
  (`chevron-back`/`chevron-forward`) instead of raw `‹`/`›` text
  characters — pure visual swap, no behavior change. NOT yet tested on a
  real device. When ready, check: (1) chevrons render (no missing-glyph
  boxes) and look properly centered inside their circular buttons on
  both iOS and Android (this swap was specifically meant to fix a known
  Android baseline-offset quirk with text characters, so pay attention
  to vertical centering there); (2) tapping still navigates
  prev/next month or year correctly on all 3 screens; (3) chevron size/
  weight looks visually consistent with the rest of each screen (20pt on
  Calendar, 18pt on the two reports).
- **B2.3 batch 3, Pass 2 — Events/Goals/Groceries/Travel character
  cleanup — on-device testing deferred.** Code is complete
  [`npx tsc --noEmit` status: PENDING — confirm clean after pasting].
  EventsScreen's "Completed" and "Auto-saving" toggles, GoalsScreen's
  "Completed" toggle, and GroceriesScreen's "Marked as bought" toggle now
  show a real Ionicons checkmark instead of an embedded "✓" text
  character; GroceriesScreen's calculator-row delete button and
  TravelScreen's checklist-row delete button now use an Ionicons close
  icon instead of a raw "✕"; TravelScreen's checklist checkbox mark and
  its own "Auto-saving" toggle indicator (previously a plain dot `View`)
  now both use a real Ionicons checkmark too. Pure visual swap, no
  behavior change. NOT yet tested on a real device. When ready, check:
  (1) all 4 toggles show the checkmark icon centered beside its text
  when active, and no icon (just text) when inactive, with nothing
  misaligned or wrapping oddly; (2) tapping each toggle still flips its
  state correctly; (3) both delete buttons still delete the right
  row and the close icon is visually centered inside its circular
  button; (4) TravelScreen's checklist checkbox still toggles
  checked/unchecked correctly and the checkmark is centered inside the
  gold box; (5) TravelScreen's "Auto-saving" toggle checkmark color/
  visibility looks right in both light and dark mode, since it uses
  `colors.accent` rather than a fixed hex like the other 3 toggles.
- **B2.3 batch 3, Pass 3 — Transactions/CsvImport/Loans/Income/Savings
  character cleanup — on-device testing deferred.** Code is complete
  [`npx tsc --noEmit` status: PENDING — confirm clean after pasting].
  TransactionsScreen's attach-receipt button and refund-tracking toggle,
  CsvImportModal's choose-file button and duplicate-row checkbox mark,
  and LoansScreen's Payoff Simulator button now show real Ionicons
  instead of embedded emoji/"✓" characters; LoansScreen's, IncomeScreen's,
  and SavingsScreen's payment/contribution-row delete buttons now use an
  Ionicons close icon instead of a raw "✕"/"×". Pure visual swap, no
  behavior change. NOT yet tested on a real device. When ready, check:
  (1) the attach-receipt and refund-toggle icons on TransactionsScreen
  render correctly and the refund checkmark only shows when the toggle
  is active; (2) CsvImportModal's file-picker icon shows in both the
  "Choose a CSV file" and "Change file (...)" states, and the duplicate-
  row checkmark is centered inside its checkbox; (3) LoansScreen's
  simulator button icon renders and its payment-row delete button still
  removes the right row; (4) IncomeScreen's payday-log delete button
  still removes the right row and keeps its red accent color;  (5) SavingsScreen's contribution-row delete button still removes the right
  row and the icon is centered inside its circular button.
- **B2.3 batch 3, Pass 4 — Auth/security/profile character cleanup —
  on-device testing deferred.** Code is complete
  [`npx tsc --noEmit` status: PENDING — confirm clean after pasting].
  SignInScreen's revoked-session banner now shows real Ionicons
  (`warning-outline`, `close`) instead of embedded "⚠️"/"✕" characters;
  CreateProfileScreen's copy-recovery-key button and recovery-key-saved
  checkbox now use `copy-outline`/`checkmark` instead of "📋"/"✓";
  PinUnlockScreen's retry-biometric button now uses `refresh-outline`
  instead of "🔄"; ProfileScreen's 2 shortcut-row chevrons, peer-recovery
  banner, and "✓ Linked" badge now use `chevron-forward`, `warning-
  outline`, and a real checkmark instead of "›", "⚠️", and embedded "✓";
  SettingsScreen's profile-card chevron, categorization-rule reorder
  buttons, and copy-recovery-key button now use `chevron-forward`,
  `chevron-up`/`chevron-down`, and `copy-outline` instead of "›", "▲"/
  "▼", and "📋". Pure visual swap, no behavior change. NOT yet tested on
  a real device. When ready, check: (1) SignInScreen's revoked-session
  banner still dismisses correctly and both icons render with the right
  red tone; (2) CreateProfileScreen's copy button still copies the
  recovery key to clipboard and the icon disappears once "Copied!"
  shows; the checkbox toggle still saves/unsaves correctly with the
  checkmark centered; (3) PinUnlockScreen's retry button still triggers
  biometric auth again; (4) ProfileScreen's 2 shortcut rows still
  navigate to Settings, the peer-recovery banner icon/text align
  correctly when a recovery request is pending, and the "Linked" badge
  reads correctly with the checkmark beside it (not above/below); (5)
  SettingsScreen's profile card still navigates to ProfileScreen, the
  reorder buttons still move categorization rules up/down (with the
  disabled end correctly dimmed), and the copy button behaves the same
  as CreateProfileScreen's.
- **B2.3 batch 3b — follow-up "✓" cleanup (Events/Goals title checkmarks,
  CreateProfile/Settings copy-button "Copied!" state, Savings "Saved"
  button, Profile "New Owner" badge) — on-device testing deferred.** Code
  is complete and `npx tsc --noEmit` clean. Pure visual swap, no behavior
  change. NOT yet tested on a real device. When ready, check: (1)
  EventsScreen's and GoalsScreen's completed-item rows show a green
  checkmark-circle beside the title (not overlapping or wrapping oddly),
  and a long title still truncates with the icon visible; (2)
  CreateProfileScreen's and SettingsScreen's copy-recovery-key buttons
  still copy correctly, and the icon switches from copy-outline to a
  checkmark once copied, reverting back after the 2-second timeout; (3)
  SavingsScreen's FI Calculator save button still saves correctly and
  shows a checkmark beside "Saved" instead of "Save" once done; (4)
  ProfileScreen's transfer-ownership modal still lets you pick a new
  owner, and the selected row shows a checkmark + "New Owner" text
  instead of a stacked/overlapping badge.
- **B2.3 batch 2 — ToPayScreen + PlanningScreen icon sub-tabs — on-device
  testing deferred.** Code is complete and `npx tsc --noEmit` clean:
  ToPayScreen's Bills/Debts/Loans pills and PlanningScreen's Groceries/
  Travel/Events/Goals pills now render as icon-only circular pills.
  InsightsScreen, SavingsScreen, and GroceriesScreen were reclassified to
  KEEP AS TEXT during this batch (see the B2.2 audit results section,
  which has been updated to reflect this) and were NOT converted. NOT
  yet tested on a real device. When ready, check: (1) all icons render
  correctly on both screens (receipt/card/business for ToPayScreen;
  cart/airplane/balloon/flag for PlanningScreen); (2) tapping a pill
  switches the sub-tab AND briefly shows its floating label; (3) the
  active pill is gold with a dark icon, inactive pills are dim; (4)
  long-press shows the label without switching tabs; (5) since neither
  row scrolls (3 and 4 items respectively, not 9 like ReportsScreen),
  confirm the row doesn't look awkwardly sparse/empty now that the pills
  are narrow icon circles instead of full-width text pills — flagged as a
  possible visual follow-up, not a functional bug.
- **B2.3 batch 1 — ReportsScreen icon sub-tabs — on-device testing
  deferred.** Code is complete and `npx tsc --noEmit` clean: all 9 report
  sub-tabs (Monthly Close-out, Year in Review, Cash-Flow Forecast, Person
  Spending, Weekly Digest, Merchant Spending, Subscription Audit, Tax
  Summary, Payment Methods) now render as icon-only circular pills instead
  of text pills. NOT yet tested on a real device. When ready, check: (1)
  all 9 icons render (no missing-glyph boxes) and are visually distinct
  from each other; (2) tapping a pill switches to that report AND briefly
  shows its floating label (e.g. tapping the trophy icon opens Year in
  Review and shows "Year in Review"); (3) the active/selected pill is
  clearly gold with a dark icon, inactive pills are the dim navy/gray
  circle; (4) long-pressing a pill shows its label WITHOUT switching the
  active report; (5) the row still scrolls horizontally and no pill gets
  clipped at either screen edge; (6) labels don't get cut off or overlap
  neighboring pills when shown.

▶️ Next step
- Test the full swipe-to-delete feature on a real device — checkpoints
  1, 2, and 3 (all now code-complete) can be tested together in one
  pass, since they all depend on checkpoint 1's native gesture-handler
  setup actually working. See both checklists under ⚠️ Known issues
  above (checkpoint 1+2's combined checklist, and checkpoint 3's
  5-screen checklist including AccountsScreen's Stacked-vs-List check).
- Run the on-device testing checklist above, in whatever order is most
  convenient, and report back real bugs (with repro steps) as they're found
  — same investigate-with-real-code-first approach as always for any fix.
- Once that pass is done (or the person decides to move on regardless),
  next up is Phase C (Publishing) — see `4-REMAINING-WORK-ROADMAP.md`,
  Phase C: C.1 (EAS Build → real installable .apk/TestFlight link — this is
  also when the app migrates off Expo Go, unlocking the previously-parked
  Android home-screen widget feature) and, optionally, C.2 (App Store /
  Play Store publishing).
- B.12b (pension/Social Security offset, multi-account selector, possible
  scenario-comparison modal) remains an open, unscheduled item whenever the
  person wants to revisit it.
- Phase B Part 2 (Iconization & Minimalism Pass) is now planned — see its
  own section below. It starts once the on-device testing pass above is
  wrapped up, or whenever the person is ready to switch focus.
- B2.1 (IconLabelHint component) is code-complete and compiles clean, but
  its 5-point on-device test checklist (see ⚠️ Known issues above) has
  been explicitly deferred — run it whenever ready, alongside (or before)
  the larger B.7–B.14 on-device pass.
- B2.3 batch 1 (ReportsScreen's 9 report sub-tabs, iconized) is
  code-complete and compiles clean, but ALSO not yet tested on-device
  (see its 6-point checklist above) — it was built ahead of B2.1's own
  on-device confirmation since the person wanted to keep moving; both
  B2.1's and B2.3 batch 1's checklists should be run together in the same
  on-device session, since B2.3 batch 1 depends on B2.1's component
  actually working correctly.
- B2.3 batch 3 Passes 1–4 (all character/emoji cleanup) and batch 3b (the
  follow-up "✓" cleanup) are all code-complete and `npx tsc --noEmit`
  clean, but not yet tested on-device — see their checklists above. This
  completes the full batch 3 arc. Next up per the batch order is
  investigating BillsScreen's 7th "✓" occurrence (the subscription
  checkbox, spotted but not yet fully investigated during batch 3b), then
  CollapsibleRow "Edit" + AccountsScreen "Collapse" → icon-only, whenever
  ready to continue.

🎨 Phase B Part 2 — Iconization & Minimalism Pass (planned, not started)
Goal: reduce the app's reliance on text labels in favor of icons with a
tap/long-press-to-reveal label, and slim the bottom nav down to a small
set of core tabs. This is a new sub-phase of Phase B, layered on top of
the already-code-complete B.1–B.14 work above — nothing here removes or
replaces prior functionality, it's a visual/interaction pass.

📌 Decisions locked in for this sub-phase
- Label reveal mechanic: BOTH a quick tap and a long-press on an icon
  reveal its floating text label (fades/dismisses on its own or on next
  tap elsewhere). One reusable component, built once, used everywhere.
- Bottom nav core tabs (always visible): Home, Calendar, Transactions,
  To-Pay. Everything else (Accounts, Savings, Income, Insights, Planning,
  Settings) moves under "More." This mirrors a decision already made once
  in the original web app's own code (search "MF7" in
  household-finance-app.html for the original reasoning) and follows
  standard UI/UX principles for bottom-nav design: Fitts's Law/thumb-zone
  (put daily-use actions in the always-reachable row), Jakob's Law (match
  the pattern users already know from Mint/YNAB/GCash/banking apps), and
  Hick's Law (fewer always-visible choices = faster scanning). Open to
  revisiting if on-device use shows a different tab deserves the core row
  more than one of these four.
- B2.2 (the icon audit) will be done together, screen by screen, in its
  own dedicated session — not pre-drafted solo. Starting screen/order to
  be picked when that session happens.

▶️ Checkpoints
| Checkpoint | What happens | Done when |
|---|---|---|
| B2.1 | Build one reusable "icon + label" component: icon-only by default; a quick tap OR a long-press reveals a small floating label with the word. Built once, used everywhere. | ✅ CODE-COMPLETE, `npx tsc --noEmit` clean. Wired into AccountsScreen's Cards/List toggle as a real test spot. ⏳ On-device testing (5-point checklist below) deferred — not yet run. |
| B2.2 | Icon audit, done together in session — screen by screen, list every text label/button/section header that could become icon-only with the new component. Nothing changed yet, just a documented decision per item (iconize / keep as text / needs a new icon). | ✅ DONE. Full inventory + decisions recorded below under "B2.2 Audit Results." |
| B2.3+ | Apply the iconization from the B2.2 list, in small batches (1–2 screens per checkpoint) — swap text labels for the new component, add any new icons needed (matching the existing app's icon style). | Batch 1 (ReportsScreen's 9 report sub-tabs) is ✅ CODE-COMPLETE, `npx tsc --noEmit` clean, ⏳ on-device testing deferred. Remaining batches not yet started. |
| B2.X | Bottom nav redesign — down to Home/Calendar/Transactions/To-Pay always visible, everything else under "More." | Bottom nav shows only 4 tabs + More on a real device; every previously-reachable tab is still reachable via More. |
| B2.X | General "fewer words" pass — trim subtitles, hint text, and section descriptions wherever a shorter phrase or icon can say the same thing. | Each screen reviewed once; wordier bits trimmed/replaced without losing anything a first-time user needs to understand a field/button. |

- Person may add more items to this sub-phase's list before B2.1 starts —
  section will be finalized (and re-pasted here) once they say they're done.

📋 B2.2 Audit Results (finished audit — decision per pattern, applies to all 37 screens/modals)

Full raw inventory (every button/label/header/icon, file-by-file with line
numbers) was gathered via Antigravity investigation and is not reproduced
here in full — see chat history for that pass if needed. Decisions below
are by PATTERN (same decision applies everywhere that pattern occurs):

ICONIZE (target for B2.3+):
- Segmented sub-tab pills with 3+ options: ToPayScreen (Bills/Debts/Loans)
  — ✅ CODE-COMPLETE (batch 2), PlanningScreen (Groceries/Travel/Events/
  Goals) — ✅ CODE-COMPLETE (batch 2), ReportsScreen (9 report tabs) —
  ✅ CODE-COMPLETE (batch 1). Both batches' on-device testing still
  pending — see ⚠️ Known issues.
- Row-level icon+text actions: CollapsibleRow's "Edit" (pencil+text →
  icon-only), AccountsScreen's "Collapse" (chevron+text → icon-only).

CONVERT/CLEANUP (replace raw characters/emoji with real Ionicons, no
behavior change, no IconLabelHint reveal needed for the pure-navigation
ones like ‹ › since they're already universally understood):
- Raw single-character buttons: ‹ › (Calendar month nav, TaxSummaryReport/
  YearInReviewReport year nav), ✕ × (delete-row buttons across Loans,
  Groceries, Travel, Income, Savings), ▲ ▼ (SettingsScreen categorization
  rule reordering), › (ProfileScreen/SettingsScreen nav row chevrons).
- Emoji used as icons: 📊 (LoansScreen "View Payoff Simulator"), 📎
  (TransactionsScreen attach receipt), 📄 (CsvImportModal choose file),
  📋 (CreateProfileScreen/SettingsScreen copy recovery key), 🔄
  (PinUnlockScreen retry biometric), ⚠️ (SignInScreen/ProfileScreen
  warning banners).
- Ad hoc ✓ character inside dynamic status toggles (keep the TEXT, just
  swap the character for a real Ionicons checkmark): "✓ Completed"/"Not
  yet" (EventsScreen, GoalsScreen), "✓ Auto-saving..." (TravelScreen,
  EventsScreen), "✓ Marked as bought" (GroceriesScreen), refund tracking
  toggle (TransactionsScreen), "✓ Linked" badge (ProfileScreen).

KEEP AS TEXT (no change):
- InsightsScreen's Dashboard/Reports pills, SavingsScreen's Goals/
  Emergency Fund/FI Calculator pills, and GroceriesScreen's Grocery
  List/Calculator toggle — reclassified from ICONIZE during B2.3 batch
  2's review. InsightsScreen's pills would stack visually right above
  ReportsScreen's own row of 9 icon pills, hurting scannability;
  "Emergency Fund"/"FI Calculator" don't have icons that read clearly on
  their own; GroceriesScreen's 2-way toggle already works well as
  full-width text with nothing to gain from converting.
- All modal action buttons: Save / Cancel / "Delete this X" — appears in
  every screen's edit modal. Kept for clarity on often-irreversible
  actions; already full-width, no space to save.
- All "+ Add X" buttons — the word after "+" distinguishes what's being
  added when multiple "+" buttons appear on one screen.
- All form field labels (e.g. "Bill name", "Amount", "Interest rate") —
  a blank input needs a visible label; iconizing these would hurt
  usability, not help it.
- Recurring-type / priority / frequency / direction selector pills INSIDE
  a form (One-time/Monthly/Annual/Custom, Low/Medium/High, Borrowed/Lent,
  day-of-week pills) — user is actively choosing a value; text wins over
  learned icons here.
- Metric headers (TOTAL BALANCE, TOTAL BILLS, Amount Owed, etc.) — the
  actual numbers people check daily; flagged as a possible FUTURE
  redesign, explicitly out of scope for this straight icon-swap pass.
- Person/category/payee/tag chips showing real user-entered data — can't
  iconize actual names/text the person typed.
- All auth & security screens (SignIn, CreateProfile, Onboarding,
  PinUnlock, SetPin, recovery key flows) — rarely-seen, trust-critical;
  clarity matters more than icon economy here. Emoji-to-Ionicons cleanup
  still applies to these screens per the CONVERT section above.

ALREADY ICON-ONLY, NO CHANGE NEEDED:
- CollapsibleRow's plain expand/collapse chevron, PasswordField/PinField's
  eye-toggle icon, DateField's calendar/clear icons, AccountCard's
  wallet/card type badges, AccountsScreen's color swatch circles.

EXPLICITLY OUT OF SCOPE FOR B2.2/B2.3:
- Bottom nav tabs (MainTabs.tsx, 10 tabs, currently text-only) — tracked
  separately as its own checkpoint (see B2.X, bottom nav redesign, below)
  since it's a structural change (4 core tabs + "More"), not a straight
  icon swap.

▶️ B2.3+ batch order (once B2.1's on-device testing is confirmed):
1. ReportsScreen's 9 report sub-tabs — ✅ CODE-COMPLETE (batch 1),
   on-device testing pending.
2. ToPayScreen + PlanningScreen segmented pills — ✅ CODE-COMPLETE
   (batch 2), on-device testing pending. (InsightsScreen, SavingsScreen,
   GroceriesScreen reclassified to KEEP AS TEXT — see audit results.)
3. Character/emoji cleanup pass, split into 4 sub-passes:
   - Pass 1 (Calendar/YearInReview/TaxSummary chevrons) — ✅
     CODE-COMPLETE, on-device testing pending.
   - Pass 2 (Planning & checklists: EventsScreen, GoalsScreen,
     GroceriesScreen, TravelScreen) — ✅ CODE-COMPLETE (pending person's
     `npx tsc --noEmit` confirmation), on-device testing pending.
   - Pass 3 (Transactions & money flows: TransactionsScreen,
     CsvImportModal, LoansScreen, IncomeScreen, SavingsScreen) — ✅
     CODE-COMPLETE (pending person's `npx tsc --noEmit` confirmation),
     on-device testing pending.
   - Pass 4 (Auth, security & profile: SignInScreen, CreateProfileScreen,
     PinUnlockScreen, ProfileScreen, SettingsScreen) — ✅ CODE-COMPLETE
     (pending person's `npx tsc --noEmit` confirmation), on-device
     testing pending.
4. CollapsibleRow "Edit" + AccountsScreen "Collapse" → icon-only.
5. Batch 3b (follow-up "✓" cleanup) — ✅ CODE-COMPLETE, `npx tsc --noEmit`
   clean, on-device testing pending. Covered EventsScreen/GoalsScreen's
   inline card-title checkmark, "Copied! ✓" (CreateProfileScreen,
   SettingsScreen) / "Saved ✓" (SavingsScreen) button text, and
   ProfileScreen's "✓ New Owner" badge in the transfer-owner modal. A 7th,
   out-of-scope "✓" was spotted inside BillsScreen's subscription
   checkbox during this pass's investigation — not yet investigated in
   full, needs its own follow-up prompt before a fix is written.

📁 Files in the repo
See PROGRESS2.md's own "Files in the repo" section for the full inventory
through the end of Phase B. New/modified files tracked in this file from
here on:
- NEW: `mobile-app/src/components/IconLabelHint.tsx` — reusable icon +
  tap/long-press-to-reveal-label component (B2.1).
- MODIFIED: `mobile-app/src/screens/AccountsScreen.tsx` — Cards/List view
  toggle buttons now use IconLabelHint as a real test spot for B2.1;
  behavior unchanged, plus tap/long-press now also shows a floating label.
- MODIFIED: `mobile-app/src/screens/ReportsScreen.tsx` — the 9 report
  sub-tab pills now render as icon-only circles using IconLabelHint
  instead of text pills (B2.3 batch 1); `REPORT_TABS` array gained an
  `icon` field per tab; `pillText`/`pillTextActive` styles are now unused
  but left in place.
- MODIFIED: `mobile-app/src/screens/ToPayScreen.tsx` — Bills/Debts/Loans
  sub-tab pills now render as icon-only circles using IconLabelHint
  (B2.3 batch 2); `TOPAY_TABS` array gained an `icon` field per tab;
  `switcherBtnText`/`switcherBtnTextActive` styles now unused but left in
  place; added a missing inline `ToPayScreenProps` interface declaration
  that the file's function signature had relied on without ever defining.
- MODIFIED: `mobile-app/src/screens/PlanningScreen.tsx` — Groceries/
  Travel/Events/Goals sub-tab pills now render as icon-only circles using
  IconLabelHint (B2.3 batch 2); `tabs` array gained an `icon` field per
  tab; `pillButtonText`/`pillButtonTextActive` styles now unused but left
  in place; added missing `IconLabelHint`/`Ionicons` imports.
- MODIFIED: `mobile-app/src/screens/CalendarScreen.tsx` — month-nav
  buttons now render `Ionicons` chevrons (`chevron-back`/
  `chevron-forward`, size 20) instead of raw `‹`/`›` text (B2.3 batch 3
  Pass 1); added `Ionicons` import; `navButtonText` style now unused but
  left in place.
- MODIFIED: `mobile-app/src/screens/reports/YearInReviewReport.tsx` —
  year-nav buttons now render `Ionicons` chevrons (size 18) instead of
  raw `‹`/`›` text (B2.3 batch 3 Pass 1); added `Ionicons` import;
  `yearNavBtnText` style now unused but left in place.
- MODIFIED: `mobile-app/src/screens/reports/TaxSummaryReport.tsx` —
  year-nav buttons now render `Ionicons` chevrons (size 18) instead of
  raw `‹`/`›` text (B2.3 batch 3 Pass 1); added `Ionicons` import;
  `yearNavBtnText` style now unused but left in place.

- MODIFIED: `mobile-app/src/screens/EventsScreen.tsx` — "Completed" and
  "Auto-saving to Savings tab" toggles now show a real Ionicons checkmark
  instead of an embedded "✓" text character (B2.3 batch 3 Pass 2); added
  `Ionicons` import; both toggle container styles gained `flexDirection:
  'row'` + `justifyContent: 'center'`.
- MODIFIED: `mobile-app/src/screens/GoalsScreen.tsx` — "Completed" toggle
  now shows a real Ionicons checkmark instead of an embedded "✓" text
  character (B2.3 batch 3 Pass 2); added `Ionicons` import; toggle
  container style gained `flexDirection: 'row'` + `justifyContent:
  'center'`.
- MODIFIED: `mobile-app/src/screens/GroceriesScreen.tsx` — calculator
  row's delete button now renders an Ionicons close icon instead of a
  raw "✕"; "Marked as bought" toggle now shows a real Ionicons checkmark
  instead of an embedded "✓" text character (B2.3 batch 3 Pass 2); added
  `Ionicons` import; toggle container style gained `flexDirection:
  'row'` + `justifyContent: 'center'`.
- MODIFIED: `mobile-app/src/screens/TravelScreen.tsx` — checklist row's
  delete button now renders an Ionicons close icon instead of a raw "✕";
  the checklist item checkbox mark now renders an Ionicons checkmark
  instead of a raw "✓"; the "Auto-saving to Savings tab" toggle's plain
  dot indicator `View` is replaced with a conditional Ionicons checkmark
  (B2.3 batch 3 Pass 2); added `Ionicons` import; `checkboxMark`/
  `trackToggleDot`/`trackToggleDotActive` styles now unused but left in
  place.

- MODIFIED: `mobile-app/src/screens/TransactionsScreen.tsx` — attach-
  receipt button and refund-tracking toggle now show real Ionicons
  instead of an embedded "📎"/"✓" character (B2.3 batch 3 Pass 3); added
  `Ionicons` import; both container styles gained `flexDirection: 'row'`
  + `justifyContent: 'center'`; `refundToggleText`'s embedded "✓" string
  removed from the text itself.
- MODIFIED: `mobile-app/src/screens/CsvImportModal.tsx` — choose-file
  button and duplicate-row checkbox mark now show real Ionicons instead
  of an embedded "📄"/"✓" character (B2.3 batch 3 Pass 3); added
  `Ionicons` import; `pickButton` style gained `flexDirection: 'row'` +
  `justifyContent: 'center'`; `checkboxMark` style now unused but left
  in place.
- MODIFIED: `mobile-app/src/screens/LoansScreen.tsx` — Payoff Simulator
  button now shows a real Ionicons icon instead of an embedded "📊"
  character, and the payment-row delete button now renders an Ionicons
  close icon instead of a raw "✕" (B2.3 batch 3 Pass 3); added
  `Ionicons` import; `simulatorButton` style gained `flexDirection:
  'row'` + `justifyContent: 'center'`; `paymentRemoveBtnText` style now
  unused but left in place.
- MODIFIED: `mobile-app/src/screens/IncomeScreen.tsx` — payday-log-row
  delete button now renders an Ionicons close icon (red, `#e5484d`)
  instead of a raw "×" (B2.3 batch 3 Pass 3); added `Ionicons` import;
  `paymentLogRemoveText` style now unused but left in place.
- MODIFIED: `mobile-app/src/screens/SavingsScreen.tsx` — contribution-
  row delete button now renders an Ionicons close icon instead of a raw
  "✕" (B2.3 batch 3 Pass 3); added `Ionicons` import;
  `contribRemoveButtonText` style now unused but left in place. FI
  Calculator's "Saved ✓" button text left untouched — still tracked as
  batch 3b scope.

- MODIFIED: `mobile-app/src/screens/SignInScreen.tsx` — revoked-session
  banner now shows a real Ionicons warning icon and a real Ionicons close
  icon instead of embedded "⚠️"/"✕" characters (B2.3 batch 3 Pass 4);
  added `Ionicons` import; `revokedBannerText` style's embedded
  characters removed from the text itself.
- MODIFIED: `mobile-app/src/screens/CreateProfileScreen.tsx` —
  copy-recovery-key button now shows a real Ionicons copy icon (only in
  the un-copied state) instead of an embedded "📋" character, and the
  recovery-key-saved checkbox now renders an Ionicons checkmark instead
  of a raw "✓" (B2.3 batch 3 Pass 4); added `Ionicons` import;
  `copyButtonText`/`checkmark` styles now unused for the swapped
  characters but left in place. "Copied! ✓" text left untouched — still
  tracked as batch 3b scope.
- MODIFIED: `mobile-app/src/screens/PinUnlockScreen.tsx` —
  retry-biometric button now shows a real Ionicons refresh icon instead
  of an embedded "🔄" character (B2.3 batch 3 Pass 4); added `Ionicons`
  import; `retryBiometricText` style's embedded character removed from
  the text itself.
- MODIFIED: `mobile-app/src/screens/ProfileScreen.tsx` — both shortcut-
  row chevrons (Password & Encryption Key, Active Devices) now render an
  Ionicons chevron-forward instead of a raw "›"; the peer-recovery-
  request banner now shows a real Ionicons warning icon instead of an
  embedded "⚠️" character; the "✓ Linked" household-status badge now
  renders an Ionicons checkmark beside plain "Linked" text instead of an
  embedded "✓" character (B2.3 batch 3 Pass 4); added `Ionicons` import;
  `chevron`/`hintText`/`linkCodeLabel` styles now unused for the swapped
  characters but left in place. "✓ New Owner" transfer-owner badge left
  untouched — still tracked as batch 3b scope.
- MODIFIED: `mobile-app/src/screens/SettingsScreen.tsx` — profile-card
  row chevron now renders an Ionicons chevron-forward instead of a raw
  "›"; categorization-rule reorder buttons now render Ionicons
  chevron-up/chevron-down (dimmed when disabled) instead of raw "▲"/"▼";
  copy-recovery-key button now shows a real Ionicons copy icon (only in
  the un-copied state) instead of an embedded "📋" character (B2.3 batch
  3 Pass 4); added `Ionicons` import; `profileChevron`/`reorderBtnText`/
  `dataButtonText` styles now unused for the swapped characters but left
  in place. "Copied! ✓" text left untouched — still tracked as batch 3b
  scope.

- MODIFIED: `mobile-app/src/screens/EventsScreen.tsx` — completed-event
  card titles now show a green Ionicons checkmark-circle beside the title
  text instead of an embedded "✓" character (B2.3 batch 3b); added a new
  `eventTitleRow` row-container style; `eventName` style gained
  `flexShrink: 1`.
- MODIFIED: `mobile-app/src/screens/GoalsScreen.tsx` — completed-goal
  card titles now show a green Ionicons checkmark-circle beside the title
  text instead of an embedded "✓" character (B2.3 batch 3b); added a new
  `goalTitleRow` row-container style; `goalTitle` style gained
  `flexShrink: 1`.
- MODIFIED: `mobile-app/src/screens/CreateProfileScreen.tsx` — the
  copy-recovery-key button's "Copied!" confirmation state now shows a
  real Ionicons checkmark instead of an embedded "✓" character, replacing
  the previous separate not-yet-copied-only icon with a single icon that
  switches between `copy-outline` and `checkmark` (B2.3 batch 3b).
- MODIFIED: `mobile-app/src/screens/SettingsScreen.tsx` — the same
  copy-recovery-key "Copied!" state fix as CreateProfileScreen (B2.3
  batch 3b).
- MODIFIED: `mobile-app/src/screens/SavingsScreen.tsx` — the FI
  Calculator's "Saved" button now shows a real Ionicons checkmark instead
  of an embedded "✓" character, with `flexDirection: 'row'` +
  centering applied inline on that one button (B2.3 batch 3b).
- MODIFIED: `mobile-app/src/screens/ProfileScreen.tsx` — the
  transfer-ownership modal's "New Owner" badge now shows a real Ionicons
  checkmark beside plain "New Owner" text instead of an embedded "✓"
  character, wrapped in a small inline row `View` (B2.3 batch 3b).

- NEW: `mobile-app/src/components/SwipeableRow.tsx` — reusable swipe-
  left-to-delete wrapper around `react-native-gesture-handler`'s
  `Swipeable`, gated by an `enabled` prop (renders children unwrapped
  when disabled). Not yet used by any screen — built standalone for the
  swipe-to-delete feature's checkpoint 1.
- NEW: `mobile-app/src/components/RowInteractionPreview.tsx` — a
  self-contained, looping `Animated`-driven demo row shown in Settings,
  simulating either the swipe-to-delete or tap-to-open interaction
  depending on the `mode` prop passed in.
- MODIFIED: `mobile-app/src/types.ts` — `Settings` type gained a new
  `swipeToDeleteEnabled: boolean` field.
- MODIFIED: `mobile-app/src/defaultModel.ts` — default settings object
  gained `swipeToDeleteEnabled: false`.
- MODIFIED: `mobile-app/src/screens/SettingsScreen.tsx` — new "List
  Rows" section added between "Appearance" and "Notifications": a
  2-option pill row (Swipe to delete / Tap to open) plus a live
  `RowInteractionPreview`; new `handleSetSwipeToDelete()` save handler
  added alongside `toggleWeeklyRecap()`; added `RowInteractionPreview`
  import.
- MODIFIED: `mobile-app/index.js` — added `import
  'react-native-gesture-handler';` as the very first line (required by
  the library).
- MODIFIED: `mobile-app/App.tsx` — added `GestureHandlerRootView`
  import; wrapped the top-level `export default function App()`'s
  returned tree in `<GestureHandlerRootView style={{ flex: 1 }}>`.
- MODIFIED: `mobile-app/package.json` — added `react-native-gesture-
  handler` dependency via `npx expo install`.
- MODIFIED: `mobile-app/src/screens/BillsScreen.tsx` — CollapsibleRow
  rows now wrapped in `SwipeableRow`, reading
  `model.settings.swipeToDeleteEnabled` (checkpoint 2); added
  `SwipeableRow` import; new `performDeleteById()` +
  `handleSwipeDelete(bill)` pair added alongside the existing modal-
  based `performDelete()`/`handleDelete()`.
- MODIFIED: `mobile-app/src/screens/DebtsScreen.tsx` — same pattern as
  BillsScreen (checkpoint 2); new `performDeleteById()` +
  `handleSwipeDelete(debt)` pair.
- MODIFIED: `mobile-app/src/screens/IncomeScreen.tsx` — same pattern as
  BillsScreen (checkpoint 2); new `performDeleteSourceById()` +
  `handleSwipeDelete(source)` pair.
- MODIFIED: `mobile-app/src/screens/LoansScreen.tsx` — same pattern as
  BillsScreen (checkpoint 2); new `performDeleteLoanById()` +
  `handleSwipeDelete(loan)` pair.
- MODIFIED: `mobile-app/src/screens/SavingsScreen.tsx` — same pattern as
  BillsScreen (checkpoint 2); new `performDeleteGoalById()` +
  `handleSwipeDelete(goal)` pair.
- MODIFIED: `mobile-app/src/screens/TransactionsScreen.tsx` — same
  pattern as BillsScreen, but `enabled` is
  `isManual && Boolean(model.settings.swipeToDeleteEnabled)` since only
  manual transactions are deletable here (checkpoint 2); new
  `performDeleteTxnById()` (reuses the existing linked-refund-
  transaction cascade) + `handleSwipeDelete(rawId)` pair.
- MODIFIED: `mobile-app/src/screens/GoalsScreen.tsx` — top-level goal
  row now wrapped in `SwipeableRow`, reading
  `model.settings.swipeToDeleteEnabled` (checkpoint 3, part 1); added
  `Alert`/`SwipeableRow` imports; new `performDeleteGoalById()` +
  `handleSwipeDeleteGoal(goal)` pair added alongside the existing
  modal-based `performDeleteGoal()`/`handleDeleteGoal()`.
- MODIFIED: `mobile-app/src/screens/EventsScreen.tsx` — top-level event
  row now wrapped in `SwipeableRow` (checkpoint 3, part 1); added
  `Alert`/`SwipeableRow` imports; new `performDeleteEventById()` +
  `handleSwipeDeleteEvent(ev)` pair, reusing the same linked-savings-
  goal/linked-expense-transaction cascade as the existing modal delete.
- MODIFIED: `mobile-app/src/screens/TravelScreen.tsx` — top-level trip
  row now wrapped in `SwipeableRow`; nested checklist items inside a
  trip's edit modal deliberately left unwrapped, since they already
  have their own inline "X" delete button (checkpoint 3, part 1); added
  `Alert`/`SwipeableRow` imports; new `performDeleteTripById()` +
  `handleSwipeDeleteTrip(trip)` pair, reusing the same linked-savings-
  goal/linked-expense-transaction cascade as the existing modal delete.
- MODIFIED: `mobile-app/src/screens/GroceriesScreen.tsx` — main Grocery
  List tab's row now wrapped in `SwipeableRow`; the separate Calculator
  tab's entries deliberately left unwrapped, since they already have
  their own inline "X" delete button (checkpoint 3, part 1); added
  `Alert`/`SwipeableRow` imports; new `performDeleteGroceryById()` +
  `handleSwipeDeleteGrocery(item)` pair added alongside the existing
  modal-based `performDeleteItem()`/`handleDeleteItem()`.
- MODIFIED: `mobile-app/src/screens/AccountsScreen.tsx` — the flat/
  list-mode account row (`!isStackedSection` branch) now wrapped in
  `SwipeableRow`; stacked overlapping cards (`isStackedSection` true)
  deliberately left unwrapped (checkpoint 3, part 2); added
  `SwipeableRow` import (`Alert` was already imported); new
  `performDeleteAccountById(group, id)` +
  `handleSwipeDeleteAccount(group, account)` pair added alongside the
  existing modal-based `performDelete()`/`handleDelete()`.

📚 Older progress: PROGRESS2.md (Phase B build, B.1–B.14, now closed),
PROGRESS1.md (Phase A, closed), PROGRESS.md (original Phases 0–11, closed).
