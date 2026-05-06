import { useMemo, useState } from 'react'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

type CustomerSegment = 'repeat' | 'new' | 'risk'

type Customer = {
  id: string
  name: string
  segment: CustomerSegment
  lastPurchaseISO: string
  products: string[]
  totalSpendJPY: number
  purchaseCount: number
  memo: string
}

const SEGMENTS: Array<{ id: CustomerSegment; label: string; badge: string }> = [
  { id: 'repeat', label: 'リピート顧客', badge: '安定' },
  { id: 'new', label: '新規顧客', badge: '伸びしろ' },
  { id: 'risk', label: '離反リスク顧客', badge: '要フォロー' },
]

const MONTHLY_SALES: Array<{ ym: string; salesJPY: number; orders: number }> = [
  { ym: '2025/06', salesJPY: 1280000, orders: 312 },
  { ym: '2025/07', salesJPY: 1420000, orders: 335 },
  { ym: '2025/08', salesJPY: 1550000, orders: 360 },
  { ym: '2025/09', salesJPY: 1480000, orders: 342 },
  { ym: '2025/10', salesJPY: 1670000, orders: 388 },
  { ym: '2025/11', salesJPY: 1760000, orders: 402 },
  { ym: '2025/12', salesJPY: 2140000, orders: 480 },
  { ym: '2026/01', salesJPY: 1710000, orders: 410 },
  { ym: '2026/02', salesJPY: 1600000, orders: 395 },
  { ym: '2026/03', salesJPY: 1820000, orders: 428 },
  { ym: '2026/04', salesJPY: 1690000, orders: 404 },
  { ym: '2026/05', salesJPY: 1960000, orders: 452 },
]

const PRODUCT_SHARE: Array<{ name: string; ratio: number }> = [
  { name: 'うまくち醤油', ratio: 0.36 },
  { name: 'ヤマキュウ味噌', ratio: 0.29 },
  { name: '防災お味噌', ratio: 0.18 },
  { name: 'その他', ratio: 0.17 },
]

const CUSTOMERS: Customer[] = [
  {
    id: 'c-001',
    name: '佐藤 恒一',
    segment: 'repeat',
    lastPurchaseISO: '2026-04-28',
    products: ['ヤマキュウ味噌', 'うまくち醤油'],
    totalSpendJPY: 48200,
    purchaseCount: 9,
    memo: '味噌のまとめ買いが多い。定期便に誘導すると伸びそう。',
  },
  {
    id: 'c-002',
    name: '高橋 みさき',
    segment: 'repeat',
    lastPurchaseISO: '2026-05-02',
    products: ['防災お味噌', 'ヤマキュウ味噌'],
    totalSpendJPY: 32800,
    purchaseCount: 6,
    memo: '防災意識が高い。備蓄セットの提案が刺さる。',
  },
  {
    id: 'c-003',
    name: '鈴木 雅人',
    segment: 'repeat',
    lastPurchaseISO: '2026-04-19',
    products: ['うまくち醤油'],
    totalSpendJPY: 21900,
    purchaseCount: 7,
    memo: '醤油リピート中心。レシピの同梱が効果的。',
  },
  {
    id: 'c-101',
    name: '伊藤 結衣',
    segment: 'new',
    lastPurchaseISO: '2026-05-05',
    products: ['うまくち醤油'],
    totalSpendJPY: 3200,
    purchaseCount: 1,
    memo: '初回購入。使い方の提案があると次回につながる。',
  },
  {
    id: 'c-102',
    name: '田中 拓海',
    segment: 'new',
    lastPurchaseISO: '2026-04-30',
    products: ['ヤマキュウ味噌'],
    totalSpendJPY: 4200,
    purchaseCount: 1,
    memo: 'ギフト用途。熨斗や手土産提案の導線を用意。',
  },
  {
    id: 'c-103',
    name: '山本 さゆり',
    segment: 'new',
    lastPurchaseISO: '2026-04-26',
    products: ['防災お味噌'],
    totalSpendJPY: 5100,
    purchaseCount: 1,
    memo: '防災系の投稿・記事から流入の想定。',
  },
  {
    id: 'c-201',
    name: '小林 圭介',
    segment: 'risk',
    lastPurchaseISO: '2026-01-11',
    products: ['ヤマキュウ味噌'],
    totalSpendJPY: 16700,
    purchaseCount: 3,
    memo: '前回購入から間隔が空いている。季節の味噌レシピで再喚起。',
  },
  {
    id: 'c-202',
    name: '加藤 ひろみ',
    segment: 'risk',
    lastPurchaseISO: '2025-12-23',
    products: ['うまくち醤油', 'ヤマキュウ味噌'],
    totalSpendJPY: 24300,
    purchaseCount: 4,
    memo: '年末購入のみで止まっている。限定セットの案内が良い。',
  },
  {
    id: 'c-203',
    name: '渡辺 直子',
    segment: 'risk',
    lastPurchaseISO: '2025-11-18',
    products: ['防災お味噌'],
    totalSpendJPY: 9600,
    purchaseCount: 2,
    memo: '備蓄消費のタイミング。買い足しリマインドが有効。',
  },
]

