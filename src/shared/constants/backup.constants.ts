export const BACKUP_IPC_CHANNELS = {
  getStatus: 'backups:get-status',
  chooseDirectory: 'backups:choose-directory',
  updateReminderDays: 'backups:update-reminder-days',
  create: 'backups:create'
} as const
