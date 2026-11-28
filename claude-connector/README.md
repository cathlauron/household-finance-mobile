# Finance Flow connector for Claude

Lets Claude (claude.ai, the Claude app, Claude Code) read your Finance Flow totals, add
transactions for you, and see the app's crash reports. Runs on Cloudflare Workers' free plan
(no card). Firebase stays on the free Spark plan.

## What Claude can and can't do

| Claude can | Claude can't |
|---|---|
| Read the summary: balances, total, Left to Spend, this month in / out / saved, spending per category against its budget, bills / debts / loans due before payday | See transactions, notes, photos, names of people, card digits, or anything else locked with your passphrase |
| Add a transaction (it waits in a queue; your phone adds it as **To review**) | Change or delete anything already in the app |
| List or cancel entries the phone hasn't picked up yet | Turn itself on: you switch it on in the app |
| Read unresolved crash and error reports from Sentry (if set up) | |

The summary is saved in Firebase **without** the passphrase lock, so Claude can read it.
Switching **Connect to Claude** off deletes it straight away.

## Tools

- `get_finance_summary`
- `add_transaction` (label, amount, optional direction, category, account, date, note)
- `list_pending_transactions`
- `cancel_pending_transaction`
- `get_app_issues` (Sentry)

## Set it up (about 20 minutes, once)

Windows PowerShell, in `C:\Projects\household-finance-mobile`.

1. **Firebase rules.** The new rules allow the summary and the queue:

       cd mobile-app
       firebase deploy --only firestore:rules
       cd ..

2. **Your account id.** Firebase console › Authentication › Users › your email › copy the
   **User UID**.

3. **Server key.** Firebase console › ⚙ Project settings › Service accounts ›
   **Generate new private key**. Save it as `C:\Projects\finance-flow-key.json` (outside the
   project folder, never in git). Anyone with this file can read and write your Firestore
   (your locked data stays unreadable to them), so keep it private. You can delete it after
   step 5.

4. **Cloudflare.** Make a free account at dash.cloudflare.com (no card). Then:

       cd claude-connector
       npm install
       npx wrangler login

5. **Secrets** (each asks you to paste a value):

       node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
       npx wrangler secret put CONNECTOR_SECRET        # paste the 48 letters printed above
       npx wrangler secret put FINANCE_FLOW_UID        # paste your User UID
       Get-Content C:\Projects\finance-flow-key.json -Raw | npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
       npx wrangler deploy

   `deploy` prints an address like `https://finance-flow-claude.<you>.workers.dev`.

6. **Claude.** claude.ai › Settings › Connectors › **Add custom connector**. Name it
   Finance Flow. URL: `https://finance-flow-claude.<you>.workers.dev/mcp/<CONNECTOR_SECRET>`.
   The secret in the address is the password: don't share it.

7. **The app.** Settings › Backup & Data › **Connect to Claude** › Share. Open the app once
   while online; the summary is shared a few seconds later and again after each change.

### Crash reports in Claude (optional)

After Sentry is set up for the app (see `mobile-app/SENTRY.md`): Sentry › Settings ›
Auth Tokens › create one with `project:read` and `event:read`, then

    npx wrangler secret put SENTRY_TOKEN
    npx wrangler secret put SENTRY_ORG        # your organization slug
    npx wrangler secret put SENTRY_PROJECT    # e.g. finance-flow
    npx wrangler deploy

## Cost

Cloudflare Workers free plan: 100,000 requests a day, no card. Firestore free (Spark) plan:
50,000 reads and 20,000 writes a day. A day of chatting with Claude uses a few dozen of each.

## Checks

    npm test
