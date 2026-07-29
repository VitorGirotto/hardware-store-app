import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import * as schema from './schema'

let sqlite: Database.Database | null = null

export const getDatabasePath = (): string => join(app.getPath('userData'), 'hardware-store.db')

export const initializeDatabase = (): Database.Database => {
  if (sqlite) {
    return sqlite
  }

  const databasePath = getDatabasePath()
  mkdirSync(dirname(databasePath), { recursive: true })

  sqlite = new Database(databasePath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  return sqlite
}

export const getDatabase = () => {
  const connection = initializeDatabase()
  return drizzle(connection, { schema })
}
