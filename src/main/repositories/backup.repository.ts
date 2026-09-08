import { eq } from 'drizzle-orm'
import { getDatabase } from '../db'
import { backupSettings } from '../db/schema'
import type { BackupSettings } from '../../shared/types/backup.types'

export const readBackupSettings = (): BackupSettings => {
  const db = getDatabase()
  db.insert(backupSettings).values({ id: 1 }).onConflictDoNothing().run()
  return db.select().from(backupSettings).where(eq(backupSettings.id, 1)).get()!
}
export const updateBackupSettings = (settings: Partial<BackupSettings>): void => {
  readBackupSettings()
  getDatabase().update(backupSettings).set(settings).where(eq(backupSettings.id, 1)).run()
}
