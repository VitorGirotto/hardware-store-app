import { defineConfig } from 'drizzle-kit'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { resolveConfiguredDatabase } from './src/main/db/config'

const database = resolveConfiguredDatabase()
mkdirSync(dirname(database.path), { recursive: true })

export default defineConfig({
  schema: './src/main/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: database.path
  }
})
