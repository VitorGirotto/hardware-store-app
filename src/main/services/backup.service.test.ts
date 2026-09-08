import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../db/schema'
import * as repository from '../repositories/backup.repository'
import { backupFileName, chooseDirectory, create, getStatus, isBackupOverdue, updateReminderDays } from './backup.service'

const connection = vi.hoisted(() => ({ db: null as unknown as Database.Database }))
vi.mock('../db', () => ({ initializeDatabase: () => connection.db, getDatabase: () => drizzle(connection.db, { schema }) }))
let directory: string
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'backup-test-'))
  connection.db = new Database(join(directory, 'source.db'))
  connection.db.pragma('journal_mode = WAL')
  connection.db.pragma('wal_autocheckpoint = 0')
  migrate(drizzle(connection.db), { migrationsFolder: join(process.cwd(), 'drizzle') })
})
afterEach(() => {
  vi.restoreAllMocks()
  connection.db.close()
  rmSync(directory, { recursive: true, force: true })
})
const status = () => {
  const result = getStatus()
  if (!result.success) throw new Error(result.error)
  return result.data
}

describe('backups', () => {
  it('initializes defaults and persists settings across connection reopen; cancellation preserves destination', async () => {
    expect(status()).toMatchObject({ reminderDays: 7, lastBackupAt: null, destinationDirectory: null, isOverdue: true })
    await chooseDirectory(async () => directory)
    expect(updateReminderDays(3).success).toBe(true)
    await chooseDirectory(async () => null)
    connection.db.close()
    connection.db = new Database(join(directory, 'source.db'))
    expect(status()).toMatchObject({ reminderDays: 3, destinationDirectory: directory })
    for (const invalid of [0, -1, 1.5, '7', NaN, Infinity]) expect(updateReminderDays(invalid).success).toBe(false)
    expect(status().reminderDays).toBe(3)
  })
  it('copies committed WAL data into an independent valid database without overwriting collisions', async () => {
    await chooseDirectory(async () => directory)
    connection.db.exec("CREATE TABLE backup_probe (value TEXT); INSERT INTO backup_probe VALUES ('recent WAL data')")
    const name = backupFileName(new Date())
    const existing = join(directory, `${name}.db`)
    writeFileSync(existing, 'keep this backup')
    const result = await create()
    expect(result.success).toBe(true)
    const saved = status()
    expect(saved.lastBackupPath).not.toBe(existing)
    expect(readFileSync(existing, 'utf8')).toBe('keep this backup')
    const copy = new Database(saved.lastBackupPath!, { readonly: true })
    expect(copy.pragma('integrity_check', { simple: true })).toBe('ok')
    expect(copy.prepare('SELECT value FROM backup_probe').pluck().get()).toBe('recent WAL data')
    copy.close()
    expect(saved.isOverdue).toBe(false)
    expect(saved.lastBackupAt).toMatch(/Z$/)
    expect(readdirSync(directory).some((file) => file.startsWith('.backup-'))).toBe(false)
  })
  it('handles missing destination and failed backup without advancing the last date', async () => {
    expect((await create()).success).toBe(false)
    await chooseDirectory(async () => join(directory, 'missing'))
    expect((await create()).success).toBe(false)
    await chooseDirectory(async () => directory)
    await create()
    const previous = status().lastBackupAt
    vi.spyOn(connection.db, 'backup').mockRejectedValueOnce(new Error('disk full'))
    expect((await create()).success).toBe(false)
    expect(status().lastBackupAt).toBe(previous)
    expect(status().isRunning).toBe(false)
    expect(readdirSync(directory).some((file) => file.startsWith('.backup-'))).toBe(false)
  })
  it('reports a published file when recording completion fails', async () => {
    await chooseDirectory(async () => directory)
    vi.spyOn(repository, 'updateBackupSettings').mockImplementationOnce(() => { throw new Error('write failure') })
    const result = await create()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('mas não foi possível registrar')
    expect(status().lastBackupAt).toBeNull()
    expect(readdirSync(directory).filter((file) => file.startsWith('backup-'))).toHaveLength(1)
  })
  it('rejects concurrent creation and settings changes', async () => {
    await chooseDirectory(async () => directory)
    const pending = create()
    expect(status().isRunning).toBe(true)
    expect((await create()).success).toBe(false)
    expect(updateReminderDays(2).success).toBe(false)
    const picker = vi.fn(async () => directory)
    expect((await chooseDirectory(picker)).success).toBe(false)
    expect(picker).not.toHaveBeenCalled()
    expect((await pending).success).toBe(true)
  })
  it('uses local filename components and strictly more than X elapsed days', () => {
    expect(backupFileName(new Date(2026, 6, 23, 14, 30))).toBe('backup-2026-07-23-14-30')
    const now = Date.parse('2026-09-08T12:00:00Z')
    expect(isBackupOverdue(null, 7, now)).toBe(true)
    expect(isBackupOverdue('2026-09-01T12:00:00Z', 7, now)).toBe(false)
    expect(isBackupOverdue('2026-09-01T12:00:00Z', 7, now + 1)).toBe(true)
    expect(isBackupOverdue('2026-09-01T12:00:00Z', 8, now + 1)).toBe(false)
  })
})
