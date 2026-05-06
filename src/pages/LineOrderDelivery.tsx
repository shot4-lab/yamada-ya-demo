import { useMemo, useState } from 'react'

type OrderStatus = 'new' | 'processing' | 'shipped' | 'cancelled'
type Carrier = 'ヤマト運輸' | '佐川急便'

type OrderItem = {
  name: string
  qty: number
}

type Order = {
  id: string
  orderedAtISO: string
  customerName: string
  phone: string
  postalCode: string
  address1: string
  address2: string
  items: OrderItem[]
  status: OrderStatus
  carrier: Carrier
  trackingNo?: string
  note: string
}

type LineNotification = {
  id: string
  atISO: string
  orderId: string
  customerName: string
  message: string
  status: OrderStatus
}

const MOCK_ORDERS: Order[] = [
  {
    id: 'L-20260507-001',
    orderedAtISO: '2026-05-07T08:12:00+09:00',
    customerName: '佐藤 美咲',
    phone: '090-1234-5678',
    postalCode: '372-0034',
    address1: '群馬県伊勢崎市茂呂町2-12-3',
    address2: 'サンハイツ201',
    items: [
      { name: 'ヤマキュウ味噌 500g', qty: 2 },
      { name: 'うまくち醤油 1L', qty: 1 },
    ],
    status: 'new',
    carrier: 'ヤマト運輸',
    note: 'ギフト包装希望（のし無し）',
  },
  {
    id: 'L-20260506-014',
    orderedAtISO: '2026-05-06T19:45:00+09:00',
    customerName: '高橋 恒一',
    phone: '080-2222-3333',
    postalCode: '150-0001',
    address1: '東京都渋谷区神宮前1-2-3',
    address2: 'オフィス宛',
    items: [{ name: '防災お味噌（長期保存）', qty: 3 }],
    status: 'processing',
    carrier: '佐川急便',
    note: '領収書希望（宛名: 高橋商店）',
  },
  {
    id: 'L-20260505-008',
    orderedAtISO: '2026-05-05T11:03:00+09:00',
    customerName: '伊藤 拓海',
    phone: '070-4444-5555',
    postalCode: '460-0008',
    address1: '愛知県名古屋市中区栄3-4-5',
    address2: '',
    items: [
      { name: 'うまくち醤油 1L', qty: 2 },
      { name: '甘酒 200ml', qty: 6 },
    ],
    status: 'shipped',
    carrier: 'ヤマト運輸',
    trackingNo: 'YT1234-5678-9012',
    note: '',
  },
  {
    id: 'L-20260504-003',
    orderedAtISO: '2026-05-04T09:22:00+09:00',
    customerName: '山本 さゆり',
    phone: '090-9999-0000',
    postalCode: '060-0042',
    address1: '北海道札幌市中央区大通西1-1-1',
    address2: '',
    items: [{ name: 'ヤマキュウ味噌 500g', qty: 1 }],
    status: 'cancelled',
    carrier: 'ヤマト運輸',
    note: '重複注文のためキャンセル',
  },
]

