import electron from 'electron'
import { BACKUP_IPC_CHANNELS } from '../../shared/constants/backup.constants'
import * as backups from '../services/backup.service'

export const registerBackupIpc = (): void => {
  const { ipcMain, dialog, BrowserWindow } = electron
  ipcMain.handle(BACKUP_IPC_CHANNELS.getStatus, () => backups.getStatus())
  ipcMain.handle(BACKUP_IPC_CHANNELS.updateReminderDays, (_event, days) => backups.updateReminderDays(days))
  ipcMain.handle(BACKUP_IPC_CHANNELS.create, () => backups.create())
  ipcMain.handle(BACKUP_IPC_CHANNELS.chooseDirectory, (event) => backups.chooseDirectory(async () => {
    const parent = BrowserWindow.fromWebContents(event.sender)
    const current = backups.getStatus()
    const options: Electron.OpenDialogOptions = {
      title: 'Escolher pasta de backup', properties: ['openDirectory', 'createDirectory'],
      defaultPath: current.success ? current.data.destinationDirectory ?? undefined : undefined
    }
    const result = await (parent ? dialog.showOpenDialog(parent, options) : dialog.showOpenDialog(options))
    return result.canceled ? null : result.filePaths[0] ?? null
  }))
}
