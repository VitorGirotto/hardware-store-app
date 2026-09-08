export const backupApi = {
  getStatus: () => window.hardwareStore.backups.getStatus(),
  chooseDirectory: () => window.hardwareStore.backups.chooseDirectory(),
  updateReminderDays: (days: number) => window.hardwareStore.backups.updateReminderDays(days),
  create: () => window.hardwareStore.backups.create()
}
