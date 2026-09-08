import React from 'react'
import type { BackupResponse, BackupStatus } from '../../../shared/types/backup.types'
import { backupApi } from '../features/backups/backup.api'

const buttonClass = 'border border-slate-600 px-4 py-2 text-sm font-semibold hover:border-amber-400 disabled:opacity-50'
export const BackupsPage = (): React.JSX.Element => {
  const [status, setStatus] = React.useState<BackupStatus | null>(null)
  const [days, setDays] = React.useState('7')
  const [busy, setBusy] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const result = await backupApi.getStatus()
      if (!result.success) throw new Error(result.error)
      setStatus(result.data)
      setDays(String(result.data.reminderDays))
      setError(null)
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível consultar os backups.') }
    finally { setLoading(false) }
  }, [])
  React.useEffect(() => { void load() }, [load])
  React.useEffect(() => {
    if (!status?.isRunning) return
    const timer = window.setInterval(() => { void load() }, 1000)
    return () => window.clearInterval(timer)
  }, [status?.isRunning, load])

  const run = async (operation: () => Promise<BackupResponse<BackupStatus>>, kind: 'create' | 'days' | 'directory') => {
    setBusy(true); setError(null); setMessage(null)
    try {
      const result = await operation()
      if (!result.success) throw new Error(result.error)
      setStatus(result.data)
      setDays(String(result.data.reminderDays))
      if (kind === 'create') setMessage(`Backup criado em ${result.data.lastBackupPath}`)
      if (kind === 'days') setMessage('Prazo do aviso salvo.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível concluir a operação de backup.') }
    finally { setBusy(false) }
  }
  const disabled = loading || busy || Boolean(status?.isRunning)
  return (
    <main className="min-w-0 flex-1 bg-slate-950 px-8 py-6 text-slate-100">
      <h1 className="text-2xl font-semibold">Backups</h1>
      <p className="mt-2 text-sm text-slate-400">Salve uma cópia do banco de dados em uma pasta de sua escolha.</p>
      {error && <div role="alert" className="mt-5 border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
      {message && <div role="status" className="mt-5 break-all border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div>}
      {loading && <p className="mt-5" role="status">Consultando backups...</p>}
      {!status && !loading && <button className={`${buttonClass} mt-5`} onClick={() => void load()}>Tentar novamente</button>}
      {status && <div className="mt-6 max-w-3xl space-y-6">
        <section className="space-y-4 border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-semibold">Backup manual</h2>
          <div><p className="text-sm text-slate-400">Pasta de destino</p><p className="mt-1 break-all">{status.destinationDirectory ?? 'Nenhuma pasta selecionada'}</p></div>
          <button type="button" className={buttonClass} disabled={disabled} onClick={() => void run(backupApi.chooseDirectory, 'directory')}>Escolher pasta</button>
          <div><p className="text-sm text-slate-400">Último backup concluído</p><p className="mt-1">{status.lastBackupAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(status.lastBackupAt)) : 'Nenhum backup realizado'}</p></div>
          {status.lastBackupPath && <p className="break-all text-sm text-slate-400">{status.lastBackupPath}</p>}
          <button type="button" className={`${buttonClass} bg-amber-400 text-slate-950`} disabled={disabled || !status.destinationDirectory} onClick={() => void run(backupApi.create, 'create')}>Gerar backup</button>
          {(busy || status.isRunning) && <p role="status" className="text-sm text-slate-400">Operação em andamento. Aguarde...</p>}
        </section>
        <form className="space-y-4 border border-slate-800 bg-slate-900/60 p-5" onSubmit={(event) => { event.preventDefault(); void run(() => backupApi.updateReminderDays(Number(days)), 'days') }}>
          <h2 className="text-lg font-semibold">Aviso no Dashboard</h2>
          <label className="block text-sm" htmlFor="backup-days">Avisar após quantos dias sem backup?</label>
          <input id="backup-days" type="number" min="1" step="1" required disabled={disabled} value={days} onChange={(event) => setDays(event.target.value)} className="w-32 border border-slate-600 bg-slate-950 px-3 py-2" />
          <p className="text-sm text-slate-400">Enquanto nenhum backup tiver sido realizado, o aviso será exibido imediatamente.</p>
          <button type="submit" disabled={disabled} className={buttonClass}>Salvar prazo</button>
        </form>
      </div>}
    </main>
  )
}
