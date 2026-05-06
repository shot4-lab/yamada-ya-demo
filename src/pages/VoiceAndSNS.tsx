import { useMemo, useState } from 'react'

type Target = '20s_women' | 'health' | 'family' | 'bosai'

type Voice = {
  id: string
  text: string
}

type Analysis = {
  summary: string[]
  positive: string[]
  negative: string[]
  improvements: string[]
  requests: string[]
  topTopics: string[]
  productFocus: string
}

type SnsDraft = {
  id: string
  title: string
  caption: string
  hashtags: string[]
}

type FlyerCopy = {
  id: string
  copy: string
  note: string
}

const TARGETS: Array<{ id: Target; label: string; hint: string }> = [
  { id: '20s_women', label: '20代女性', hint: 'おしゃれ・共感・手軽さ' },
  { id: 'health', label: '健康志向層', hint: '無添加・発酵・からだ想い' },
  { id: 'family', label: '子育て/家族層', hint: '時短・安心・家族が喜ぶ' },
  { id: 'bosai', label: '防災備蓄層', hint: '備蓄・安心・いざという時' },
]

const POSITIVE_SEEDS = [
  '美味しい',
  'おいしい',
  '香り',
  '旨い',
  'コク',
  '甘い',
  '上品',
  '便利',
  '簡単',
  '時短',
  '安心',
  '無添加',
  '健康',
  '家族',
  '子ども',
  '贈り物',
  'ギフト',
  '丁寧',
  'リピート',
  'また買う',
]

const NEGATIVE_SEEDS = [
  '高い',
  'しょっぱい',
  '濃い',
  '薄い',
  'まずい',
  '割れ',
  '漏れ',
  '届かない',
  '遅い',
  'わかりにくい',
  '使いにくい',
  '量が少ない',
  'においが強い',
  '塩辛い',
  '賞味期限が短い',
]

const STOP_WORDS = new Set([
  'この',
  'それ',
  'これ',
  'ため',
  'こと',
  'ところ',
  'よう',
  '感じ',
  'です',
  'ます',
  'する',
  'した',
  'できる',
  'なる',
  'ある',
  'ない',
  'とても',
  'すごく',
  'ちょっと',
  'すこし',
])

