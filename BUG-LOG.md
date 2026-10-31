# Finance Flow bug log

Every bug Cath has reported, where it lives in the code, and whether an automatic check
guards it so it can't come back silently. Started 2026-10-22 from the notes left in the code
("Cath: ..." comments), TEST-2.1.md / TEST-2.2.md and the PROGRESS logs. Add a row for every
new bug (see `.claude/skills/finance-flow-bug-check/SKILL.md`).

**Guard** = the automatic check that fails if this bug comes back:
- a file + check name: guarded (proven red-green when it was written, from 2026-10-22 on)
- `logic (partly)`: an older check in `mobile-app/tests` covers the calculation, written
  before red-green proof was required
- `none yet`: nothing guards it; only Cath's phone would notice. Turning these into guards
  is ongoing work, most important first.
- `phone only`: can't be checked automatically (feel, speed, real phone features)

Status: **phone-confirmed** = Cath confirmed it on her phone (TEST-2.2 sections A-O,
TEST-2.1). All rows below were phone-confirmed fixed unless the status says otherwise.

## Bugs Cath reported

| id | What Cath saw | Where (file) | Guard |
|---|---|---|---|
| B-001 | Holding a Home card and moving it froze after a few seconds | homeScrollLock.ts | phone only |
| B-002 | A held card dragged to the top or bottom of the screen should scroll the page | homeScrollLock.ts | phone only |
| B-003 | "Scan to join" said "Allow the camera" but no pop-up came | components/HouseholdLinkWays.tsx | phone only |
| B-004 | After adding a bill she had to scroll down to find it | components/ArrivalGlow.tsx, arrivalFocus.ts | tests/oldBugs.test.mjs "B-004" (added 2026-10-30) |
| B-005 | Debts, Loans, Plan, FI didn't bounce at the ends like Bills | components/KeyboardAwareScrollView.tsx | phone only |
| B-006 | Switching Bill / Debt / Loan closed the sheet and opened it again | components/BottomSheet.tsx | partly: __tests__/SmoothSwaps.test.tsx "a form switch changes the form only once…"; the sheet staying open needs the phone |
| B-007 | Switching Bill / Debt / Loan jumped to the other list | screens/BillsScreen.tsx, DebtsScreen.tsx, LoansScreen.tsx | needs the phone (gesture + list position; can't be checked off the phone) |
| B-008 | + on Home lagged | navigation/MainTabs.tsx, screens/TransactionsScreen.tsx | phone only |
| B-009 | After Add, the form slid away while Transactions was already showing (a flash) | navigation/MainTabs.tsx | partly: __tests__/SmoothTransitions.test.tsx "page contents arrive a moment after the slide"; the flash itself needs the phone |
| B-010 | Swipe-to-delete opened when she meant to change screens (swipe-to-delete later removed at her request) | navigation/swipeTabs.tsx, components/SwipeableRow.tsx | feature removed at her request (swipe-to-delete): nothing left to guard |
| B-011 | Going back from Accounts > Income > a person "looked buggy" (empty moment, then pop) | navigation/RootStack.tsx | phone only |
| B-012 | After + in the calendar, going back and reopening showed the calendar behind Home | navigation/RootStack.tsx | __tests__/GoToMain.test.tsx (never a second Main / calendar behind Home) |
| B-013 | Scrolling the months closed the calendar | navigation/RootStack.tsx | needs the phone (scroll gesture) |
| B-014 | Screens flash and go back; forms flashing; Edit on a debt opened and closed again; a form still opened by itself when tapping something | afterSlide.ts, navigation/TabPage.tsx, handledOpen.ts | partly: __tests__/SmoothSwaps.test.tsx "afterSlide still runs (once)…"; the flashes need the phone |
| B-015 | The invite sent through Messenger had no link | joinLink.ts | tests/oldBugs.test.mjs "B-015" (added 2026-10-30) |
| B-016 | An invite code stayed on Household long after its 15 minutes | storage.ts, screens/ProfileScreen.tsx | tests/oldBugs.test.mjs "B-016" (added 2026-10-30, red-green proven) |
| B-017 | The inviter stayed on "Almost there…" for minutes | screens/ProfileScreen.tsx, linking.ts | needs two phones (inviter + joiner) |
| B-018 | Light/dark switch lagged; 2.1's was smoother | ThemeContext.tsx, screens/HomeScreen.tsx | phone only |
| B-019 | Tapping Add lagged; Save/Add lagged; a trip took seconds to save; the form waited with a spinner | DataContext.tsx | phone only |
| B-020 | Card animations lagged | DataContext.tsx | phone only |
| B-021 | Typing an amount lagged | screens/TransactionsScreen.tsx | phone only |
| B-022 | Budget / To-do on a trip didn't swipe | screens/TravelScreen.tsx | __tests__/SubPageScreens.test.tsx (Travel trip: Budget / To-do slide) |
| B-023 | No Overdue tag on a debt past its due date | screens/DebtsScreen.tsx, overdue.ts | logic (partly): sanitizeIds "overdue items" |
| B-024 | Opening: everything appeared at once and the loader was gone; the opening animation froze; then "too fast, then stuck on Almost there" | screens/IntroScreen.tsx | phone only |
| B-025 | Calendar year view started at Oct 2024 with empty months before it | screens/CalendarScreen.tsx | tests/oldBugs.test.mjs "B-025" (added 2026-10-30, red-green proven) |
| B-026 | The picked calendar day showed a square on Android | screens/CalendarScreen.tsx | phone only |
| B-027 | Calendar years showed blank while scrolling | screens/CalendarScreen.tsx | phone only |
| B-028 | Adding from the calendar jumped to the other screen before she'd added it | screens/CalendarScreen.tsx | partly: __tests__/GoToMain.test.tsx; the timing needs the phone |
| B-029 | Reports "Customize" checklist didn't show several picks at once (old Bug #14) | screens/InsightsScreen.tsx / reports | feature removed (Reports page redesigned; no Customize list any more) |
| B-030 | FI calculator largely not working (old Bug #4) | screens/SavingsScreen.tsx, fiScenario.ts | tests/oldBugs.test.mjs "B-030" (added 2026-10-30) |
| B-031 | Emergency fund calculator (old Bugs #5 / #5b) | screens/SavingsScreen.tsx | tests/oldBugs.test.mjs "B-031" (added 2026-10-30) |
| B-032 | Deleting while offline hung (old Bug #1) | netTimeout.ts, deleteRecords.ts | logic (partly): deleteRecords |
| B-033 | Left to Spend "caution" level didn't stay saved | balanceProjection.ts, Settings | __tests__/SettingsRunningLow.test.tsx (the caution / running-low percent saves) |
| B-034 | Two phones saving close together could lose one person's change (RISK 3) | merge3.ts, DataContext.tsx | logic (partly): merge3 (12 checks) |
| B-035 | Paying a bill / debt: amounts, carry-over, undo, paying twice | billPayments.ts, recurrence.ts | logic (partly): money |
| B-036 | Bill due dates on the 31st, "last day", yearly, past this month | recurrence.ts | logic (partly): money |
| B-037 | Loan schedule: missed payments, "which payment was this" | loanSchedule.ts | logic (partly): loanSchedule |
| B-038 | Trip items ticked as paid, "take it off my balance", unticking | trip payment code | logic (partly): paymentPlacement, travelChecklist |
| B-039 | Who logged / changed it (stamps) | whoStamp code | logic (partly): whoStamp |
| B-040 | Recovery key dashes, email format, email typo suggestions | typing helpers | logic (partly): typingHelpers |
| B-041 | Calendar (and Home's Due soon, Left to Spend's forecast) missed a debt due Oct 30 that the Debts page showed: the calendar ignored a payment round's own due date; a due day of 31 showed nowhere in 30-day months | balanceProjection.ts dueDaysInMonth, nextOccurrenceInMonth | tests/calendarDue.test.mjs (red-green) |
| B-042 | Loan paid every 16th: after logging Sept 16 it said "next Nov 16" (Oct 16 unpaid, shown as past due) | loanSchedule.ts loanNextDueDate (Loans list, sort, loan page, Home tight-money list) | tests/loanSchedule.test.mjs ("next payment = the oldest unpaid date", red-green) |
| B-043 | Couldn't paste (or copy) in the big amount at the top of forms | components/CenteredAmount.tsx | __tests__/AmountPaste.test.tsx (red-green) |
| B-044 | A note added to a bill or debt (and a payment's note) showed nowhere | screens/PayDetailScreen.tsx | __tests__/DetailNotes.test.tsx (red-green) |
| B-045 | A trip with an empty checklist showed no Checklist at all (Budget page cut to To-do's height; phone only) | components/SlidingPages.tsx (heights kept in a ref) | __tests__/InlineHeights.test.tsx (phone-like delayed writes; red-green) |
| B-046 | "Dates (optional)" squeezed to one letter per line in the trip form (any long value in a form row) | components/SimpleForm.tsx PickerRow | tests/motion.test.mjs ("row labels keep their width"); look needs your phone |
| B-047 | Loan with no First payment date ("Miduri", "Olive"): "next Nov 16" and nothing past due although Oct 16 was never paid; the edit form also prefilled First payment with the NEXT date | loanSchedule.ts loanFirstDate / loanCoverage, overdue.ts, LoansScreen.tsx | tests/loanSchedule.test.mjs (red-green) |
| B-048 | A back-dated payment logged today said "Undo today's payment" / "Paid today"; catching up hid Pay / Log payment | screens/PayDetailScreen.tsx | __tests__/UndoWording.test.tsx (red-green) |
| B-049 | Receipt row: "Add photo" pill not on the label's line (shared expenses, bills, debts, loans) | components/ReceiptField.tsx (alignSelf), PayFromSheet.tsx | checked in the web walk; look needs your phone |
| B-050 | Trip page "Add" pill sat high (and was pushed off the card once you typed) | screens/TravelScreen.tsx | checked in the web walk; look needs your phone |
| B-051 | Forms messy: values and chevrons at different right edges (B-046 fix regressed it), labels wrapping, ₱ far from the amount, pay sheet laid out unlike canvas R4 | components/SimpleForm.tsx, PayFromSheet.tsx, AccountPicker.tsx, TransactionsScreen.tsx and others (two review agents swept every form) | tests/motion.test.mjs; look needs your phone |
| B-052 | Came back: B-047. Loan "Olive" (Repeats: Custom, monthly from 2025-08-16; 14 payments Aug 2025 - Sep 2026) said "next Nov 16" with Oct 16 unpaid and nothing past due. Custom loans were never tracked; also a First payment exactly one month after the first payment slipped past B-047's repair | loanSchedule.ts (customOf, loanFirstDate, loanScheduledDates) | tests/loanSchedule.test.mjs ("H-47: ..." x5, Olive-shaped data; red-green) |
| B-053 | Transactions "Newest" didn't put her newest entry at the top (only the DAY was compared; same-day order depended on the kind of entry) (H-39) | transactions.ts (entries carry `at`, sort by day then time), transfersList.ts, TransactionsScreen.tsx | tests/newestFirst.test.mjs (red-green) |
| B-054 | Idle "Are you still there?" restarted a fresh minute after the app was in the background (H-42) | stillThereClock.ts, App.tsx checkStillThere, StillThere.tsx (deadline) | tests/stillThereClock.test.mjs (logic + wiring, red-green); background timing needs your phone |
| B-055 | "Who added it" missing on groceries, meal ideas, events, trip to-dos, shared expenses, settle-ups, transfers, investments, yearly goals, accounts (H-43) | whoStamp.ts, types.ts, the screens' rows / footnotes | tests/whoStamp.test.mjs (red-green); names show only in a shared household: needs your phone |
| B-056 | Trip item added with a name only couldn't get its cost later (had to remove and re-add) (H-44) | TravelScreen.tsx form (name and cost editable) | __tests__/TripItemEdit.test.tsx (red-green) |
| B-057 | 12 Remove / Clear buttons removed things without asking (H-49) | askToRemove.ts + Loans, Travel, Income, Savings, Groceries, Events, ReceiptField | tests/confirmRemove.test.mjs (fails on any Remove / Delete / Clear button or swipe that doesn't ask; red on 12, green now) |
| B-058 | A quick double tap on Add saved a transaction twice (also Move money, the calm-Home quick add, any Button). The old check waited between taps, which hid it | TransactionsScreen.tsx, Button.tsx, TransferScreen.tsx, CalmHome.tsx (guard set when a save starts) | __tests__/TransactionDoubleTap.test.tsx (real double tap), __tests__/ButtonDoubleTap.test.tsx (red-green) |
| B-059 | Debts showed no paid ones and only "Total debt logged" (H-40/H-41, canvas A2) | debtSections.ts, DebtsScreen.tsx | tests/debtSections.test.mjs, __tests__/DebtsA2.test.tsx (red-green) |
| B-060 | Left to Spend seemed to count only bills; past due, plans and paid-ahead loans were missing or double counted; "Other changes" unexplained (H-52) | leftToSpendExtras.ts (accounts now + every line to payday), balanceProjection.ts, HomeHero.tsx | tests/leftToSpendAll.test.mjs (8, red-green) |
| B-061 | Undo stayed all day; payments couldn't be fixed later (H-48, canvas C1-C3); Edit loan's payments looked unlike the app (H-50, D1) | paymentEdit.ts, UndoPayment.tsx, PayFromSheet.tsx (edit mode), PayDetailScreen.tsx, transferUndo.ts, SharedExpensesScreen.tsx, LoansScreen.tsx | tests/paymentEdit.test.mjs, __tests__/EditPayment.test.tsx (red-green), tests/transferUndo.test.mjs |
| B-062 | Paid items didn't show as paid the same way everywhere (H-45, canvas B14: one line from the name to the amount, row faded) | PayRow.tsx (paid), PaidLine.tsx, Bills/Debts Paid this month, TravelScreen, GroceriesScreen | __tests__/DebtsA2.test.tsx, __tests__/TripItemEdit.test.tsx (red-green); the look itself: your phone |
| B-063 | No way to see why Left to Spend is what it is (H-54, canvas L4) | LeftToSpendScreen.tsx, leftToSpendExtras.ts (items), HomeHero.tsx (tap the amount / See every item), RootStack | __tests__/LeftToSpendPage.test.tsx |
| B-064 | Home's "You picked" said "Your first bill goes here" with bills already added (H-53) | GuestPicks.tsx | __tests__/GuestPicksDone.test.tsx (red-green) |
| B-065 | Form choices weren't real dropdowns; category not guessed (H-46, canvas E2) | ChoiceSheet.tsx, SimpleForm.tsx (PickerRow opens a list from the bottom for choice rows), AccountPicker.tsx, categoryGuess.ts, TransactionsScreen.tsx | __tests__/CategoryDropdown.test.tsx, tests/categoryGuess.test.mjs (red-green) |
| B-066 | Inside Edit loan, payments couldn't be logged with the pay sheet or edited (H-50, canvas D2) | LoansScreen.tsx, paymentEdit.ts (withLoanPayment / withoutLoanPayment), PayDetailScreen.tsx | __tests__/EditLoanPayments.test.tsx (red-green) |
| B-067 | Nothing showed what the other household member changed (H-51, canvas F2 + F3) | householdChanges.ts, components/HouseholdChanges.tsx, App.tsx | tests/householdChanges.test.mjs, __tests__/HouseholdChanges.test.tsx; two real phones: your phone |
| B-068 | Cath's video (2026-10-30): at rest the Dark mode sticker was drawn half peeled ("☀ Lark", "☾ Darkt": both labels showing) | Its finger point came from values made when the app loaded, starting at -1,-1; on her phone it never received its real starting corner. It now owns its values (starting at its corner) and lends them to its copy on the screen peel | components/PeelSticker.tsx, screenPeel.tsx, screens/AppearancePage.tsx | __tests__/PeelAtRest.test.tsx (red on the old code with the exact half shape from the video, green now); your phone |
| B-069 | H-04: on a slow connection "Sync Failed" popped up although the save still arrived a moment later | The online save had an 8-second limit and any timeout was shown as a failure | DataContext.tsx persistModel: a timeout now says "Still saving…" and the save carries on; "Sync Failed" only if it really fails | __tests__/SlowSyncNotFailed.test.tsx (red on the old code, green now) |
| B-070 | H-06: a change made offline could be lost if the app was closed right away | The phone's own copy was written in the background and nothing waited for it | DataContext.tsx persistModel: each save's turn now waits for the phone copy (Log out / Switch account / going to the background wait for saves) | __tests__/SaveWaitsForPhoneCopy.test.tsx (red on the old code, green now) |
| B-071 | As a guest, "Keep your first entry safe" rose over an empty list (the item wasn't there yet) | The entry was held back until the sheet was answered | DataContext.tsx saveModel (guest): the item shows first, the sheet rises 0.7 s later and says it's in the list, not saved yet | __tests__/GuestFirstItem.test.tsx (red on the old code, green now) |
| B-072 | Old note: invite codes never used left empty household records online (answer 13) | A new-household code made its household at once and nothing removed it | linking.ts cancelLinkCode: putting an unused code away also removes its household while the inviter is its only member (code first, so nobody can join meanwhile); older ones: CONSOLE-STEPS.md | __tests__/UnusedCodeCleanup.test.tsx (red on the old code, green now) |
| B-073 | Bug hunt H-58: Delete account stopping part way (e.g. connection drops) could leave the account stuck: a second try failed on the household already left, and the username was already freed while the sign-in still existed | Each step assumed a first try; the username was removed before the sign-in | deleteAccount.ts: a second try skips a household already left or deleted; if the sign-in can't be deleted, the username record is put back (uid + time now, as the rules require) and the page says the account wasn't deleted | __tests__/DeleteAccount.test.tsx "H-58" x3 (red on the old code, green now) |
| B-074 | Bug hunt H-60: a save that couldn't read the online household wrote over it anyway (after a K3 re-lock this would overwrite the re-locked copy with old-key data) | The fallback "can't read it: save as before" | household.ts saveHouseholdDataChecked: the save names its key number; a newer one online writes nothing; DataContext picks up the new key and tries once more | __tests__/KeyChain.test.tsx "step 5" (red without the check, green now) |
| B-075 | Cath's video 2026-10-30: Dark mode peel not smooth. The sticker froze half peeled, the screen peel jumped in at the end, then the page "jumped" (sat ~30 px too high) while it faded, and the copy's stickers showed both faces ("Daght") or a pink corner | The copy of the page was only drawn once the peel had started (slow on the phone), placed by window position (off by the status bar on Android), and its stickers drew the face underneath even at rest | screenPeel.tsx + AppearancePage.tsx: the copy is drawn (hidden) once the page has opened, placed relative to the peel host and moved by shared values; PeelSticker.tsx: the face underneath and the lifted corner only draw while peeling | __tests__/PeelSmooth.test.tsx (2 checks, red on the old code, green now); the feel on the phone: Needs your phone |
| B-076 | Bug hunt H-59 (Cath: "just hide it, but keep it in Settings"): ✕ on the email note hid it for every account on the phone | One hide flag for the whole phone | EmailCheckNote.tsx: hidden for good per account; new Settings › Account & Security › Email row (Confirmed / Not confirmed, tap sends the link) | __tests__/ForgotPassword.test.tsx "for this account only" (red on the old code) + "Settings › Account & Security › Email" |
| B-077 | TEST-3 s19 #3: typing an approval code in small letters added extra letters ("aah" -> "AAHAA-AAHA"); capitals worked | Android keyboards resend the word being typed when the app changes the text (to capitals, adding the dash) | codeInput.ts CODE_INPUT (plain-letters keyboard, no suggestions) on every code box: approval code, Recovery Key, join code; codes read the same in small or capital letters | tests/codeInputs.test.mjs (guard red on the old screens); the keyboard itself: Needs your phone |
| B-078 | TEST-3 s19 #3: tapping a sign-in help request in the bell opened Profile, not Household | HomeScreen navigated to Profile with no section | bellRoute.ts: opens Profile with section household (where Approve is) | tests/codeInputs.test.mjs "opens the Household page" |
| B-079 | TEST-3 s19 #3: making the approval code (and restoring) only greyed the button | No busy animation on those two sign-in buttons | SignInScreen: the app's spinner + "Making your code…" / "Restoring…" | Needs your phone (look) |
| B-080 | TEST-3 s19 #2 (Cath's ask): "Send again" for the reset email should open after a minute | It was available at once | ForgotPasswordSheet: counts down from 1:00, then "Didn't get it? Send again" | __tests__/ForgotPassword.test.tsx "after a minute" (red on the old sheet) |
| B-081 | FIXED, confirmed on her phone 2026-10-30 19:31 (stays open). TEST-3 s19 #6 / s20 / s21: a 2nd tap on Dark mode closed the app. ROOT CAUSE from Cath's phone crash log (2026-10-30): react-native-svg crashed ("IllegalStateException: Underflow in restore - more restores than saves" in its group drawing) when groups INSIDE a sticker's drawing faded between see-through and visible (the face-swap groups, worse after nesting them 3 deep on 10-30) | Fading groups inside one SVG drawing | PeelSticker.tsx: each layer (under On, under Off, top On, top Off, lifted corner) is its own drawing inside an ordinary view, and only those views fade; the corner's colour changes on the path itself. Earlier tries kept (copy laid out normally, see-through until a peel, waits while settling) | __tests__/PeelSmooth.test.tsx "no fading groups inside a sticker drawing" (red on the old sticker) + at-rest layers; hidden browser fine; Needs your phone |
| B-082 | Cath's screenshot 2026-10-30: after the crash fix, ~4 quick taps left the Dark mode sticker half cut and blank (no text) | Changed, not yet confirmed: a peel that was interrupted never finished (stayed "busy"), and at rest the sticker was still cut by the last finger point | PeelSticker.tsx: at rest always drawn whole; a peel always finishes even if interrupted | __tests__/PeelSmooth.test.tsx "always drawn whole"; Needs your phone |
| B-083 | FIXED, confirmed on her phone 2026-10-30 20:42 ("peel off works now"). Cath's video 2026-10-30: Dark mode no longer sticks but looks laggy and the sticker is cropped after a switch | Android doesn't always redraw a clip made from an animated shape, so a face stayed cut to an old shape; and every sticker (and its copy) drew 5 drawings | PeelSticker.tsx: at rest each face is drawn whole with no animated clip; the peeling layers are only drawn once a sticker is touched (copies and untouched stickers draw 2) | __tests__/PeelAtRest + PeelSmooth (at rest: no animated clip, nothing underneath drawn); Needs your phone |
| B-084 | Voice entry in Expo Go: tapping Say it showed a red "Cannot find native module 'ExpoSpeechRecognition'" error; the keyboard covered the typing box | Loading the add-on throws a red error in Expo Go even inside try/catch; the sheet ignored the keyboard | voiceListen.ts asks quietly first (requireOptionalNativeModule) and never loads the add-on without its native part; SayIt sheet sits on top of the keyboard | __tests__/SayItPhone.test.tsx (both red on the old code) |
| B-085 | Cath's video 2026-10-30: "Say it" filled the description but the amount stayed 0.00 | The amount box had the keyboard and ignored changes from outside while focused | AmountInput.tsx: while focused, an outside change is shown (what's typed is left alone); Say it closes the keyboard first | __tests__/SayItPhone.test.tsx "focused amount box" (red on the old code) |
| - | Plan pages: swiping sideways no longer goes back to Plan (Cath) | navigation/RootStack.tsx NO_SWIPE_BACK | tests/motion.test.mjs ("Plan pages: no swipe-back") |
| H-23 | (caught by code review before Cath saw it) Undo of a "Just record it" payment kept the flag: paying again from an account went missing from Transactions | billPayments.ts markPaid / undoLastPayment | tests/recordOnly.test.mjs (red-green) |
| H-24 | (code review) Undo of a payment left its separate fee entry behind | PayDetailScreen.tsx (feeTxnId) | phone check TEST-3 8 |
| H-25 | (code review) Paying more than a bill's amount made every later round look smaller in the forecast | balanceProjection.ts outstandingBalance | tests/recordOnly.test.mjs (red-green) |
| H-26 | (code review) Payment-method and tax reports counted recorded-only payments; extra loan principal counted as a "late fee" | reports/PaymentMethodsReport.tsx, TaxSummaryReport.tsx | read-checked |
| H-27 | (code review, receipts sync) An older (2.2) phone opening a parts household, e.g. the side-by-side 2.2 build on the same account, would delete the new receipt parts | householdParts.ts joinParts fallback, householdPartsSync.ts (seen receipts put back and re-saved; gate re-checked on every live update) | proven: tests/extraReceipts.test.mjs |
| H-28 | (code review) Moving to the bigger storage compared against this phone's last-saved parts, not what is online, so a part another phone removed could stay missing | householdPartsSync.ts saveWhenTooBig | read-checked |
| H-29 | (code review, open) While a phone is still on 2.2, receipts on shared expenses / payments / trips stay inside the main copy (~200 KB each); after about 4-5 the household can say storage is full until every phone is on 3.0 | (by design, safe; no data lost) | open: tell Cath |
| H-30 | (code review) A loan payment two weeks early was counted for the month before, so the paid month showed past due | loanSchedule.ts nearestScheduled | proven: tests/loanSchedule.test.mjs |
| H-31 | (code review) Loans saved with the old First-payment prefill (a date after the payments made) looked paid ahead; editing a loan asked "Which payment was this?" for no change | loanSchedule.ts loanFirstDate, LoansScreen.tsx | proven: tests/loanSchedule.test.mjs |
| H-32 | (code review) A repeating loan with no monthly amount showed its whole balance as overdue | loanSchedule.ts (only tracked from payments with a monthly amount) | proven: tests/loanSchedule.test.mjs |
| H-33 | (code review) Bill Undo could take the fee of a different payment made the same day | screens/PayDetailScreen.tsx | read-checked |
| H-34 | (review, 3.1) A fee paid with a monthly investment payment stayed after Undo | billPayments.ts, PayDetailScreen.tsx | proven: tests/investments.test.mjs |
| H-35 | (review, 3.1) A one-off top-up quietly changed the monthly plan; changing the plan day left the waiting payment on the old date | InvestmentsScreen.tsx, investments.ts | proven: tests/investments.test.mjs |
| H-36 | (review, SEC-1) Anyone with a code could mark it finished with any household id (blocking the inviter's phone from finishing) | firestore.rules | tests/joinLinkSafety.test.mjs (rules text); Cath publishes |
| H-37 | (review, SEC-2) A reminder set-up already running could finish after sign-out, or wipe the next account's | pushNotifications.ts | read-checked |
| H-38 | (review, SEC-5) Signing in with the password from the account list didn't lift "password only" for the PIN | App.tsx | read-checked |

## Found by Claude's bug hunt (before Cath saw them)

| id | What Cath would have seen | Where (file) | Guard |
|---|---|---|---|
| H-01 | Clear all data in a shared household erased it for both, warning said "this profile" | components/ClearAllData.tsx, screens/SettingsScreen.tsx | __tests__/ClearAllData.test.tsx, __tests__/SettingsClearAll.test.tsx |
| H-02 | Storage full after ~3 receipts; partner stops seeing changes | partsGate.ts, householdPartsSync.ts | tests/partsGate.test.mjs |
| H-05 | Backup file = every money detail, unlocked, left on the phone | backupFile.ts, screens/SettingsScreen.tsx | tests/backupFile.test.mjs, __tests__/SettingsBackup.test.tsx |
| H-07 | Income / Settings could crash when the data briefly went away (logging out) | screens/IncomeScreen.tsx, screens/SettingsScreen.tsx | npm run test:hooks (whole app) |
| H-08 | Home card's last-month line past the right edge | homeChart.ts, components/HomeHero.tsx | tests/homeChart.test.mjs |
| H-09 | Yesterday's Left to Spend / due labels after the app was left open overnight | useToday.ts, HomeScreen, HomeHero, useBellInbox, Bills/Debts/Loans | __tests__/useToday.test.tsx |
| H-10 | Same entry added twice by a quick double tap on Save/Add | components/SimpleForm.tsx (SheetBar), TransactionsScreen, AccountsScreen | __tests__/SheetBar.test.tsx (shared bar), __tests__/TransactionDoubleTap.test.tsx (New transaction); none yet for Accounts |
| H-11 | "-₱0.00" and "Over budget" with nothing overspent; "₱NaN" | balanceProjection.ts (computeLeftToSpend, formatPeso) | tests/centavos.test.mjs |
| H-12 | Raw technical error text on screen | friendlyError.ts (+9 screens) | tests/friendlyError.test.mjs |
| H-14 | Clearing the Running-low box and pausing saved 0 mid-typing | autoSaveInput.ts, screens/SettingsScreen.tsx | __tests__/SettingsRunningLow.test.tsx |
| H-03 | Connection dropped while opening: empty, unlinked household; edits overwrote the phone copy | DataContext.tsx (loadModel, openFromPhoneCopy) | __tests__/OpenOnBadConnection.test.tsx |
| H-15 | Zero money totals shown in red | moneyColor.ts (+7 screens) | __tests__/ZeroAmountsGrey.test.tsx, tests/moneyColor.test.mjs |
| H-16 | Expense with an expected refund switched to Money in kept the refund | screens/TransactionsScreen.tsx, TransactionDetailScreen.tsx | __tests__/RefundDirection.test.tsx |
| H-17 | Deleting a refund entry left its expense saying "received" | transactionActions.ts (deleteManualTxn), TransactionsScreen | tests/refundDelete.test.mjs |
| H-18 | 5 wrong PINs: reopening the app gave 5 fresh tries, endlessly | pin.ts, quickUnlock.ts, screens/PinUnlockScreen.tsx | __tests__/PinLockout.test.tsx, __tests__/PinLockScreen.test.tsx |
| H-20 | Turning on reminders after the permission pop-up undid changes that arrived meanwhile | screens/SettingsScreen.tsx | __tests__/SettingsNotifyStale.test.tsx |
| H-22 | Pot page target date had no year (Savings list had it) | screens/PotDetailScreen.tsx | __tests__/PotTargetYear.test.tsx |
| H-21 | Delete pop-ups saved data from when they opened (could undo a partner's change) | 12 screens (performDelete...) | __tests__/DeleteConfirmStale.test.tsx |
| H-19 | New phone sign-in: dropped connection asked for the recovery key | signInRestore.ts, screens/SignInScreen.tsx | tests/signInRestore.test.mjs, __tests__/SignInNewPhoneOffline.test.tsx |
| - | Dates next year showed no year | dateUtils.ts dateText (+19 files) | tests/dateText.test.mjs, __tests__/DatesWithYear.test.tsx |
| S-01 | Search drop-down, offline banner and the swipe-row hint moved even with the phone set to remove animations | screens/SearchScreen.tsx, components/OfflineBanner.tsx, components/RowInteractionPreview.tsx | tests/motion.test.mjs ("everything that moves respects Reduce Motion") |
| S-02 | (caught while building, never shipped) a new row on a hidden sub-page would light up before you could see it | useArrival.ts, pageActive.ts | __tests__/SlidingPages.test.tsx ("a new row on a page you cannot see...") |
| S-03 | (Claude's own process) the save gate let a failing screen check through: piping through tee hid the failure; caught before anything failing was saved | mobile-app/tools/check-all.mjs (npm run check:all) | proven 2026-10-23 with a deliberately failing check |
| S-08 | Whole-screen changes (set-up to Home, unlock) sat on an empty screen for 130-150 ms | App.tsx ScreenSwap | tests/motion.test.mjs ("whole-screen changes: one animation") |
| S-10 | Bill / Debt / Loan switch: fields swapped at once, pop-up's top edge jumped | components/FormSwapFade.tsx, BottomSheet.tsx | __tests__/SmoothSwaps.test.tsx |
| S-11 | Finger swipe between main tabs: next tab came in empty; pages overlapped for a frame at let-go | navigation/MainTabs.tsx, TabPage.tsx | tests/motion.test.mjs ("main tabs: the other tabs are always built...") |
| S-12 | "Add an account" never opened when the app never counted as settled (seen in Claude's browser) | afterSlide.ts | __tests__/SmoothSwaps.test.tsx ("afterSlide still runs...") |
| S-13 | Red error "Interpolation property 'easing' is not supported by native animated module" (Cath's phone) | components/ScreenSwap.tsx, motion.ts curvedRange | tests/motion.test.mjs ("no interpolate() carries an easing") |
| S-14 | Opening a Plan page showed a still copy of the app on Home (own tab bar) behind the slide (Cath's recording). REAL CAUSE (found by the motion reviewer, 10-26, proven): "go to Main" from a page on top (Calendar add, Search, card page, Review, reminder tap, quick add...) stacked a SECOND Main; the old one showed through sliding pages. Claude's first guess (the screen dip) was wrong; that change stays as a harmless safety net | navigation/goToMain.ts (12 places) | __tests__/GoToMain.test.tsx (real navigation: old way = 2 Mains) |
| S-15 | Bills / Debts / Loans (all switchers): each label in its own shadowed box on Android (Cath's screenshot) | components/SegmentedControl.tsx | tests/motion.test.mjs ("switchers: no Android elevation") |
| S-16 | Tab swipe could fall behind the finger when the app was busy | navigation/tabDrag.ts, TabPage.tsx, swipeTabs.tsx | tests/motion.test.mjs ("main-tab swipe: moves on the animation thread"), __tests__/TabSwipe.test.tsx |
| S-17 | Every save redrew the whole app (hidden tabs too) | navigation/RootStack.tsx, MainTabs.tsx, App.tsx | __tests__/NoRedrawOnSave.test.tsx |
| S-18..S-21 | Freeze after opening; stutter after + Add; long-history stall; calendar redraw; rain behind tabs | MainTabs.tsx, DataContext.tsx, TransactionsScreen.tsx, calendarSettings.ts, SkyGlow.tsx | tests/motion.test.mjs ("sweep 10-26"), __tests__/TransactionsBatches.test.tsx |
| - | Every form field marked red * (required) or grey (optional) (Cath's request) | components/MarkedLabel.tsx + forms | __tests__/RequiredMarks.test.tsx |
| - | No account / no income yet: + goes to adding one first, then back with it picked | accountHandoff.ts, TransactionsScreen, AccountsScreen | __tests__/AccountFirst.test.tsx |

## Still open (not fixed yet)

The full, current list lives in PROGRESS7.md, "Known issues / gotchas — still open"
(additive log, on `main`). The bug hunt (BUG-HUNT.md) re-checks each one against the real
code and records here whether it is still real.