function formatJPY(amount: number) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateJP(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

function segmentLabel(id: CustomerSegment) {
  switch (id) {
    case 'repeat':
      return 'リピート顧客'
    case 'new':
      return '新規顧客'
    case 'risk':
      return '離反リスク顧客'
    default:
      return ''
  }
}

function segmentTone(id: CustomerSegment) {
  switch (id) {
    case 'repeat':
      return 'bg-brand-green/10 text-brand-navy border-brand-green/20'
    case 'new':
      return 'bg-sky-50 text-slate-800 border-sky-100'
    case 'risk':
      return 'bg-amber-50 text-slate-800 border-amber-100'
    default:
      return 'bg-slate-50 text-slate-800 border-slate-200'
  }
}

function aiActionHint(c: Customer) {
  if (c.segment === 'risk') {
    if (c.products.includes('ヤマキュウ味噌')) return '季節の味噌レシピ＋お得なセットのDM'
    if (c.products.includes('防災お味噌')) return '買い足しリマインド＋備蓄チェックリスト送付'
    return '近況確認＋人気商品のおすすめDM'
  }
  if (c.segment === 'new') {
    if (c.products.includes('うまくち醤油')) return 'うまくち醤油の使い方（簡単レシピ）を提案'
    if (c.products.includes('ヤマキュウ味噌')) return '味噌汁以外のアレンジレシピを提案'
    return '初回お礼＋次回10%OFFの案内'
  }
  if (c.products.includes('防災お味噌')) return '備蓄セットの定期便を提案'
  return '定番商品のまとめ買い／定期便の案内'
}

function changeLabel(rate: number) {
  if (!Number.isFinite(rate)) return '—'
  const sign = rate >= 0 ? '+' : ''
  return `${sign}${(rate * 100).toFixed(1)}%`
}

export function SalesDashboard() {
  const [segment, setSegment] = useState<CustomerSegment>('repeat')
  const [selected, setSelected] = useState<Customer | null>(null)

  const kpis = useMemo(() => {
    const last = MONTHLY_SALES[MONTHLY_SALES.length - 1]
    const prev = MONTHLY_SALES[MONTHLY_SALES.length - 2]
    const mom = (last.salesJPY - prev.salesJPY) / prev.salesJPY
    const repeatRate = 0.62
    return {
      thisMonthSalesJPY: last.salesJPY,
      thisMonthOrders: last.orders,
      momSalesRate: mom,
      repeatRate,
    }
  }, [])

  const customersBySegment = useMemo(() => {
    const map: Record<CustomerSegment, Customer[]> = {
      repeat: [],
      new: [],
      risk: [],
    }
    for (const c of CUSTOMERS) map[c.segment].push(c)
    return map
  }, [])

  const barData = useMemo(() => {
    return {
      labels: MONTHLY_SALES.map((m) => m.ym),
      datasets: [
        {
          label: '売上（円）',
          data: MONTHLY_SALES.map((m) => m.salesJPY),
          backgroundColor: 'rgba(39, 174, 96, 0.85)',
          borderColor: 'rgba(39, 174, 96, 1)',
          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    }
  }, [])

  const barOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: { raw: unknown }) => {
              const v = typeof ctx.raw === 'number' ? ctx.raw : 0
              return ` ${formatJPY(v)}`
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: string | number) => {
              const v = typeof value === 'number' ? value : Number(value)
              if (!Number.isFinite(v)) return ''
              return `${Math.round(v / 10000)}万`
            },
          },
        },
      },
    }
  }, [])

  const pieData = useMemo(() => {
    return {
      labels: PRODUCT_SHARE.map((p) => p.name),
      datasets: [
        {
          data: PRODUCT_SHARE.map((p) => Math.round(p.ratio * 100)),
          backgroundColor: [
            'rgba(44, 62, 80, 0.9)',
            'rgba(39, 174, 96, 0.9)',
            'rgba(59, 130, 246, 0.75)',
            'rgba(148, 163, 184, 0.8)',
          ],
          borderColor: 'rgba(255, 255, 255, 1)',
          borderWidth: 2,
        },
      ],
    }
  }, [])

  const pieOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: { boxWidth: 12, boxHeight: 12 },
        },
        tooltip: {
          callbacks: {
            label: (ctx: { label?: string; raw: unknown }) => {
              const v = typeof ctx.raw === 'number' ? ctx.raw : 0
              return ` ${ctx.label ?? ''}: ${v}%`
            },
          },
        },
      },
    }
  }, [])

  const segmentCounts = useMemo(() => {
    return {
      repeat: customersBySegment.repeat.length,
      new: customersBySegment.new.length,
      risk: customersBySegment.risk.length,
    }
  }, [customersBySegment])

  const visibleCustomers = customersBySegment[segment]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-navy">
          売上・顧客分析ダッシュボード
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          過去の売上データから購買傾向を把握し、次のアクションを素早く決めるための画面です（モックデータ）。
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            今月の売上
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
            {formatJPY(kpis.thisMonthSalesJPY)}
          </div>
          <div className="mt-2 inline-flex items-center gap-2 text-xs">
            <span className="rounded-full bg-brand-green/10 px-2 py-1 font-semibold text-brand-navy">
              前月比 {changeLabel(kpis.momSalesRate)}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            今月の注文件数
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
            {kpis.thisMonthOrders.toLocaleString()} 件
          </div>
          <div className="mt-2 text-xs text-slate-600">EC＋直販の合算想定</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            リピート率
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
            {pct(kpis.repeatRate)}
          </div>
          <div className="mt-2 text-xs text-slate-600">直近90日ベース想定</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            要フォロー顧客
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
            {segmentCounts.risk.toLocaleString()} 人
          </div>
          <div className="mt-2 text-xs text-slate-600">
            最終購入から一定期間経過の想定
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-brand-navy">
                売上推移（過去12か月）
              </div>
              <div className="mt-1 text-xs text-slate-600">
                棒グラフはホバーで金額表示
              </div>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              直近: {MONTHLY_SALES[MONTHLY_SALES.length - 1].ym}
            </div>
          </div>
          <div className="mt-4 h-64">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-sm font-semibold text-brand-navy">
            商品別売上構成比
          </div>
          <div className="mt-1 text-xs text-slate-600">
            主要商品の比率（モック）
          </div>
          <div className="mt-4 h-64">
            <Pie data={pieData} options={pieOptions} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold text-brand-navy">
              顧客セグメント分析
            </div>
            <div className="mt-1 text-xs text-slate-600">
              セグメントを選ぶと顧客リストが切り替わります。行クリックで詳細（モック）を表示。
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {SEGMENTS.map((s) => {
              const active = s.id === segment
              const count = segmentCounts[s.id]
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSegment(s.id)}
                  className={[
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    active
                      ? 'border-brand-green bg-brand-green/10 text-brand-navy'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <span>{s.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-500">
              リピート顧客
            </div>
            <div className="mt-1 text-lg font-semibold text-brand-navy">
              {segmentCounts.repeat} 人
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-500">新規顧客</div>
            <div className="mt-1 text-lg font-semibold text-brand-navy">
              {segmentCounts.new} 人
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-500">
              離反リスク顧客
            </div>
            <div className="mt-1 text-lg font-semibold text-brand-navy">
              {segmentCounts.risk} 人
            </div>
          </div>
        </div>

        <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 md:block">
          <table className="w-full table-auto">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  氏名
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  セグメント
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  最終購入日
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  購入商品
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                  累計購入
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {visibleCustomers.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setSelected(c)}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {c.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                        segmentTone(c.segment),
                      ].join(' ')}
                    >
                      {segmentLabel(c.segment)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {formatDateJP(c.lastPurchaseISO)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {c.products.join('、')}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                    {formatJPY(c.totalSpendJPY)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-2 md:hidden">
          {visibleCustomers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  {c.name}
                </div>
                <span
                  className={[
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                    segmentTone(c.segment),
                  ].join(' ')}
                >
                  {segmentLabel(c.segment)}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-600">
                最終購入: {formatDateJP(c.lastPurchaseISO)}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                商品: {c.products.join('、')}
              </div>
              <div className="mt-2 text-sm font-semibold text-brand-navy">
                {formatJPY(c.totalSpendJPY)}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-brand-navy">
              レコメンデーション（AI提案イメージ）
            </div>
            <div className="mt-1 text-xs text-slate-600">
              実際のAI連携前提で、次アクションの例を表示しています。
            </div>
          </div>
          <div className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-navy">
            今日の提案
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">
              離反リスク顧客
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              「ヤマキュウ味噌」購入者へ季節レシピDM
            </div>
            <div className="mt-2 text-xs text-slate-600">
              最終購入から90日以上の顧客を優先。限定セットの導線を同封。
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">新規顧客</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              うまくち醤油の“10分レシピ”を提案
            </div>
            <div className="mt-2 text-xs text-slate-600">
              初回購入7日以内にフォロー。次回購入率を押し上げ。
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">
              リピート顧客
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              防災お味噌の備蓄セットを定期化
            </div>
            <div className="mt-2 text-xs text-slate-600">
              まとめ買い傾向の顧客に“買い忘れ防止”を訴求。
            </div>
          </div>
        </div>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-4 md:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  顧客詳細（モック）
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {selected.name}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                      segmentTone(selected.segment),
                    ].join(' ')}
                  >
                    {segmentLabel(selected.segment)}
                  </span>
                  <span className="text-xs text-slate-600">
                    最終購入: {formatDateJP(selected.lastPurchaseISO)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                閉じる
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">
                    購入回数
                  </div>
                  <div className="mt-1 text-base font-semibold text-brand-navy">
                    {selected.purchaseCount} 回
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">
                    累計購入
                  </div>
                  <div className="mt-1 text-base font-semibold text-brand-navy">
                    {formatJPY(selected.totalSpendJPY)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">
                    購入商品
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {selected.products.join('、')}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-semibold tracking-wide text-slate-500">
                  メモ
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  {selected.memo}
                </div>
              </div>

              <div className="rounded-lg border border-brand-green/20 bg-brand-green/10 p-3">
                <div className="text-xs font-semibold tracking-wide text-brand-navy">
                  AI提案（次アクション）
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {aiActionHint(selected)}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                閉じる
              </button>
              <button
                type="button"
                className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
              >
                DM案を作成（モック）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