function tokenizeTopics(text: string) {
  const candidates =
    text
      .replace(/[！？!?\n\r]/g, ' ')
      .match(/[一-龠々ぁ-んァ-ンー]{2,}/g) ?? []

  const counts = new Map<string, number>()
  for (const w of candidates) {
    if (STOP_WORDS.has(w)) continue
    const v = counts.get(w) ?? 0
    counts.set(w, v + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w)
}

function uniquePick(list: string[]) {
  return [...new Set(list)].slice(0, 8)
}

function pickProductFocus(allText: string) {
  if (/(防災|備蓄)/.test(allText)) return '防災お味噌'
  if (/(醤油|しょうゆ)/.test(allText)) return 'うまくち醤油'
  if (/(味噌|みそ)/.test(allText)) return 'ヤマキュウ味噌'
  if (/(甘酒)/.test(allText)) return '甘酒'
  return 'ヤマキュウ味噌'
}

function extractActionLines(texts: string[], mode: 'improve' | 'request') {
  const triggers =
    mode === 'improve'
      ? /(改善|もっと|しづらい|使いにくい|わかりにくい|高い|遅い|漏れ|割れ|薄い|濃い|しょっぱい|塩辛い)/
      : /(ほしい|欲しい|あれば|あると嬉しい|してほしい|してください|希望|要望)/

  const lines: string[] = []
  for (const t of texts) {
    const chunks = t.split(/[。\n\r]/).map((s) => s.trim()).filter(Boolean)
    for (const c of chunks) {
      if (triggers.test(c)) lines.push(c)
    }
  }

  return uniquePick(lines)
}

function analyzeVoices(voices: Voice[]): Analysis {
  const raw = voices.map((v) => v.text.trim()).filter(Boolean)
  const allText = raw.join('\n')

  const positive = uniquePick(POSITIVE_SEEDS.filter((k) => allText.includes(k)))
  const negative = uniquePick(NEGATIVE_SEEDS.filter((k) => allText.includes(k)))
  const improvements = extractActionLines(raw, 'improve')
  const requests = extractActionLines(raw, 'request')
  const topTopics = tokenizeTopics(allText)
  const productFocus = pickProductFocus(allText)

  const score = positive.length - negative.length
  const tone =
    score >= 3 ? '全体的にポジティブ' : score <= -2 ? '不満が目立つ' : '概ね良好（改善余地あり）'

  const summary: string[] = [
    `AI要約: ${tone}（ポジ ${positive.length} / ネガ ${negative.length}）`,
    `話題の中心: ${topTopics.slice(0, 4).join('・') || '—'}`,
    `注目商品: ${productFocus}`,
  ]

  return { summary, positive, negative, improvements, requests, topTopics, productFocus }
}

function baseHashtags(product: string) {
  const core = ['山田屋醸造', '発酵', '国産', '手づくり', 'お取り寄せ', '暮らし']
  const productTags =
    product === 'うまくち醤油'
      ? ['醤油', 'しょうゆ', '和食', '簡単レシピ']
      : product === '防災お味噌'
        ? ['防災', '備蓄', 'ローリングストック', 'もしもに備える']
        : product === '甘酒'
          ? ['甘酒', '麹', '腸活', '発酵ドリンク']
          : ['味噌', 'みそ', '味噌汁', '健康ごはん']

  return [...productTags, ...core].map((t) => `#${t}`)
}

function buildSnsDrafts(analysis: Analysis, target: Target): SnsDraft[] {
  const product = analysis.productFocus
  const hashtags = baseHashtags(product)

  const key = analysis.positive[0] ?? '香り'
  const fix = analysis.improvements[0] ?? analysis.requests[0] ?? ''
  const fixLine = fix ? `\n\nいただいた声:「${fix}」\n改善のヒントとして活かします。` : ''

  const tone =
    target === '20s_women'
      ? { style: 'やさしく・映える', emoji: ' ' }
      : target === 'health'
        ? { style: 'からだ想い', emoji: ' ' }
        : target === 'family'
          ? { style: '家族・時短', emoji: ' ' }
          : { style: '備え', emoji: ' ' }

  const headline =
    target === 'bosai'
      ? `“もしも”の時にも、いつもの味。${product}`
      : target === 'health'
        ? `発酵のちからで、毎日を整える。${product}`
        : target === 'family'
          ? `忙しい日の味方。${product}でさっと一品`
          : `香りで選ぶなら。${product}`

  const drafts: SnsDraft[] = [
    {
      id: 'sns-1',
      title: `Instagram投稿案A（${TARGETS.find((t) => t.id === target)?.label ?? ''}）`,
      caption: `${headline}\n\nお客様の声で多かったのは「${key}」。\n${product}の魅力を、毎日の食卓で感じてください。${fixLine}\n\n今日のおすすめ: ${product}でつくる簡単アレンジ`,
      hashtags: hashtags.slice(0, 10),
    },
    {
      id: 'sns-2',
      title: `Instagram投稿案B（${tone.style}）`,
      caption: `${product}って、実は「いつもの料理」が変わります。\n\n・味が決まりやすい\n・あと味がきれい\n・家族が“もう一口”と言う\n\nぜひ、あなたの定番に。${fixLine}`,
      hashtags: hashtags.slice(2, 14),
    },
    {
      id: 'sns-3',
      title: 'Instagram投稿案C（ストーリー向け）',
      caption: `【質問】あなたはどっち派？\n\nA: いつもの味噌汁を格上げ\nB: おにぎり/野菜スティックで手軽\n\n${product}で“今日の一口”を。${fixLine}`,
      hashtags: hashtags.slice(0, 8),
    },
  ]

  return drafts
}

function buildFlyerCopies(productName: string, analysis: Analysis): FlyerCopy[] {
  const key = analysis.positive[0] ?? '香り'
  const safe = analysis.positive.includes('無添加') ? '無添加' : '丁寧仕込み'
  return [
    {
      id: 'fly-1',
      copy: `${key}で選ぶ、新しい${productName}`,
      note: '強み（ポジティブキーワード）を先頭に置く',
    },
    {
      id: 'fly-2',
      copy: `毎日の一杯が変わる。${productName}`,
      note: '生活者ベネフィット訴求',
    },
    {
      id: 'fly-3',
      copy: `${safe}、老舗の味。${productName}`,
      note: '信頼感＋伝統を強調',
    },
    {
      id: 'fly-4',
      copy: `ひとさじで、料理が決まる。${productName}`,
      note: '使いやすさ・時短を想起',
    },
    {
      id: 'fly-5',
      copy: `贈り物にも喜ばれる、${productName}`,
      note: 'ギフト導線向けの一言',
    },
  ]
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'absolute'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

export function VoiceAndSNS() {
  const [voices, setVoices] = useState<Voice[]>([
    {
      id: crypto.randomUUID(),
      text: '香りが良くて、贈り物に喜ばれました。味噌汁以外の使い方も知りたいです。',
    },
    {
      id: crypto.randomUUID(),
      text: 'うまくち醤油が便利。もう少し分量の目安があると嬉しい。',
    },
  ])

  const [target, setTarget] = useState<Target>('20s_women')
  const [productName, setProductName] = useState<string>('ヤマキュウ味噌（新仕込み）')
  const [loading, setLoading] = useState(false)

  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [snsDrafts, setSnsDrafts] = useState<SnsDraft[]>([])
  const [flyerCopies, setFlyerCopies] = useState<FlyerCopy[]>([])

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const canRun = useMemo(() => voices.some((v) => v.text.trim().length > 0), [voices])

  function addVoice() {
    setVoices((prev) => [...prev, { id: crypto.randomUUID(), text: '' }])
  }

  function removeVoice(id: string) {
    setVoices((prev) => prev.filter((v) => v.id !== id))
  }

  function updateVoice(id: string, text: string) {
    setVoices((prev) => prev.map((v) => (v.id === id ? { ...v, text } : v)))
  }

  async function runAI() {
    if (!canRun) return
    setLoading(true)
    setCopiedId(null)
    setAnalysis(null)
    setSnsDrafts([])
    setFlyerCopies([])

    await new Promise((r) => setTimeout(r, 900))

    const a = analyzeVoices(voices)
    setAnalysis(a)
    setSnsDrafts(buildSnsDrafts(a, target))
    setFlyerCopies(buildFlyerCopies(productName.trim() || '新商品', a))
    setLoading(false)
  }

  async function onCopy(id: string, text: string) {
    await copyToClipboard(text)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1200)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-navy">
          お客様の声分析＆SNS投稿案生成
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          お客様の声を要約し、改善点とSNS投稿案・キャッチコピーを自動生成するデモ画面です（モックAI）。
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-brand-navy">
                お客様の声入力
              </div>
              <div className="mt-1 text-xs text-slate-600">
                複数入力できます（レビュー・問い合わせ・SNSコメントなど）。
              </div>
            </div>
            <button
              type="button"
              onClick={addVoice}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ＋ 追加
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {voices.map((v, idx) => (
              <div key={v.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-600">
                    入力 {idx + 1}
                  </div>
                  {voices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVoice(v.id)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      削除
                    </button>
                  )}
                </div>
                <textarea
                  value={v.text}
                  onChange={(e) => updateVoice(v.id, e.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900"
                  placeholder="例: 香りがよくて贈り物に喜ばれた / もう少し量が多いと嬉しい など"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-slate-600">
                ターゲット層
              </div>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as Target)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
              >
                {TARGETS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-[11px] text-slate-600">
                {TARGETS.find((t) => t.id === target)?.hint}
              </div>
            </label>

            <label className="block">
              <div className="mb-1 text-xs font-semibold text-slate-600">
                新商品名（チラシ用）
              </div>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                placeholder="例: ヤマキュウ味噌（新仕込み）"
              />
              <div className="mt-1 text-[11px] text-slate-600">
                空欄でも生成できます
              </div>
            </label>
          </div>

          <div className="mt-4">
            <button
              type="button"
              disabled={!canRun || loading}
              onClick={runAI}
              className={[
                'h-12 w-full rounded-lg text-sm font-semibold text-white transition',
                !canRun || loading
                  ? 'bg-slate-300'
                  : 'bg-brand-green hover:brightness-95',
              ].join(' ')}
            >
              {loading ? 'AIが分析中…' : 'AI分析＆投稿案を生成'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-brand-navy">
                  AI分析結果
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  ポジ/ネガ要素、改善点、要望などを抽出
                </div>
              </div>
              {analysis && (
                <div className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-navy">
                  生成完了
                </div>
              )}
            </div>

            {loading && (
              <div className="mt-4 space-y-3">
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                <div className="h-20 w-full animate-pulse rounded bg-slate-100" />
              </div>
            )}

            {!loading && !analysis && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                入力後に「AI分析＆投稿案を生成」を押すと、ここに結果が表示されます。
              </div>
            )}

            {!loading && analysis && (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">
                    サマリー
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-slate-800">
                    {analysis.summary.map((s) => (
                      <div key={s}>{s}</div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-500">
                      ポジティブなキーワード
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(analysis.positive.length ? analysis.positive : ['—']).map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-brand-green/10 px-2 py-1 text-xs font-semibold text-brand-navy"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-500">
                      ネガティブなキーワード
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(analysis.negative.length ? analysis.negative : ['—']).map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-slate-800"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-500">
                      改善点（抽出）
                    </div>
                    <div className="mt-2 space-y-2 text-sm text-slate-800">
                      {(analysis.improvements.length ? analysis.improvements : ['—']).map((t) => (
                        <div key={t} className="rounded-md bg-slate-50 p-2">
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-500">
                      要望（抽出）
                    </div>
                    <div className="mt-2 space-y-2 text-sm text-slate-800">
                      {(analysis.requests.length ? analysis.requests : ['—']).map((t) => (
                        <div key={t} className="rounded-md bg-slate-50 p-2">
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="text-sm font-semibold text-brand-navy">
              SNS投稿案（Instagram）
            </div>
            <div className="mt-1 text-xs text-slate-600">
              複数案を並べて比較し、コピーボタンで貼り付けできます。
            </div>

            {loading && (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-44 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
                  />
                ))}
              </div>
            )}

            {!loading && snsDrafts.length === 0 && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                生成するとここに投稿案が表示されます。
              </div>
            )}

            {!loading && snsDrafts.length > 0 && (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {snsDrafts.map((d) => {
                  const text = `${d.caption}\n\n${d.hashtags.join(' ')}`
                  return (
                    <div
                      key={d.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-700">
                          {d.title}
                        </div>
                        <button
                          type="button"
                          onClick={() => onCopy(d.id, text)}
                          className={[
                            'shrink-0 rounded-md border bg-white px-2 py-1 text-xs font-semibold',
                            copiedId === d.id
                              ? 'border-brand-green text-brand-navy'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          {copiedId === d.id ? 'コピー済' : 'コピー'}
                        </button>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                        {d.caption}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {d.hashtags.map((h) => (
                          <span
                            key={h}
                            className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="text-sm font-semibold text-brand-navy">
              チラシキャッチコピー（新商品向け）
            </div>
            <div className="mt-1 text-xs text-slate-600">
              複数案を比較し、採用案をコピーできます。
            </div>

            {loading && (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
                  />
                ))}
              </div>
            )}

            {!loading && flyerCopies.length === 0 && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                生成するとここにキャッチコピー案が表示されます。
              </div>
            )}

            {!loading && flyerCopies.length > 0 && (
              <div className="mt-4 space-y-2">
                {flyerCopies.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {c.copy}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">{c.note}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCopy(c.id, c.copy)}
                      className={[
                        'h-10 rounded-lg border bg-white px-3 text-sm font-semibold',
                        copiedId === c.id
                          ? 'border-brand-green text-brand-navy'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {copiedId === c.id ? 'コピー済' : 'コピー'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
