# Nexus ERP Platform

Nexus is a MERN application for small and medium businesses. It contains a React/Vite client and an Express/Mongoose API. Persistent business records are stored in MongoDB.

## What this version can do

- Sign in and out using HTTP-only cookies, restore sessions, hash passwords, rate limit login attempts, and enforce API role checks.
- Manage products and stock through the inventory screen. Every stock change creates a movement; stock-outs that would make inventory negative are rejected.
- Create customer sales orders with server-recalculated prices, discounts, tax, and totals. Confirming an order deducts stock, fulfillment creates an invoice, and eligible cancellation restores stock.
- Create supplier purchase orders, approve them, and record partial or full goods receipts. Receipts update stock and are protected against repeated receipt codes.
- Review leave requests and approve/reject them. Record payroll with server-calculated gross and net amounts from base pay, allowances, and deductions.
- Record expenses and idempotent payments, change company name/currency/tax settings, and view operational and financial summaries.
- Maintain append-only audit records for sensitive operations. User creation, role updates, active status changes, and last-admin safeguards are available to administrators.

Financial summaries keep recognized invoice revenue, payments received, outstanding receivables, recorded expenses, and open purchase commitments separate. The operating result is indicative only; this application does not provide double-entry accounting. Payroll calculations are generic and do not claim compliance with any country's rules.

## Current limitations

- Customer and vendor records can be managed through the API, but this client version does not yet include dedicated customer/vendor directory screens.
- Employee/department editing, attendance capture, password reset/invitations, profile/password changes, printable invoice detail, notification management, detailed date-range reports, and report CSV exports are not implemented yet.
- Posted finance records do not have reversal/adjustment screens, and there is no double-entry ledger.
- Cross-document business workflows use guarded updates and compensating rollback, not MongoDB transactions. For production or concurrent finance/stock workloads, use a MongoDB replica set and add transaction-backed posting services.
- Live API/database flows could not be exercised in this workspace because no MongoDB instance or Atlas credentials are configured.
## Beginner setup on Windows

Node.js 20.19+ is required. This workspace has Node.js 24.18.0. No local MongoDB server is available in this workspace: `mongod` and `mongosh` were not found on PATH, the local database port 27017 did not respond, and the service-manager query was blocked by the environment.

The simplest route that avoids installing a Windows service is a MongoDB Atlas database. Atlas currently documents a free cluster option; account creation, database-user creation, and adding your current IP address require your own Atlas account. Follow the [official Atlas free-cluster guide](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/). In Atlas:

1. Sign up or sign in, create a project, and create a free cluster.
2. Add a database user and save its password somewhere private.
3. In Network Access, add your current IP address. Avoid allowing access from every IP.
4. Choose Connect, then Drivers, and copy the connection string. Keep it private.

Then open PowerShell in this project folder and run these commands in order:

```powershell
npm install
npm run setup
```

At the MongoDB URI prompt, paste the Atlas connection string. The input is hidden while typing; press Enter to use local MongoDB instead. The setup script creates `server/.env`, generates a new random JWT signing secret, and leaves an existing `.env` untouched. It does not put credentials or secrets in source files.

Next create the first administrator:

```powershell
npm run seed
```

Enter your email, choose a password of at least 12 characters when prompted (the password input is hidden), and optionally enter a display name. The command adds sample products, a customer, a vendor, and an employee. If that administrator already exists, it keeps the existing account and password.

Start both the API and frontend:

```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Sign in with the administrator email and password you chose. Keep the PowerShell window open while using the app; press Ctrl+C there to stop both development servers.

To run checks later:

```powershell
npm test
npm run build
npm run lint -w client
```

The tests and frontend build do not require MongoDB. Login and database-backed screens do require the Atlas URI or a running local MongoDB server. A MongoDB URI or password should never be pasted into chat or committed to Git.

## Configuration reference

- `server/.env.example` is a safe template. `npm run setup` creates the ignored local `server/.env` file.
- `MONGODB_URI` points to Atlas or a local MongoDB instance.
- `JWT_SECRET` is generated randomly by setup; use your deployment secret manager in production.
- `CLIENT_ORIGIN` defaults to `http://localhost:5173`.
- The seed script reads `MONGODB_URI` from `.env` and prompts for administrator details without storing them in source.

Production deployments should use HTTPS, a managed secret store, and a MongoDB replica set. Never commit `.env` files.


