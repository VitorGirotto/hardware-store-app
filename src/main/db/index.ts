import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  getUserDataDatabasePath,
  resolveConfiguredDatabase,
  type DatabaseConfig
} from './config'
import * as schema from './schema'

let sqlite: Database.Database | null = null
let databaseConfig: DatabaseConfig | null = null

const getMigrationsFolderPath = (): string =>
  app.isPackaged
    ? join(__dirname, '../../drizzle')
    : join(process.cwd(), 'drizzle')

const getRuntimeDatabaseConfig = (): DatabaseConfig => {
  if (process.env.HARDWARE_STORE_DB_PATH) {
    return resolveConfiguredDatabase()
  }

  if (app.isPackaged) {
    return {
      environment: 'production',
      path: getUserDataDatabasePath(app.getPath('userData'))
    }
  }

  return resolveConfiguredDatabase()
}

export const getDatabasePath = (): string => {
  databaseConfig ??= getRuntimeDatabaseConfig()
  return databaseConfig.path
}

export const initializeDatabase = (): Database.Database => {
  if (sqlite) {
    return sqlite
  }

  const databasePath = getDatabasePath()
  mkdirSync(dirname(databasePath), { recursive: true })

  sqlite = new Database(databasePath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: getMigrationsFolderPath() })

  return sqlite
}

export const getDatabase = () => {
  const connection = initializeDatabase()
  return drizzle(connection, { schema })
}
