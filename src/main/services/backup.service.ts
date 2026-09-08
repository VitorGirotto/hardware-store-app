import { constants } from 'node:fs'
import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { initializeDatabase } from '../db'
import { readBackupSettings, updateBackupSettings } from '../repositories/backup.repository'
import type { BackupResponse, BackupStatus } from '../../shared/types/backup.types'

let busy = false
export const isBackupOverdue = (lastBackupAt: string | null, days: number, now = Date.now()): boolean =>
  lastBackupAt === null || now - Date.parse(lastBackupAt) > days * 86_400_000

const status = (): BackupStatus => {
  const settings = readBackupSettings()
  return { ...settings, isRunning: busy, isOverdue: isBackupOverdue(settings.lastBackupAt, settings.reminderDays) }
}
const failure = (error: string): BackupResponse<never> => ({ success: false, error })
export const getStatus = (): BackupResponse<BackupStatus> => {
  try { return { success: true, data: status() } }
  catch { return failure('Não foi possível consultar as configurações de backup.') }
}
export const updateReminderDays = (input: unknown): BackupResponse<BackupStatus> => {
  if (busy) return failure('Aguarde a conclusão da operação de backup.')
  const parsed = z.number().int().positive().safeParse(input)
  if (!parsed.success) return failure('Informe um número inteiro positivo de dias.')
  try {
    updateBackupSettings({ reminderDays: parsed.data })
    return getStatus()
  } catch { return failure('Não foi possível salvar o prazo do aviso.') }
}

// The picker runs in main; holding the lock also prevents a backup starting while it is open.
export const chooseDirectory = async (pick: () => Promise<string | null>): Promise<BackupResponse<BackupStatus>> => {
  if (busy) return failure('Aguarde a conclusão da operação de backup.')
  busy = true
  try {
    const directory = await pick()
    if (directory !== null) updateBackupSettings({ destinationDirectory: directory })
  } catch { return failure('Não foi possível selecionar ou salvar a pasta de backup.') }
  finally { busy = false }
  return getStatus()
}

export const backupFileName = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}`
}

export const create = async (): Promise<BackupResponse<BackupStatus>> => {
  if (busy) return failure('Já existe uma operação de backup em andamento.')
  busy = true
  let temporaryDirectory: string | undefined
  let publishedPath: string | undefined
  try {
    const settings = readBackupSettings()
    if (!settings.destinationDirectory) return failure('Escolha uma pasta de destino antes de gerar o backup.')
    const name = backupFileName(new Date())
    temporaryDirectory = await mkdtemp(join(settings.destinationDirectory, '.backup-'))
    const temporaryFile = join(temporaryDirectory, 'backup.db')
    await initializeDatabase().backup(temporaryFile)
    // COPYFILE_EXCL works on removable filesystems as well as local disks.
    for (let suffix = 0; ; suffix++) {
      const destination = join(settings.destinationDirectory, `${name}${suffix ? `-${suffix}` : ''}.db`)
      try {
        await copyFile(temporaryFile, destination, constants.COPYFILE_EXCL)
        publishedPath = destination
        break
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      }
    }
    updateBackupSettings({ lastBackupAt: new Date().toISOString(), lastBackupPath: publishedPath })
  } catch {
    return failure(publishedPath
      ? `Backup criado em ${publishedPath}, mas não foi possível registrar a conclusão no banco. A data anterior foi mantida.`
      : 'Não foi possível gerar o backup. Verifique se a pasta está disponível, possui espaço livre e permite gravação.')
  } finally {
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined)
    busy = false
  }
  return getStatus()
}