function formatDateTimeJP(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function statusLabel(s: OrderStatus) {
  switch (s) {
    case 'new':
      return '未処理'
    case 'processing':
      return '処理中'
    case 'shipped':
      return '発送済み'
    case 'cancelled':
      return 'キャンセル'
    default:
      return ''
  }
}

function statusTone(s: OrderStatus) {
  switch (s) {
    case 'new':
      return 'bg-amber-50 text-slate-900 border-amber-100'
    case 'processing':
      return 'bg-sky-50 text-slate-900 border-sky-100'
    case 'shipped':
      return 'bg-brand-green/10 text-brand-navy border-brand-green/20'
    case 'cancelled':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-slate-50 text-slate-800 border-slate-200'
  }
}

function itemsText(items: OrderItem[]) {
  return items.map((i) => `${i.name}×${i.qty}`).join('、')
}

function buildLineMessage(order: Order, next: OrderStatus) {
  const header = `山田屋醸造です。ご注文（${order.id}）の状況をお知らせします。`
  if (next === 'processing') {
    return `${header}\n\nステータス: 処理中\nただいま出荷準備を進めています。\n\n商品: ${itemsText(order.items)}`
  }
  if (next === 'shipped') {
    const tracking = order.trackingNo ? `\n追跡番号: ${order.trackingNo}` : ''
    return `${header}\n\nステータス: 発送済み\n発送が完了しました。到着まで今しばらくお待ちください。${tracking}\n\n商品: ${itemsText(order.items)}`
  }
  if (next === 'cancelled') {
    return `${header}\n\nステータス: キャンセル\nご希望によりキャンセルを承りました。\n\nご不明点があればこのLINEでご連絡ください。`
  }
  return `${header}\n\nステータス: 未処理\nご注文を受け付けました。確認でき次第、処理を開始します。\n\n商品: ${itemsText(order.items)}`
}

function csvEscape(value: string) {
  const v = value.replace(/\r?\n/g, ' ')
  if (/[",]/.test(v)) return `"${v.replaceAll('"', '""')}"`
  return v
}

function toShippingCSV(orders: Order[]) {
  const header = [
    '注文ID',
    '注文日時',
    '配送会社',
    '受取人名',
    '電話番号',
    '郵便番号',
    '住所1',
    '住所2',
    '品名',
    '数量合計',
    'ステータス',
  ]

  const rows = orders.map((o) => {
    const qtyTotal = o.items.reduce((a, b) => a + b.qty, 0)
    const product = itemsText(o.items)
    return [
      o.id,
      formatDateTimeJP(o.orderedAtISO),
      o.carrier,
      o.customerName,
      o.phone,
      o.postalCode,
      o.address1,
      o.address2,
      product,
      String(qtyTotal),
      statusLabel(o.status),
    ].map(csvEscape)
  })

  return [header.map(csvEscape), ...rows].map((r) => r.join(',')).join('\n')
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function LineOrderDelivery() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [onlyUnprocessed, setOnlyUnprocessed] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [notifications, setNotifications] = useState<LineNotification[]>([])

  const selected = useMemo(() => {
    if (!selectedId) return null
    return orders.find((o) => o.id === selectedId) ?? null
  }, [orders, selectedId])

  const counts = useMemo(() => {
    const c = { new: 0, processing: 0, shipped: 0, cancelled: 0 }
    for (const o of orders) c[o.status] += 1
    return c
  }, [orders])

  const visibleOrders = useMemo(() => {
    const list = onlyUnprocessed ? orders.filter((o) => o.status === 'new') : orders
    return [...list].sort((a, b) => b.orderedAtISO.localeCompare(a.orderedAtISO))
  }, [orders, onlyUnprocessed])

  const csvTargets = useMemo(() => {
    return orders.filter((o) => o.status !== 'cancelled')
  }, [orders])

  function generateTrackingNo() {
    const a = Math.floor(1000 + Math.random() * 9000)
    const b = Math.floor(1000 + Math.random() * 9000)
    const c = Math.floor(1000 + Math.random() * 9000)
    return `YT${a}-${b}-${c}`
  }

  function sendNotification(order: Order, status: OrderStatus) {
    const msg = buildLineMessage(order, status)
    const n: LineNotification = {
      id: crypto.randomUUID(),
      atISO: new Date().toISOString(),
      orderId: order.id,
      customerName: order.customerName,
      message: msg,
      status,
    }
    setNotifications((prev) => [n, ...prev].slice(0, 10))
  }

  function updateStatus(orderId: string, next: OrderStatus) {
    const base = orders.find((o) => o.id === orderId)
    if (!base) return

    const trackingNo = next === 'shipped' ? base.trackingNo ?? generateTrackingNo() : base.trackingNo

    const updated: Order = {
      ...base,
      status: next,
      trackingNo,
    }

    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
    sendNotification(updated, next)
  }

  function downloadCSV() {
    const csv = toShippingCSV(csvTargets)
    const name = `shipping_${new Date().toISOString().slice(0, 10)}.csv`
    downloadTextFile(name, csv, 'text/csv;charset=utf-8')
    setDownloaded(true)
    window.setTimeout(() => setDownloaded(false), 1200)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-navy">
          LINE注文・配送管理
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          LINE経由の注文を一覧で管理し、ステータス更新・配送伝票CSV出力・通知（モック）までを一画面で行います。
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            未処理
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
            {counts.new} 件
          </div>
          <div className="mt-2 text-xs text-slate-600">優先対応</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            処理中
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
            {counts.processing} 件
          </div>
          <div className="mt-2 text-xs text-slate-600">出荷準備</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            発送済み
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
            {counts.shipped} 件
          </div>
          <div className="mt-2 text-xs text-slate-600">追跡番号あり</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            通知（モック）
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
            {notifications.length} 件
          </div>
          <div className="mt-2 text-xs text-slate-600">直近の送信履歴</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card lg:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-semibold text-brand-navy">
                新規注文一覧
              </div>
              <div className="mt-1 text-xs text-slate-600">
                未処理の注文は強調表示。クリックで詳細を開きます。
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyUnprocessed((p) => !p)}
                className={[
                  'h-10 rounded-lg border px-3 text-sm font-semibold transition',
                  onlyUnprocessed
                    ? 'border-brand-green bg-brand-green/10 text-brand-navy'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                ].join(' ')}
              >
                {onlyUnprocessed ? '未処理のみ表示中' : '未処理のみ'}
              </button>
              <button
                type="button"
                onClick={downloadCSV}
                className={[
                  'h-10 rounded-lg px-3 text-sm font-semibold text-white transition',
                  downloaded ? 'bg-slate-600' : 'bg-brand-green hover:brightness-95',
                ].join(' ')}
              >
                {downloaded ? 'CSVをダウンロードしました' : '配送伝票CSVをダウンロード'}
              </button>
            </div>
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 md:block">
            <table className="w-full table-auto">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    注文日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    顧客名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    注文商品
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    配送先
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    ステータス
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {visibleOrders.map((o) => (
                  <tr
                    key={o.id}
                    className={[
                      'cursor-pointer hover:bg-slate-50',
                      o.status === 'new' ? 'bg-amber-50/40' : '',
                    ].join(' ')}
                    onClick={() => setSelectedId(o.id)}
                  >
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">
                        {formatDateTimeJP(o.orderedAtISO)}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">{o.id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {o.customerName}
                      <div className="mt-1 text-xs text-slate-600">{o.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {itemsText(o.items)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">
                        {o.postalCode}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {o.address1}
                        {o.address2 ? ` ${o.address2}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                          statusTone(o.status),
                        ].join(' ')}
                      >
                        {statusLabel(o.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-2 md:hidden">
            {visibleOrders.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelectedId(o.id)}
                className={[
                  'w-full rounded-lg border p-3 text-left transition',
                  o.status === 'new'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-600">
                      {formatDateTimeJP(o.orderedAtISO)}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {o.customerName}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{o.id}</div>
                  </div>
                  <span
                    className={[
                      'shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                      statusTone(o.status),
                    ].join(' ')}
                  >
                    {statusLabel(o.status)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-700">
                  {itemsText(o.items)}
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  {o.postalCode} {o.address1}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="text-sm font-semibold text-brand-navy">
              LINE通知プレビュー
            </div>
            <div className="mt-1 text-xs text-slate-600">
              ステータス変更時に自動送信される想定の通知内容（モック）です。
            </div>

            {notifications.length === 0 ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                まだ通知はありません。注文詳細でステータスを変更すると、ここにプレビューが追加されます。
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {notifications.slice(0, 3).map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-700">
                          {n.customerName} / {n.orderId}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-600">
                          {formatDateTimeJP(n.atISO)}
                        </div>
                      </div>
                      <span
                        className={[
                          'shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                          statusTone(n.status),
                        ].join(' ')}
                      >
                        {statusLabel(n.status)}
                      </span>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                      {n.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="text-sm font-semibold text-brand-navy">
              CSV出力対象
            </div>
            <div className="mt-1 text-xs text-slate-600">
              キャンセルを除外して出力します（デモ）。
            </div>
            <div className="mt-3 grid gap-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-500">対象件数</div>
                <div className="mt-1 text-lg font-semibold text-brand-navy">
                  {csvTargets.length} 件
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-500">
                  形式
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  配送伝票CSV（ヤマト/佐川想定）
                </div>
              </div>
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
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  注文詳細
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {selected.customerName}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                    {selected.id}
                  </span>
                  <span>{formatDateTimeJP(selected.orderedAtISO)}</span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                        statusTone(selected.status),
                      ].join(' ')}
                    >
                      {statusLabel(selected.status)}
                    </span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                閉じる
              </button>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">
                    注文内容
                  </div>
                  <div className="mt-2 space-y-2 text-sm text-slate-800">
                    {selected.items.map((i) => (
                      <div key={i.name} className="flex items-center justify-between">
                        <div className="font-semibold text-slate-900">{i.name}</div>
                        <div className="text-sm font-semibold text-slate-900">
                          ×{i.qty}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">
                    配送先
                  </div>
                  <div className="mt-2 text-sm text-slate-800">
                    <div className="font-semibold text-slate-900">
                      {selected.postalCode} {selected.address1}
                    </div>
                    {selected.address2 && (
                      <div className="mt-1">{selected.address2}</div>
                    )}
                    <div className="mt-2 text-xs text-slate-600">
                      連絡先: {selected.phone}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">メモ</div>
                  <div className="mt-2 text-sm text-slate-800">
                    {selected.note || '—'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-semibold tracking-wide text-slate-500">
                    ステータス変更
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => updateStatus(selected.id, 'processing')}
                      className="h-11 rounded-lg border border-sky-200 bg-sky-50 text-sm font-semibold text-slate-900 hover:bg-sky-100"
                    >
                      処理中
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(selected.id, 'shipped')}
                      className="h-11 rounded-lg bg-brand-green text-sm font-semibold text-white hover:brightness-95"
                    >
                      発送済み
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(selected.id, 'cancelled')}
                      className="h-11 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      キャンセル
                    </button>
                  </div>
                  <div className="mt-3 text-xs text-slate-600">
                    ステータス更新時にLINE通知を自動送信する想定（モック）です。
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-semibold tracking-wide text-slate-500">
                    配送情報
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-500">
                        配送会社
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {selected.carrier}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-500">
                        追跡番号
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {selected.trackingNo || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={downloadCSV}
                      className="h-11 w-full rounded-lg bg-slate-900 text-sm font-semibold text-white hover:brightness-95"
                    >
                      この注文を含めてCSVを出力
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold tracking-wide text-slate-500">
                    通知プレビュー（この注文）
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                    {buildLineMessage(selected, selected.status)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                閉じる
              </button>
              <button
                type="button"
                onClick={() => sendNotification(selected, selected.status)}
                className="h-12 rounded-lg bg-brand-green px-4 text-sm font-semibold text-white hover:brightness-95"
              >
                LINEに通知（モック）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
