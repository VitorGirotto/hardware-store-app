import React from 'react'
import ReactDOM from 'react-dom/client'
import { CustomersPage } from './pages/CustomersPage'
import { InventoryPage } from './pages/InventoryPage'
import { ProductsPage } from './pages/ProductsPage'
import './styles.css'

const pages = ['Dashboard', 'Produtos', 'Clientes', 'Vendas', 'Estoque', 'Caixa', 'Relatórios', 'Configurações'] as const

type Page = (typeof pages)[number]

type SidebarProps = {
  activePage: Page
  onPageChange: (page: Page) => void
}

const Sidebar = ({ activePage, onPageChange }: SidebarProps): React.JSX.Element => {
  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-4 py-5">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-amber-400 text-sm font-bold text-slate-950">
          HS
        </div>
        <div>
          <p className="text-base font-semibold text-slate-50">Hardware Store</p>
          <p className="text-xs text-slate-400">Gestão</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Menu principal">
        {pages.map((page) => {
          const isActive = page === activePage

          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={[
                'w-full rounded-md px-3 py-2.5 text-left text-sm font-medium transition',
                isActive
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-slate-50'
              ].join(' ')}
            >
              {page}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

type HeaderProps = {
  activePage: Page
}

const Header = ({ activePage }: HeaderProps): React.JSX.Element => {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-amber-400 text-xs font-bold text-slate-950">
          HS
        </div>
        <span className="text-sm font-semibold text-slate-100">{activePage}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-100">Usuario</p>
          <p className="text-xs text-slate-400">Operador</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200">
          US
        </div>
      </div>
    </header>
  )
}

type PlaceholderPageProps = {
  page: Page
}

const PlaceholderPage = ({ page }: PlaceholderPageProps): React.JSX.Element => {
  return (
    <main className="flex flex-1 flex-col bg-slate-950 px-8 py-7 text-slate-100">
      <h1 className="text-2xl font-semibold">{page}</h1>

      <section className="flex flex-1 items-center justify-center">
        <p className="text-3xl font-semibold text-slate-200">Olá, Usuario</p>
      </section>
    </main>
  )
}

const App = (): React.JSX.Element => {
  const [activePage, setActivePage] = React.useState<Page>('Dashboard')

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header activePage={activePage} />
        {activePage === 'Produtos' ? (
          <ProductsPage />
        ) : activePage === 'Clientes' ? (
          <CustomersPage />
        ) : activePage === 'Estoque' ? (
          <InventoryPage />
        ) : (
          <PlaceholderPage page={activePage} />
        )}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
