# Drizzle migrations

Run `npm run db:generate` after changing `src/main/db/schema.ts` to generate SQL migration files in this directory.

Migration 0005 fills old item names from the current product catalog; the original historical name cannot be recovered. Old item discounts are initialized to zero. A sale without a cash register aborts migration instead of assigning a fabricated register. Table rebuilds temporarily copy dependent records inside the migrator's transaction, keep foreign keys enabled, and recreate existing cash-register triggers.
