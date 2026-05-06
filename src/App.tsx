import { useEffect, useMemo, useState } from 'react'
import { InventoryProcess } from './pages/InventoryProcess'
import { LineOrderDelivery } from './pages/LineOrderDelivery'
import { SalesDashboard } from './pages/SalesDashboard'
import { VoiceAndSNS } from './pages/VoiceAndSNS'

type AppSection = 'sales' | 'inventory' | 'voice' | 'line'

const STORAGE_KEY = 'yamada-ya:active-section'

const SECTIONS: Array<{ id: AppSection; label: string }> = [
  { id: 'sales', label: '分析' },
  { id: 'inventory', label: '在庫/工程' },
  { id: 'voice', label: 'お客様の声' },
  { id: 'line', label: 'LINE/配送' },
]

function App() {
  const [active, setActive] = useState<AppSection>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'sales' || saved === 'inventory' || saved === 'voice' || saved === 'line') {
      return saved
    }
    return 'sales'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, active)
  }, [active])

  const content = useMemo(() => {
    switch (active) {
      case 'sales':
        return <SalesDashboard />
      case 'inventory':
        return <InventoryProcess />
      case 'voice':
        return <VoiceAndSNS />
      case 'line':
        return <LineOrderDelivery />
      default:
        return null
    }
  }, [active])

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green text-sm font-semibold text-white">
              山
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold tracking-wide text-slate-600">
                山田屋醸造
              </div>
              <div className="text-base font-semibold text-brand-navy">
                山田屋醸造 DXアシスタント
              </div>
            </div>
          </div>

          <div className="hidden gap-2 md:flex">
            {SECTIONS.map((item) => {
              const isActive = item.id === active
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(item.id)}
                  className={[
                    'rounded-full px-3 py-1.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-brand-green text-white'
                      : 'text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[240px_1fr] md:py-6">
        <aside className="hidden md:block">
          <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-card">
            <div className="px-3 pb-2 pt-3 text-xs font-semibold tracking-wide text-slate-500">
              機能メニュー
            </div>
            <div className="space-y-1">
              {SECTIONS.map((item) => {
                const isActive = item.id === active
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(item.id)}
                    className={[
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition',
                      isActive
                        ? 'bg-brand-green/10 text-brand-navy'
                        : 'text-slate-700 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    <span>{item.label}</span>
                    <span
                      className={[
                        'h-2 w-2 rounded-full',
                        isActive ? 'bg-brand-green' : 'bg-slate-300',
                      ].join(' ')}
                    />
                  </button>
                )
              })}
            </div>
          </nav>
        </aside>

        <main className="pb-20 md:pb-0">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card md:p-6">
            {content}
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-4">
          {SECTIONS.map((item) => {
            const isActive = item.id === active
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(item.id)}
                className={[
                  'px-2 py-2 text-xs font-semibold',
                  isActive ? 'text-brand-green' : 'text-slate-600',
                ].join(' ')}
              >
                <div
                  className={[
                    'mx-auto mb-1 h-1.5 w-8 rounded-full',
                    isActive ? 'bg-brand-green' : 'bg-transparent',
                  ].join(' ')}
                />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default App
