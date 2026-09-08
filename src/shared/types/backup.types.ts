export type BackupSettings = {
  destinationDirectory: string | null
  reminderDays: number
  lastBackupAt: string | null
  lastBackupPath: string | null
}
export type BackupStatus = BackupSettings & { isOverdue: boolean; isRunning: boolean }
export type BackupResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }
