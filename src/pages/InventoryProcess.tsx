import { useMemo, useState } from 'react'

type TankStage =
  | '仕込み'
  | '発酵'
  | '熟成'
  | '圧搾'
  | '火入れ'
  | '充填'
  | '出荷'

type Tank = {
  id: string
  batchName: string
  brewDateISO: string
  stage: TankStage
  nextStage: TankStage
  owner: string
  temperatureC: number
  humidityPct: number
  brix: number
  ph: number
  note: string
}

type InventoryItem = {
  id: string
  name: string
  category: '味噌' | '醤油' | '甘酒' | 'その他'
  stock: number
  unit: '個' | '本' | 'kg'
  lowStockThreshold: number
  expiryISO: string
  inboundISO: string
}

type MovementType = '入庫' | '出庫'

type Movement = {
  id: string
  type: MovementType
  dateISO: string
  productId: string
  productName: string
  qty: number
  unit: InventoryItem['unit']
  owner: string
}

const STAGES: TankStage[] = [
  '仕込み',
  '発酵',
  '熟成',
  '圧搾',
  '火入れ',
  '充填',
  '出荷',
]

const MOCK_TANKS: Tank[] = [
  {
    id: 'T-01',
    batchName: '味噌（ヤマキュウ）Aロット',
    brewDateISO: '2026-03-18',
    stage: '熟成',
    nextStage: '圧搾',
    owner: '佐藤',
    temperatureC: 18.4,
    humidityPct: 62,
    brix: 10.2,
    ph: 5.3,
    note: '熟成が安定。香り良好。',
  },
  {
    id: 'T-02',
    batchName: '醤油（うまくち）春仕込み',
    brewDateISO: '2026-04-07',
    stage: '発酵',
    nextStage: '熟成',
    owner: '高橋',
    temperatureC: 22.1,
    humidityPct: 58,
    brix: 12.8,
    ph: 5.0,
    note: '温度が少し高め。夕方に換気。',
  },
  {
    id: 'T-03',
    batchName: '甘酒（麹）試験ロット',
    brewDateISO: '2026-05-04',
    stage: '発酵',
    nextStage: '火入れ',
    owner: '伊藤',
    temperatureC: 28.6,
    humidityPct: 55,
    brix: 16.3,
    ph: 4.6,
    note: '糖度が順調に上昇。',
  },
  {
    id: 'T-04',
    batchName: '防災お味噌（長期）',
    brewDateISO: '2026-02-02',
    stage: '圧搾',
    nextStage: '火入れ',
    owner: '山本',
    temperatureC: 17.2,
    humidityPct: 60,
    brix: 9.4,
    ph: 5.4,
    note: '圧搾準備。器具点検済み。',
  },
]

const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: 'p-miso-yamaq',
    name: 'ヤマキュウ味噌 500g',
    category: '味噌',
    stock: 48,
    unit: '個',
    lowStockThreshold: 30,
    expiryISO: '2026-11-30',
    inboundISO: '2026-04-20',
  },
  {
    id: 'p-shoyu-umakuchi',
    name: 'うまくち醤油 1L',
    category: '醤油',
    stock: 18,
    unit: '本',
    lowStockThreshold: 25,
    expiryISO: '2027-02-28',
    inboundISO: '2026-04-28',
  },
  {
    id: 'p-miso-bosai',
    name: '防災お味噌（長期保存）',
    category: '味噌',
    stock: 9,
    unit: '個',
    lowStockThreshold: 12,
    expiryISO: '2029-12-31',
    inboundISO: '2026-03-10',
  },
  {
    id: 'p-amazake',
    name: '甘酒 200ml',
    category: '甘酒',
    stock: 72,
    unit: '本',
    lowStockThreshold: 40,
    expiryISO: '2026-06-25',
    inboundISO: '2026-05-05',
  },
]

const MOCK_MOVEMENTS: Movement[] = [
  {
    id: 'mv-001',
    type: '出庫',
    dateISO: '2026-05-05',
    productId: 'p-shoyu-umakuchi',
    productName: 'うまくち醤油 1L',
    qty: 6,
    unit: '本',
    owner: '高橋',
  },
  {
    id: 'mv-002',
    type: '入庫',
    dateISO: '2026-05-05',
    productId: 'p-amazake',
    productName: '甘酒 200ml',
    qty: 24,
    unit: '本',
    owner: '伊藤',
  },
  {
    id: 'mv-003',
    type: '出庫',
    dateISO: '2026-05-04',
    productId: 'p-miso-bosai',
    productName: '防災お味噌（長期保存）',
    qty: 3,
    unit: '個',
    owner: '山本',
  },
]

function formatDateJP(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function stageIndex(stage: TankStage) {
  return Math.max(0, STAGES.indexOf(stage))
}

function stageProgressPct(stage: TankStage) {
  const idx = stageIndex(stage)
  if (STAGES.length <= 1) return 0
  return Math.round((idx / (STAGES.length - 1)) * 100)
}

function movementTone(type: MovementType) {
  return type === '入庫'
    ? 'bg-brand-green/10 text-brand-navy border-brand-green/20'
    : 'bg-amber-50 text-slate-800 border-amber-100'
}

export function InventoryProcess() {
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY)
  const [movements, setMovements] = useState<Movement[]>(MOCK_MOVEMENTS)

  const [formType, setFormType] = useState<MovementType>('入庫')
  const [formDate, setFormDate] = useState<string>(todayISO())
  const [formProductId, setFormProductId] = useState<string>(MOCK_INVENTORY[0]?.id ?? '')
  const [formQty, setFormQty] = useState<number>(1)
  const [formOwner, setFormOwner] = useState<string>('担当者')

  const selectedTank = useMemo(() => {
    if (!selectedTankId) return null
    return MOCK_TANKS.find((t) => t.id === selectedTankId) ?? null
  }, [selectedTankId])

  const inventoryById = useMemo(() => {
    const map = new Map<string, InventoryItem>()
    for (const i of inventory) map.set(i.id, i)
    return map
  }, [inventory])

  const recentMovements = useMemo(() => {
    return [...movements].sort((a, b) => b.dateISO.localeCompare(a.dateISO)).slice(0, 8)
  }, [movements])

  const lowStockCount = useMemo(() => {
    return inventory.filter((i) => i.stock <= i.lowStockThreshold).length
  }, [inventory])

  const tankStatus = useMemo(() => {
    const fermenting = MOCK_TANKS.filter((t) => t.stage === '発酵').length
    const aging = MOCK_TANKS.filter((t) => t.stage === '熟成').length
    const shipping = MOCK_TANKS.filter((t) => t.stage === '出荷').length
    return { fermenting, aging, shipping, total: MOCK_TANKS.length }
  }, [])

  function submitMovement() {
    const item = inventoryById.get(formProductId)
    if (!item) return

    const qty = Math.max(0, Math.floor(Number(formQty)))
    if (qty <= 0) return

    const delta = formType === '入庫' ? qty : -qty
    setInventory((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, stock: Math.max(0, p.stock + delta) } : p)),
    )

    const mv: Movement = {
      id: `mv-${crypto.randomUUID()}`,
      type: formType,
      dateISO: formDate,
      productId: item.id,
      productName: item.name,
      qty,
      unit: item.unit,
      owner: formOwner.trim() || '担当者',
    }

    setMovements((prev) => [mv, ...prev])

    setFormQty(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-navy">
          在庫・工程管理アプリ
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          醸造タンクごとの仕込み状況と製品在庫をまとめて見える化し、属人化を防ぐための画面です（モックデータ）。
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            稼働タンク
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
            {tankStatus.total} 基
          </div>
          <div className="mt-2 text-xs text-slate-600">
            発酵 {tankStatus.fermenting} / 熟成 {tankStatus.aging} / 出荷 {tankStatus.shipping}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            在庫アラート
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
            {lowStockCount} 件
          </div>
          <div className="mt-2 text-xs text-slate-600">
            しきい値以下の製品を表示
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            本日の入出庫
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
            {movements.filter((m) => m.dateISO === todayISO()).length} 件
          </div>
          <div className="mt-2 text-xs text-slate-600">入力フォームから記録</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            現場メモ
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            まずは“見える化”
          </div>
          <div className="mt-2 text-xs text-slate-600">
            クリックと入力だけで使えるUI
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-brand-navy">
                醸造タンク一覧
              </div>
              <div className="mt-1 text-xs text-slate-600">
                タップで詳細（温度・湿度・糖度など）を表示
              </div>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {STAGES[0]} → {STAGES[STAGES.length - 1]}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {MOCK_TANKS.map((t) => {
              const pct = stageProgressPct(t.stage)
              const isSelected = t.id === selectedTankId
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTankId(t.id)}
                  className={[
                    'w-full rounded-lg border p-3 text-left transition',
                    isSelected
                      ? 'border-brand-green bg-brand-green/5'
                      : 'border-slate-200 bg-white hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                          {t.id}
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {t.stage}中
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        仕込み: {formatDateJP(t.brewDateISO)} / 担当: {t.owner}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        次工程: {t.nextStage}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-500">
                        進捗
                      </div>
                      <div className="mt-1 text-sm font-semibold text-brand-navy">
                        {pct}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-green"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    {t.batchName}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-brand-navy">
                製品在庫一覧
              </div>
              <div className="mt-1 text-xs text-slate-600">
                在庫が少ない製品は警告表示
              </div>
            </div>
            {lowStockCount > 0 ? (
              <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-slate-800">
                要補充 {lowStockCount} 件
              </div>
            ) : (
              <div className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-navy">
                在庫OK
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {inventory.map((i) => {
              const low = i.stock <= i.lowStockThreshold
              return (
                <div
                  key={i.id}
                  className={[
                    'rounded-lg border p-3',
                    low
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-slate-200 bg-white',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                          {i.name}
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {i.category}
                        </span>
                        {low && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-slate-900">
                            在庫少
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        入庫日: {formatDateJP(i.inboundISO)} / 賞味期限: {formatDateJP(i.expiryISO)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={[
                          'text-lg font-semibold tracking-tight',
                          low ? 'text-amber-900' : 'text-brand-navy',
                        ].join(' ')}
                      >
                        {i.stock.toLocaleString()}
                        <span className="ml-1 text-sm font-semibold text-slate-700">
                          {i.unit}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        しきい値 {i.lowStockThreshold}
                        {i.unit}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>在庫</span>
                      <span>
                        {Math.min(100, Math.round((i.stock / Math.max(1, i.lowStockThreshold * 2)) * 100))}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/60">
                      <div
                        className={[
                          'h-full rounded-full',
                          low ? 'bg-amber-400' : 'bg-brand-green',
                        ].join(' ')}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((i.stock / Math.max(1, i.lowStockThreshold * 2)) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card lg:col-span-1">
          <div className="text-sm font-semibold text-brand-navy">入出庫記録</div>
          <div className="mt-1 text-xs text-slate-600">
            現場での入力を最小限にするため、項目を絞っています。
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormType('入庫')}
                className={[
                  'h-12 rounded-lg border text-sm font-semibold transition',
                  formType === '入庫'
                    ? 'border-brand-green bg-brand-green text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                ].join(' ')}
              >
                入庫
              </button>
              <button
                type="button"
                onClick={() => setFormType('出庫')}
                className={[
                  'h-12 rounded-lg border text-sm font-semibold transition',
                  formType === '出庫'
                    ? 'border-amber-300 bg-amber-400 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                ].join(' ')}
              >
                出庫
              </button>
            </div>

            <label className="block">
              <div className="mb-1 text-xs font-semibold text-slate-600">日付</div>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-xs font-semibold text-slate-600">製品</div>
              <select
                value={formProductId}
                onChange={(e) => setFormProductId(e.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
              >
                {inventory.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <div className="mb-1 text-xs font-semibold text-slate-600">数量</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={formQty}
                  onChange={(e) => setFormQty(Number(e.target.value))}
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs font-semibold text-slate-600">担当者</div>
                <input
                  type="text"
                  value={formOwner}
                  onChange={(e) => setFormOwner(e.target.value)}
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={submitMovement}
              className={[
                'h-12 w-full rounded-lg text-sm font-semibold text-white transition',
                formType === '入庫'
                  ? 'bg-brand-green hover:brightness-95'
                  : 'bg-slate-900 hover:brightness-95',
              ].join(' ')}
            >
              記録する
            </button>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              出庫で在庫が0を下回らないように自動補正しています（デモ用）。
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-brand-navy">
                出庫履歴（直近）
              </div>
              <div className="mt-1 text-xs text-slate-600">
                入出庫の履歴を残し、引き継ぎを容易にします。
              </div>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              直近 {recentMovements.length} 件
            </div>
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 md:block">
            <table className="w-full table-auto">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    日付
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    種別
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    製品
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                    数量
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    担当者
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {recentMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatDateJP(m.dateISO)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                          movementTone(m.type),
                        ].join(' ')}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {m.productName}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                      {m.qty.toLocaleString()}
                      <span className="ml-1 text-xs font-semibold text-slate-600">
                        {m.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {m.owner}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-2 md:hidden">
            {recentMovements.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-600">
                      {formatDateJP(m.dateISO)}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {m.productName}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      担当: {m.owner}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                        movementTone(m.type),
                      ].join(' ')}
                    >
                      {m.type}
                    </span>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {m.qty.toLocaleString()}
                      <span className="ml-1 text-xs font-semibold text-slate-600">
                        {m.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedTank && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-4 md:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  タンク詳細（モック）
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {selectedTank.id} / {selectedTank.batchName}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                    {selectedTank.stage}中
                  </span>
                  <span>仕込み: {formatDateJP(selectedTank.brewDateISO)}</span>
                  <span>担当: {selectedTank.owner}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTankId(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                閉じる
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>工程進捗</span>
                  <span className="text-brand-navy">
                    {stageProgressPct(selectedTank.stage)}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-green"
                    style={{ width: `${stageProgressPct(selectedTank.stage)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  次工程: <span className="font-semibold text-slate-900">{selectedTank.nextStage}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">
                    温度
                  </div>
                  <div className="mt-1 text-lg font-semibold text-brand-navy">
                    {selectedTank.temperatureC.toFixed(1)}℃
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">
                    湿度
                  </div>
                  <div className="mt-1 text-lg font-semibold text-brand-navy">
                    {selectedTank.humidityPct}%
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">
                    糖度（Brix）
                  </div>
                  <div className="mt-1 text-lg font-semibold text-brand-navy">
                    {selectedTank.brix.toFixed(1)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">
                    pH
                  </div>
                  <div className="mt-1 text-lg font-semibold text-brand-navy">
                    {selectedTank.ph.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-semibold tracking-wide text-slate-500">
                  メモ
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  {selectedTank.note}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={() => setSelectedTankId(null)}
                className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                閉じる
              </button>
              <button
                type="button"
                className="h-12 rounded-lg bg-brand-green px-4 text-sm font-semibold text-white hover:brightness-95"
              >
                点検チェック（モック）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
