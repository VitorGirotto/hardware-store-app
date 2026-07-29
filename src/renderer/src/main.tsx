import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

const App = (): React.JSX.Element => {
  const [databasePath, setDatabasePath] = React.useState<string>('Loading...')

  React.useEffect(() => {
    window.hardwareStore.getDatabasePath().then(setDatabasePath).catch(() => {
      setDatabasePath('Could not load database path')
    })
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-6 px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">Hardware Store MVP</p>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Initial setup is ready.</h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Electron, React, Vite, TypeScript, Tailwind, SQLite, Drizzle, Zod, and Electron Builder are configured so you can start building the MVP screens.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300 shadow-xl">
          <p className="font-medium text-slate-100">SQLite database location</p>
          <p className="mt-2 break-all font-mono">{databasePath}</p>
        </div>
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
