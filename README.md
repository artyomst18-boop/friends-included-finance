# Friends Included finance system

This repository implements the Day 4 homework as a full-stack Next.js application. Supabase is the source of truth; Vercel runs the website and server routes; Telegram uses a webhook into the same transaction service as the website; Google Sheets receives an upserted audit copy.

## What is already implemented

- Demonstration role selector for Svetlana, Richard, Anastasia, Jean-Claude and Kevin.
- Server-side role enforcement. Salespeople can submit sales, Kevin can submit expenses, and only Svetlana can approve, correct, link Telegram identities, or retry integrations.
- Required-field, positive-amount, reference-format, duplicate-reference and 100%-split validation.
- Pending sales excluded from results; 10% commission pool; cent rounding and deterministic remainder rule.
- Immediate company-expense recognition, automatic overhead allocation, and manager allocation of project expenses without double counting.
- Idempotent decisions. The database update only succeeds while a sale is pending or an expense awaits allocation.
- Project, company and salesperson calculations, including pending and integration statuses.
- Telegram submission confirmations and decision notifications sent to the originating chat ID.
- Two Google Sheets tabs with separate proposed and approved fields. Sync updates a row by reference instead of appending a duplicate.
- Visible failed sync/delivery state and manager retry controls.
- Automated finance-rule tests for the supplied Test 1 and cumulative Test 2 answers.

## Architecture in plain language

The browser never receives database, bot, or Google credentials. It sends an action to a Next.js route. The route loads the selected employee from Supabase and checks the employee's stored role before processing anything. Both the website and Telegram webhook call the same functions in `lib/service.ts`, so they cannot drift into different financial rules.

After Supabase saves a transaction, the service attempts the Google Sheets update and Telegram confirmation. If either external service fails, the financial record remains saved and is marked failed for retry. Manager approval follows the same order: save the decision first, then attempt the spreadsheet and notification. This is why a Telegram outage cannot undo an approved transaction.

All currency is stored as integer cents. That avoids floating-point errors. For a sale, the app rounds the 10% pool to cents, rounds the three commissions, and gives any remaining cent difference to the largest percentage holder. A tie is resolved in the required order: Richard, Anastasia, then Jean-Claude.

## Connect the four services

### 1. Supabase

1. Create a Supabase project.
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it once.
3. In the project's **Connect** dialog, copy the project URL and server secret key.
4. Keep the secret key server-side. The schema enables row-level security and deliberately creates no browser policies.

### 2. Google Sheets

1. Create a spreadsheet with tabs named exactly `Sales` and `Expenses`.
2. In Google Cloud, enable the Google Sheets API and create a service account.
3. Share the spreadsheet with the service-account email as **Editor**.
4. Give the instructor **Viewer** access; do not allow public editing.
5. Copy the spreadsheet ID from the URL and the service-account email/private key into the environment variables below. The application creates the header rows on first use.

### 3. Telegram

Your Telegram account username is **@artyomst18**. Keep this distinct from the bot username: the bot must be created separately through BotFather, and the manager setup screen must receive your numeric Telegram user ID.

1. Create a bot with BotFather and copy its token.
2. Choose a long random webhook secret.
3. After Vercel deployment, register the webhook (replace all placeholders):

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "content-type: application/json" \
  -d '{"url":"https://<YOUR-VERCEL-DOMAIN>/api/telegram/webhook","secret_token":"<WEBHOOK_SECRET>","allowed_updates":["message"]}'
```

4. Find your numeric Telegram user ID, select Svetlana on the website, and use **Telegram employee link** to map the ID to the fictional employee being tested.
5. Start the bot in a private chat. It records that chat as the employee's current linked chat. Each submitted transaction separately preserves its originating chat.

Bot formats:

```text
/sale S01 | Olivia Rose | A | One proud uncle and an emotional grandmother | 1000 | 50/30/20
/expense E01 | Rented suit and fake pearl necklace for the relatives | Materials | 120 | A
```

### 4. Vercel and GitHub

1. Copy `.env.example` to `.env.local` for local work and fill every value.
2. Create a private or public GitHub repository accessible to the instructor and push this folder.
3. Import that repository into Vercel.
4. Add the same variables in **Vercel → Project settings → Environment Variables**. Do not prefix secrets with `NEXT_PUBLIC_`.
5. Deploy. Add the resulting Vercel URL to the course spreadsheet only in your own row.

Required environment variables:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
GOOGLE_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
NEXT_PUBLIC_STUDENT_NAME
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
NEXT_PUBLIC_GOOGLE_SHEET_URL
NEXT_PUBLIC_GITHUB_URL
```

## Run and verify locally

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:3000`. A build check before deployment is:

```bash
npm run build
```

## Homework test sequence

Clear `sales` and `expenses` before Test 1. Do not delete the five employees.

1. Link your Telegram ID to Richard, start the bot, and submit S01 through Telegram.
2. Relink the same ID to Kevin and submit E01 through Telegram. S01 keeps Richard and the original chat ID.
3. Submit S02, E02 and E03 on the website under the correct demonstration roles.
4. As Svetlana, approve/correct exactly as the homework states. Expected Test 1 company result: **€2,400.00**.
5. Keep those records; enter S03-S05 and E04-E07. Apply the required Test 2 decisions.
6. Expected cumulative results: Project A **€2,050.00**, Project B **€2,180.00**, company **€3,930.00**. Commission earned: Richard **€140.00**, Anastasia **€175.00**, Jean-Claude **€215.00**.
7. Perform every denied-action test. The route must return a permission or validation error and totals must stay unchanged.
8. To test resilience, temporarily use an invalid Google private key, submit a unique practice transaction, observe `failed`, restore the key, and use the retry form. The same reference must update one row and totals must not change during retry. Do the equivalent with a temporarily invalid bot token.

## Important submission boundary

The code is complete, but a real deployed URL cannot be created without access to your Supabase, Google Cloud, Telegram, GitHub and Vercel accounts. Do not send those secrets in chat or commit them. Add them directly to `.env.local` and Vercel's encrypted environment settings.

## Official references

- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Supabase JavaScript database API: https://supabase.com/docs/reference/javascript/insert
- Telegram Bot API: https://core.telegram.org/bots/api
- Google Sheets values API: https://developers.google.com/workspace/sheets/api/guides/values
