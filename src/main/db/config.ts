import { isAbsolute, join, resolve } from 'node:path'

export const DATABASE_FILE_NAME = 'hardware-store.db'
export const DATABASE_FOLDER_NAME = 'database'

export const databaseEnvironments = ['development', 'test', 'production'] as const

export type DatabaseEnvironment = (typeof databaseEnvironments)[number]

export type DatabaseConfig = {
  environment: DatabaseEnvironment
  path: string
}

const isDatabaseEnvironment = (value: string): value is DatabaseEnvironment =>
  databaseEnvironments.includes(value as DatabaseEnvironment)

export const resolveDatabaseEnvironment = (
  value = process.env.HARDWARE_STORE_DB_ENV
): DatabaseEnvironment => {
  if (value && isDatabaseEnvironment(value)) {
    return value
  }

  throw new Error(
    `HARDWARE_STORE_DB_ENV must be one of: ${databaseEnvironments.join(', ')}`
  )
}

export const resolveDatabasePath = (
  value = process.env.HARDWARE_STORE_DB_PATH,
  basePath = process.cwd()
): string => {
  if (!value) {
    throw new Error('HARDWARE_STORE_DB_PATH must be set before opening the database')
  }

  return isAbsolute(value) ? value : resolve(basePath, value)
}

export const resolveConfiguredDatabase = (): DatabaseConfig => ({
  environment: resolveDatabaseEnvironment(),
  path: resolveDatabasePath()
})

export const getUserDataDatabasePath = (userDataPath: string): string =>
  join(userDataPath, DATABASE_FOLDER_NAME, DATABASE_FILE_NAME)
