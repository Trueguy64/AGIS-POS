# AGIS Gold POS

Point of sale for a gold shop. Items are priced live: `weight × purity × gold rate (THB/g) + labor fee`.
Adapted from [CSC105-G01-ONE-POS](https://github.com/Trueguy64/CSC105-G01-ONE-POS).

## Run

```sh
npm run setup   # installs web + server deps, creates SQLite db, seeds gold items
npm run dev     # Vite on :5173, API on :3000
```

Register a **Manager** account at `/register` to edit inventory, categories and promos.
Employees can sell. PromptPay QR codes use the logged-in user's phone number.

The gold rate comes from Swissquote XAU/USD × the ECB USD/THB rate (Frankfurter), cached 60 s in `server/src/routes/gold.ts`.
