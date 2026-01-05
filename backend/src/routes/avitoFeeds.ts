import express from 'express'
import path from 'path'
import fs from 'fs'
import nodeCron from 'node-cron'
import XLSX from 'xlsx'
import { XMLParser } from 'fast-xml-parser'
import { AvitoFeed } from '../models/AvitoFeed'
import { Product } from '../models/Product'
import { Category } from '../models/Category'

const router = express.Router()

// In-memory cron jobs map (use any for compatibility with typings)
const cronJobs = new Map<string, any>()

function setupCron(feed: any) {
  const id = String(feed._id)
  if (cronJobs.has(id)) {
    cronJobs.get(id)!.stop()
    cronJobs.delete(id)
  }
  if (feed.schedule?.enabled) {
    const cronExpr = feed.schedule?.cron || ensureCron(feed.schedule?.intervalMinutes)
    const task = nodeCron.schedule(cronExpr, async () => {
      try {
        await generateFeed(String(feed._id))
        await AvitoFeed.updateOne({ _id: feed._id }, { $set: { 'schedule.lastRunAt': new Date(), 'schedule.lastStatus': 'success', 'schedule.lastError': null } })
      } catch (e: any) {
        await AvitoFeed.updateOne({ _id: feed._id }, { $set: { 'schedule.lastRunAt': new Date(), 'schedule.lastStatus': 'error', 'schedule.lastError': e?.message || String(e) } })
      }
    })
    cronJobs.set(id, task)
  }
}

function ensureCron(intervalMinutes: number | undefined): string {
  const n = Math.max(1, Number(intervalMinutes || 20) || 20)
  return `*/${n} * * * *`
}

function findTemplatePath(): string {
  // расширяем поиск: рабочая директория + абсолютные пути на VPS + рядом с билдом
  const roots = [
    path.join(process.cwd(), 'csv'),
    path.join(process.cwd(), 'CSV'),
    path.join(__dirname, '../csv'),
    path.join(__dirname, '../CSV'),
    '/var/www/technohub/csv',
    '/var/www/technohub/CSV'
  ]
  const candidates: { path: string, size: number, score: number, mtime: number }[] = []
  const REQUIRED_HEADERS = [
    'Уникальный идентификатор объявления',
    'Название',
    'Цена'
  ]
  for (const dir of roots) {
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) {
      if (!/\.xlsx$/i.test(f)) continue
      if (f.startsWith('~$') || f.startsWith('.')) continue // игнор временных/скрытых
      const p = path.join(dir, f)
      const st = fs.statSync(p)
      let score = 0
      try {
        const wb = XLSX.readFile(p, { cellDates: false })
        // score by presence of required headers in any sheet
        for (const name of wb.SheetNames) {
          const aoa = XLSX.utils.sheet_to_json<any>(wb.Sheets[name], { header: 1, defval: '' }) as any[][]
          if (!aoa || aoa.length === 0) continue
          const headerIdx = findHeaderRowIndex(aoa)
          const headers = (aoa[headerIdx] || []).map((v: any) => String(v || ''))
          const set = new Set(headers)
          const hit = REQUIRED_HEADERS.every(h => set.has(h))
          if (hit) { score = Math.max(score, 10) }
        }
      } catch {}
      candidates.push({ path: p, size: st.size, score, mtime: st.mtimeMs })
    }
  }
  if (candidates.length === 0) throw new Error('Не найден файл шаблона в папке csv/CSV. Загрузите .xlsx шаблон.')
  // Prefer newest template first, then header score, then by larger size
  candidates.sort((a, b) => {
    if (b.mtime !== a.mtime) return b.mtime - a.mtime
    if (b.score !== a.score) return b.score - a.score
    return b.size - a.size
  })
  return candidates[0].path
}

// Import specific sheets from other xlsx files without replacing the base template
function importSupplementSheets(wb: XLSX.WorkBook, basePath: string) {
  try {
    const roots = [
      path.join(process.cwd(), 'csv'),
      path.join(process.cwd(), 'CSV'),
      // also scan global shared locations used on VPS
      '/var/www/technohub/csv',
      '/var/www/technohub/CSV'
    ]
    const targetNameNorm = normalizeName('Электроника-Ноутбуки')
    const baseNorms = new Set<string>(wb.SheetNames.map(n => normalizeName(n)))
    for (const dir of roots) {
      if (!fs.existsSync(dir)) continue
      for (const f of fs.readdirSync(dir)) {
        if (!/\.xlsx$/i.test(f)) continue
        const p = path.join(dir, f)
        if (path.resolve(p) === path.resolve(basePath)) continue
        try {
          const wb2 = XLSX.readFile(p, { cellDates: false })
          for (const name of wb2.SheetNames) {
            const nn = normalizeName(name)
            // Берем ТОЛЬКО точный лист "Электроника-Ноутбуки" из шаблона, исключая справочные листы (СПР-...)
            const isNotebookSheet = nn === targetNameNorm
            if (!isNotebookSheet) continue
            // Всегда публикуем под каноническим именем
            const outName = 'Электроника-Ноутбуки'
            const outNorm = targetNameNorm
            const existing = wb.SheetNames.find(n => normalizeName(n) === outNorm) as string | undefined
            if (!existing) {
              wb.SheetNames.push(outName)
            } else if (existing !== outName) {
              const idx = wb.SheetNames.indexOf(existing)
              if (idx >= 0) wb.SheetNames[idx] = outName
              delete (wb.Sheets as any)[existing]
            }
            ;(wb.Sheets as any)[outName] = (wb2.Sheets as any)[name]
            baseNorms.add(outNorm)
          }
        } catch {}
      }
    }
  } catch (e) {
    console.warn('Supplement sheets import skipped:', e)
  }
}

function getHeaderRow(wb: XLSX.WorkBook): string[] {
  const names = wb.SheetNames
  if (names.length > 0) {
    const first = wb.Sheets[names[0]]
    const rows = XLSX.utils.sheet_to_json<any>(first, { defval: '' })
    if (rows && rows.length > 0) return Object.keys(rows[0])
  }
  // Fallback default Avito-like columns used by our mapping
  return [
    'Уникальный идентификатор объявления', 'Номер объявления на Авито', 'Способ размещения', 'Название',
    'Описание объявления', 'Цена', 'Категория', 'Подкатегория', 'Производитель', 'Модель', 'Цвет',
    'Встроенная память', 'SIM-карты', 'Номер телефона', 'Способ связи', 'Тип телефона', 'Состояние',
    'Соединять это объявление с другими объявлениями', 'Комплектация', 'История смартфона', 'Коробка запечатана',
    'Целевая аудитория', 'Название компании', 'Почта', 'AvitoStatus', 'Адрес'
  ]
}

function sheetBaseRow(wb: XLSX.WorkBook, sheetName: string): any {
  const ws = wb.Sheets[sheetName]
  if (!ws) return {}
  const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '' })
  return rows && rows.length > 0 ? rows[0] : {}
}

function normalizeName(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Detect vendor from a freeform model/name string
function detectVendorFromName(name: string): { vendor: string, canonical: string } {
  const raw = String(name || '')
  const n = normalizeName(raw)
  // Map of canonical brand -> synonyms/variants (latin + cyrillic)
  const brandMap: Record<string, string[]> = {
    'Apple': ['apple', 'iphone', 'айфон', 'эппл'],
    'Samsung': ['samsung', 'самсунг', 'galaxy'],
    'Xiaomi': ['xiaomi', 'ксиаоми', 'сяоми', 'mi', 'redmi', 'poco'],
    'Honor': ['honor', 'хонор'],
    'Huawei': ['huawei', 'хуавей'],
    'Realme': ['realme', 'риалми'],
    'OnePlus': ['oneplus', 'one plus', 'ванплас'],
    'Google': ['google', 'pixel', 'пиксель'],
    'Nokia': ['nokia', 'нокиа', 'нокия'],
    'Sony': ['sony', 'xperia', 'сони'],
    'Motorola': ['motorola', 'моторола', 'moto'],
    'Asus': ['asus', 'азус', 'rog'],
    'Vivo': ['vivo', 'виво', 'iqoo'],
    'Oppo': ['oppo', 'оппо'],
    'Nothing': ['nothing', 'phone (1)', 'phone (2)'],
    'Meizu': ['meizu', 'мейзу'],
    'ZTE': ['zte', 'nubia', 'red magic'],
    'Infinix': ['infinix', 'инфиникс'],
    'Tecno': ['tecno', 'текно'],
    'Oukitel': ['oukitel', 'оукител', 'окител'],
    'Blackview': ['blackview', 'блеквью'],
    'Doogee': ['doogee', 'дуги'],
    'Cubot': ['cubot', 'кубот']
  }
  // Prefer matches at the beginning, else anywhere
  for (const [canon, variants] of Object.entries(brandMap)) {
    for (const v of variants) {
      const vn = normalizeName(v)
      if (n.startsWith(vn + ' ') || n === vn) return { vendor: v, canonical: canon }
    }
  }
  for (const [canon, variants] of Object.entries(brandMap)) {
    for (const v of variants) {
      const vn = normalizeName(v)
      if (n.includes(' ' + vn + ' ') || n.endsWith(' ' + vn) || n.includes(vn)) {
        return { vendor: v, canonical: canon }
      }
    }
  }
  return { vendor: '', canonical: '' }
}

// --- Phone catalog (models, storage, ram, colors) ---
type CatalogEntry = { model: string; vendor?: string; items: Array<{ memory: string; color: string; ram: string }> }
let phoneCatalog: CatalogEntry[] | null = null

// --- Laptop catalog (Macbook details) ---
type LaptopItem = { storageGb?: number; ramGb?: number; os?: string; color?: string; disk?: string; gpuType?: string }
type LaptopEntry = {
  model: string
  vendor?: string
  cpuLine?: string
  cpuName?: string
  cpuCores?: number
  items: LaptopItem[]
}
let laptopCatalog: LaptopEntry[] | null = null

function toAbsLaptopCatalogPath(): string | null {
  const roots = [
    path.join(process.cwd(), 'CSV'),
    path.join(process.cwd(), 'csv'),
    path.join(process.cwd(), '..', 'CSV'),
    path.join(process.cwd(), '..', 'csv'),
    '/var/www/technohub/CSV',
    '/var/www/technohub/csv'
  ]
  for (const r of roots) {
    const p = path.join(r, 'laptops.xml')
    if (fs.existsSync(p)) return p
  }
  return null
}

function loadLaptopCatalog(): void {
  try {
    const p = toAbsLaptopCatalogPath()
    if (!p) { laptopCatalog = null; return }
    const xml = fs.readFileSync(p, 'utf8')
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
    const doc: any = parser.parse(xml)
    const out: LaptopEntry[] = []

    // Helper to push entry
    const pushEntry = (modelName: string, cpuLine?: string, cpuName?: string, cpuCores?: number, items?: LaptopItem[]) => {
      if (!modelName) return
      const det = detectVendorFromName(modelName)
      out.push({ model: modelName, vendor: det.canonical || det.vendor || undefined, cpuLine, cpuName, cpuCores, items: items || [] })
    }

    // 1) Modern Russian-structured file: model_na_yam/lineyka_protsessora/... (collect anywhere in the tree)
    const yamArr: any[] = []
    ;(function collect(node: any) {
      if (!node || typeof node !== 'object') return
      for (const k of Object.keys(node)) {
        const v = (node as any)[k]
        if (k === 'model_na_yam') {
          if (Array.isArray(v)) yamArr.push(...v)
          else yamArr.push(v)
        } else if (v && typeof v === 'object') {
          collect(v)
        }
      }
    })(doc)
    for (const m of yamArr) {
      const modelName = m?.name || ''
      const items: LaptopItem[] = []
      let topCpuLine: string | undefined
      let topCpuName: string | undefined
      let topCpuCores: number | undefined
      const cpuLines = m?.lineyka_protsessora
      const cpuLinesArr = Array.isArray(cpuLines) ? cpuLines : (cpuLines ? [cpuLines] : [])
      for (const ln of cpuLinesArr) {
        const cpuLine = ln?.name || ''
        const proc = ln?.protsessor
        const procArr = Array.isArray(proc) ? proc : (proc ? [proc] : [])
        for (const pr of procArr) {
          const cpuName = pr?.name || cpuLine || ''
          const coresNode = pr?.kolichestvo_yader_protsessora
          const coresArr = Array.isArray(coresNode) ? coresNode : (coresNode ? [coresNode] : [])
          for (const cr of coresArr) {
            const cores = parseInt(String(cr?.name || '').replace(/[^0-9]/g, ''), 10)
            const gpuTypeNode = cr?.tip_videokarty
            const gArr = Array.isArray(gpuTypeNode) ? gpuTypeNode : (gpuTypeNode ? [gpuTypeNode] : [])
            for (const gt of gArr) {
              const gpuType = gt?.name || 'Встроенная'
              const gpuNode = gt?.videokarta
              const gpuArr = Array.isArray(gpuNode) ? gpuNode : (gpuNode ? [gpuNode] : [])
              for (const gv of gpuArr) {
                const diagNode = gv?.diagonal_ekrana
                const dArr = Array.isArray(diagNode) ? diagNode : (diagNode ? [diagNode] : [])
                for (const dg of dArr) {
                  const resNode = dg?.razreshenie_ekrana
                  const rArr = Array.isArray(resNode) ? resNode : (resNode ? [resNode] : [])
                  for (const rs of rArr) {
                    const diskNode = rs?.obschiy_obem_nakopiteley
                    const diskArr = Array.isArray(diskNode) ? diskNode : (diskNode ? [diskNode] : [])
                    for (const dn of diskArr) {
                      const storageGb = parseInt(String(dn?.name || '').replace(/[^0-9]/g, ''), 10)
                      const cfgNode = dn?.konfiguratsiya_nakopiteley
                      const cfgArr = Array.isArray(cfgNode) ? cfgNode : (cfgNode ? [cfgNode] : [])
                      for (const cf of cfgArr) {
                        const disk = cf?.name || 'SSD'
                        const ramNode = cf?.obem_operativnoy_pamyati
                        const ramArr = Array.isArray(ramNode) ? ramNode : (ramNode ? [ramNode] : [])
                        for (const rm of ramArr) {
                          const ramGb = parseInt(String(rm?.name || '').replace(/[^0-9]/g, ''), 10)
                          const osNode = rm?.operatsionnaya_sistema
                          const osArr = Array.isArray(osNode) ? osNode : (osNode ? [osNode] : [])
                          for (const os of osArr) {
                            const osName = os?.name || 'macOS'
                            const colorNode = os?.tsvet
                            const colorArr = Array.isArray(colorNode) ? colorNode : (colorNode ? [colorNode] : [])
                            if (!colorArr.length) items.push({ storageGb, ramGb, os: osName, disk, gpuType })
                            for (const cl of colorArr) {
                              const color = cl?.name || undefined
                              items.push({ storageGb, ramGb, os: osName, color, disk, gpuType })
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            if (!topCpuCores && Number.isFinite(cores)) topCpuCores = cores
            if (!topCpuLine) topCpuLine = cpuLine
            if (!topCpuName) topCpuName = cpuName
          }
        }
      }
      pushEntry(modelName, topCpuLine, topCpuName, topCpuCores, items)
    }

    // 2) Generic Model-based structure fallback (older format)
    const models: any[] = []
    function walk(n: any) {
      if (!n || typeof n !== 'object') return
      if (n.Model && Array.isArray(n.Model)) n.Model.forEach((x: any) => models.push(x))
      if (n.Model && !Array.isArray(n.Model)) models.push(n.Model)
      for (const k of Object.keys(n)) walk(n[k])
    }
    walk(doc)
    for (const m of models) {
      const modelName: string = m?.name || m?.ModelName || m?.Model || ''
      if (!modelName) continue
      pushEntry(modelName)
    }
    laptopCatalog = out
    console.log(`✅ Laptop catalog loaded: ${out.length} models from ${p}`)
  } catch (e) {
    console.error('Laptop catalog load error:', (e as any)?.message || e)
    laptopCatalog = null
  }
}

function matchLaptopCatalog(fullName: string): LaptopEntry | null {
  if (!laptopCatalog || laptopCatalog.length === 0) {
    loadLaptopCatalog()
    if (!laptopCatalog || laptopCatalog.length === 0) return null
  }
  console.log(`🔍 Matching laptop for: "${fullName}" (catalog has ${laptopCatalog.length} models)`)
  const n = normalizeName(fullName
    .replace(/\b(ru|mk\w\d+)\b/ig, ' ')
    .replace(/\b(air|pro|max)\b/ig, ' $1 ') // keep important tokens
    .replace(/\s+/g, ' '))
  const variants = [
    n,
    n.replace(/\bm1\b/ig, 'm1 pro'), // если просто M1 в названии — предпочесть M1 Pro
    n.replace(/\bapple\s+macbook\b/ig, 'macbook')
  ]
  let best: { e: LaptopEntry; score: number } | null = null
  // Year preference by chip gen
  const chipYear: Record<string, number> = { m1: 2021, m2: 2022, m3: 2023, m4: 2024, m5: 2025 }
  const chipMatch = fullName.toLowerCase().match(/\bm([1-9])\b/)
  const wantYear = chipMatch ? chipYear[`m${chipMatch[1]}`] : undefined
  const want = extractLaptopTokens(fullName)
  for (const v of variants) {
    for (const e of laptopCatalog) {
      if (!/mac\s*book/i.test(e.model)) continue
      const em = normalizeName(e.model)
      let score = similarityScore(em, v)
      // Strong token matches
      if (/\bpro\b/.test(n) && /\bpro\b/.test(em)) score += 0.5
      if (/\bair\b/.test(n) && /\bair\b/.test(em)) score += 0.5
      if (/\b14\b/.test(n) && /\b14\b/.test(em)) score += 0.3
      if (/\b16\b/.test(n) && /\b16\b/.test(em)) score += 0.3
      // Prefer explicit Max/Pro suffix in name across any chip generation
      if (/\bmax\b/i.test(fullName) && /max/i.test(e.model)) score += 0.8
      if (/\bpro\b/i.test(fullName) && /pro/i.test(e.model)) score += 0.4
      // Prefer 2021 generation if name hints M1 (Pro/Max)
      if (/\bm1\b/i.test(fullName) && /\(\s*2021\s*\)/.test(e.model)) score += 0.5
      // Prefer chip suffix in catalog matching the one in the name (generic for any Mx)
      const chipSfx = (fullName.match(/\b[mM][1-9]\s*(Pro|Max)\b/) || [])[1]
      if (chipSfx) {
        if (new RegExp(chipSfx, 'i').test(e.model)) score += 0.8
        else if (/Max/i.test(String(chipSfx)) && /Pro/i.test(e.model)) score -= 0.3
      }
      // Prefer year by chip mapping, if present in model name
      if (wantYear && new RegExp(String(wantYear)).test(e.model)) score += 0.6
      // Extra: if tokens extracted match, boost heavily
      if (want.line && new RegExp(`\\b${want.line}\\b`).test(em)) score += 1.0
      if (want.diag && new RegExp(`\\b${want.diag}\\b`).test(em)) score += 0.8
      if (want.chip && new RegExp(`\\b${want.chip}\\b`).test(em)) score += 1.0
      if (!best || score > best.score) best = { e, score }
    }
  }
  if (best) console.log(`✅ Best match: "${best.e.model}" (score: ${best.score.toFixed(2)})`)
  else console.log(`❌ No match found for: "${fullName}"`)
  return best ? best.e : null
}

function similarityScore(a: string, b: string): number {
  // crude token overlap
  const as = new Set(a.split(' ').filter(Boolean))
  const bs = new Set(b.split(' ').filter(Boolean))
  let hit = 0
  for (const t of as) if (bs.has(t)) hit++
  return hit / Math.max(1, as.size)
}

function extractLaptopTokens(text: string): { line?: 'air' | 'pro'; diag?: string; chip?: string } {
  const n = normalizeName(text)
  const line = /\bair\b/.test(n) ? 'air' : (/\bpro\b/.test(n) ? 'pro' : undefined)
  const diag = (n.match(/\b(13|14|15|16)\b/) || [])[1]
  const chip = (n.match(/\bm([1-9])\b/) || [])[0] || undefined // m1..m9
  return { line, diag, chip }
}

function toAbsCatalogPath(): string | null {
  const roots = [
    path.join(process.cwd(), 'CSV'),
    path.join(process.cwd(), 'csv'),
    // allow placing catalog at project root next to backend/
    path.join(process.cwd(), '..', 'CSV'),
    path.join(process.cwd(), '..', 'csv')
  ]
  for (const r of roots) {
    const p = path.join(r, 'phone_catalog.xml')
    if (fs.existsSync(p)) return p
  }
  return null
}

function normalizeColor(value: string): string {
  const v = normalizeName(value)
  // map some common English → Russian canonical colors
  // Apple-specific palette first (match laptops.xml color names)
  if (/(desert\s?titanium|desert\b)/i.test(value)) return 'золотистый'
  if (/(natural titanium|titanium|titan)/i.test(value)) return 'серый'
  if (/(starlight|стард?лайт)/i.test(value)) return 'золотистый'  // Starlight → Золотистый (для Mac/общего кейса)
  if (/(space\s*gray|space\s*grey)/i.test(value)) return 'серый'
  if (/(jet\s?black|midnight\s?black|midnight|миднайт|ночн)/i.test(value)) return 'черный'
  if (/(graphite|графит)/i.test(value)) return 'серый'
  // Composite colors - check these before single-word colors
  if (/(obsidian\s?black)/i.test(value)) return 'серый'  // Obsidian Black → серый для Realme
  if (/(blue\s?black)/i.test(value)) return 'черный'  // Blue Black → черный
  if (/(sky\s?blue|icy\s?blue)/i.test(value)) return 'голубой'  // Sky Blue, Icy Blue → голубой
  if (/(sky\s?light\s?gold|light\s?gold)/i.test(value)) return 'золотистый'  // Light Gold → золотистый
  if (/(light\s?gray|light\s?grey)/i.test(value)) return 'серебристый'  // Light Gray → серебристый
  if (/(cosmic\s?orange)/i.test(value)) return 'оранжевый'  // Cosmic Orange → оранжевый
  // specific named shades
  if (/(mist\s*blue)/i.test(value)) return 'голубой'
  if (/\bsage\b/i.test(value)) return 'зелёный'
  if (/\bnavy\b/i.test(value)) return 'синий'  // Navy → синий
  const map: Record<string, string> = {
    'white': 'белый',
    'black': 'черный',
    'ultramarine': 'голубой',
    'teal': 'зелёный',
    'green': 'зелёный',
    'yellow': 'желтый',
    'red': 'красный',
    'orange': 'оранжевый',
    'blue': 'голубой',
    'light blue': 'голубой',
    'gold': 'золотистый',
    'light gold': 'золотистый',
    'light-gold': 'золотистый',
    'lightgold': 'золотистый',
    'starlight': 'золотистый',
    'silver': 'серебристый',
    'gray': 'серый',
    'grey': 'серый',
    'light gray': 'серебристый',
    'light grey': 'серебристый',
    'lightgray': 'серебристый',
    'lightgrey': 'серебристый',
    'purple': 'фиолетовый',
    'pink': 'розовый',
  }
  for (const [k, ru] of Object.entries(map)) {
    if (v === normalizeName(k)) return ru
  }
  return value
}

// Convert normalized RU color to catalog-style Title Case (matching laptops.xml wording)
function toRuCatalogColor(value: string): string {
  const v = normalizeColor(String(value)).toLowerCase()
  const map: Record<string, string> = {
    'черный': 'Чёрный',
    'чёрный': 'Чёрный',
    'белый': 'Белый',
    'синий': 'Синий',
    'голубой': 'Голубой',
    'фиолетовый': 'Фиолетовый',
    'розовый': 'Розовый',
    'красный': 'Красный',
    'золотистый': 'Золотистый',
    'серебристый': 'Серебристый',
    'серый': 'Серый',
    'зелёный': 'Зелёный',
    'зеленый': 'Зелёный',
    'желтый': 'Жёлтый',
    'жёлтый': 'Жёлтый',
    'оранжевый': 'Оранжевый'
  }
  return map[v] || (v ? v[0].toUpperCase() + v.slice(1) : '')
}

function pickPreferredColorFromName(name: string): string {
  // Include Apple palette explicitly (Space Gray, Midnight, Starlight, Desert)
  // Use word-boundary for 'red' to avoid matching 'Redmi'
  const rx = /(desert\s*titanium|\bdesert\b|space\s*gray|space\s*grey|jet\s?black|midnight\s?black|midnight|starlight|natural titanium|titanium|graphite|ultramarine|teal|green|yellow|orange|white|black|blue|purple|pink|gold|silver|grey|gray|\bproduct\s*red\b|\bred\b|sky\s*light\s*gold|mist\s*blue|sage|серый|чёрный|черный|белый|синий|голубой|фиолетовый|розовый|золотистый|серебристый|зелёный|зеленый|желтый|красный|оранжевый)/gi
  const matches = Array.from(name.matchAll(rx))
  if (!matches.length) return ''
  const weight = (raw: string): number => {
    if (/desert\s*titanium|\bdesert\b/i.test(raw)) return 8
    if (/space\s*gray|space\s*grey/i.test(raw)) return 7
    if (/starlight/i.test(raw)) return 7
    if (/(mist\s*blue|sage)/i.test(raw)) return 6
    if (/sky\s*light\s*gold/i.test(raw)) return 6
    if (/(black|white|blue|green|pink|purple|yellow|orange|grey|gray|серый|чёрный|черный|белый|синий|голубой|фиолетовый|розовый|зелёный|зеленый|желтый|красный|оранжевый|\bproduct\s*red\b|\bred\b)/i.test(raw)) return 5
    if (/(gold|silver|золотистый|серебристый)/i.test(raw)) return 4
    if (/(ultramarine|teal)/i.test(raw)) return 4
    if (/(titanium|graphite|natural titanium)/i.test(raw)) return 1
    return 2
  }
  // Choose the highest-weight color; tie breaks by first occurrence
  let best = matches[0]
  let bestW = weight(best[0])
  for (const m of matches.slice(1)) {
    const w = weight(m[0])
    if (w > bestW) { best = m; bestW = w }
  }
  return normalizeColor(best[0])
}

function buildMacModelFromName(name: string): string {
  const text = String(name || '')
  const isPro = /\bpro\b/i.test(text)
  const isAir = /\bair\b/i.test(text)
  const diag = (text.match(/\b(13|14|15|16)\b/) || [])[1]
  const chip = (text.match(/\b[mM]([1-9])\b/) || [])[1]
  const yearMap: Record<string, string> = { '1': '2021', '2': '2022', '3': '2023', '4': '2024', '5': '2025' }
  const year = chip ? yearMap[String(chip)] : undefined
  const line = isPro ? 'Pro' : (isAir ? 'Air' : '')
  const parts = ['MacBook', line, diag ? diag : '']
  const base = parts.filter(Boolean).join(' ')
  console.log(`🔨 buildMacModelFromName("${name}") → chip: ${chip}, year: ${year}, result: "${year ? `${base} (${year})` : base}"`)
  return year ? `${base} (${year})` : base
}

function normalizeMemoryFromName(name: string): string | null {
  const text = String(name || '')
  // Exclude resolution patterns like "3024 X 1964" by removing them first
  const cleanText = text.replace(/\b\d{3,4}\s*[xXхХ×]\s*\d{3,4}\b/g, '')
  const all = Array.from(cleanText.matchAll(/(\d+)\s?(TB|ТБ|Тб|GB|ГБ|Гб)\b/gi))
  if (!all.length) {
    // Fallback: detect common storage sizes without explicit units (e.g., "512"),
    // avoiding diagonals like "6.1" and other numeric noise.
    const noDecimals = cleanText.replace(/\b\d{1,2}[.,]\d\b/g, ' ')
    const plain = noDecimals.match(/\b(64|128|256|512|1024|2048|4096)\b/)
    if (plain) return `${Number(plain[1])} ГБ`
    return null
  }
  // Prefer an explicit GB occurrence if present; else take the first TB occurrence
  const gb = all.find(m => /GB|ГБ|Гб/i.test(m[2])) || null
  const m = gb || all[0]
  const num = Number(m[1])
  const unit = m[2].toUpperCase()
  if (unit === 'TB' || unit.startsWith('Т')) return `${num * 1024} ГБ`
  return `${num} ГБ`
}

// Определение типа SIM для iPhone по названию
function deriveIphoneSimFromName(name: string, vendor?: string, model?: string): string | null {
  const raw = String(name || '')
  const v = String(vendor || '')
  const m = String(model || '')
  const isIphone = /iphone/i.test(`${v} ${m} ${raw}`)
  if (!isIphone) return null

  // Нормализуем пробелы
  const text = raw.replace(/\s+/g, ' ')

  // Правила в приоритетном порядке
  if (/\b2\s*sim\b/i.test(text)) return '2 SIM'
  if (/dual\s*sim/i.test(text)) return '2 SIM'
  if (/(?:\bSIM\s*[+&x×]\s*e\s*SIM\b|\be\s*SIM\s*[+&x×]\s*SIM\b|\(e\s*SIM\s*\+\s*SIM\)|\(SIM\s*\+\s*e\s*SIM\))/i.test(text)) return 'SIM + eSIM'
  if (/dual\s*e\s*sim/i.test(text)) return 'Только eSIM'
  const hasEsim = /\b(?:e\s*sim|esim)\b/i.test(text)
  const simOutsideEsim = /\bsim\b/i.test(text.replace(/\b(?:e\s*sim|esim)\b/gi, ''))
  if (hasEsim && !simOutsideEsim) return 'Только eSIM'
  return null
}

// Extract patterns like "12/512", "8+256", "12x512" where first is RAM (GB), second is Storage
function parseRamStorageFromName(name: string): { ramGb?: number; storageGb?: number } {
  const text = String(name || '')
  // Exclude resolution patterns like "3024 X 1964" first
  const cleanText = text.replace(/\b\d{3,4}\s*[xXхХ×]\s*\d{3,4}\b/g, '')
  // 0) Triple tokens like "M3/8/512" or "4+12/128" →
  //    - если три числа, RAM берём из ПЕРВОГО числа, Storage — из ПОСЛЕДНЕГО
  let m = cleanText.match(/\b(?:m\s*[1-9]\s*[\/+×\-]\s*)?(\d{1,2})\s*[\/+×\-]\s*(\d{1,2})\s*[\/+×\-]\s*(\d{2,4})(?:\s*(TB|ТБ|Тб|GB|ГБ|Гб))?\b/i)
  if (m) {
    const ram = Number(m[1])
    let storage = Number(m[3])
    const unit = (m[4] || '').toUpperCase()
    if ((unit === 'TB' || unit.startsWith('Т')) && isFinite(storage)) storage = storage * 1024
    return { ramGb: isFinite(ram) ? ram : undefined, storageGb: isFinite(storage) ? storage : undefined }
  }
  // 0.5) Two tokens where storage is in TB with one digit: "12/1TB" → 12 / 1024
  m = cleanText.match(/\b(?:m\s*[1-9]\s*[\/+×\-]\s*)?(\d{1,2})\s*[\/+×\-]\s*(\d{1,2})\s*(TB|ТБ|Тб)\b/i)
  if (m) {
    const ram = Number(m[1])
    let storage = Number(m[2])
    const unit = (m[3] || '').toUpperCase()
    if ((unit === 'TB' || unit.startsWith('Т')) && isFinite(storage)) storage = storage * 1024
    return { ramGb: isFinite(ram) ? ram : undefined, storageGb: isFinite(storage) ? storage : undefined }
  }
  // 1) Explicit separators (allow optional leading Mx/): 8/256, 12+512, 12x512, 12-512
  m = cleanText.match(/\b(?:m\s*[1-9]\s*[\/+×\-]\s*)?(\d{1,2})\s*[\/+×\-]\s*(\d{2,4})\s*(TB|ТБ|Тб|GB|ГБ|Гб)?\b/i)
  // 2) Space-separated only if the FIRST number looks like a valid RAM size (avoid model numbers like "14"): 8 256GB
  //    Allow typical RAM sizes only
  if (!m) m = cleanText.match(/\b(4|6|8|12|16|24|32|64)\b\s+(\d{2,4})\s*(TB|ТБ|Тб|GB|ГБ|Гб)\b/i)
  if (!m) return {}
  const ram = Number(m[1])
  let storage = Number(m[2])
  const unit = (m[3] || '').toUpperCase()
  if ((unit === 'TB' || unit.startsWith('Т')) && isFinite(storage)) storage = storage * 1024
  return { ramGb: isFinite(ram) ? ram : undefined, storageGb: isFinite(storage) ? storage : undefined }
}

function loadPhoneCatalog(): void {
  try {
    const p = toAbsCatalogPath()
    if (!p) { phoneCatalog = null; return }
    const xml = fs.readFileSync(p, 'utf8')
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
    const doc: any = parser.parse(xml)
    const out: CatalogEntry[] = []
    // Flexible traversal: find all Model nodes regardless of nesting
    const models: any[] = []
    function walk(n: any) {
      if (!n || typeof n !== 'object') return
      if (n.Model && Array.isArray(n.Model)) n.Model.forEach((x: any) => models.push(x))
      if (n.Model && !Array.isArray(n.Model)) models.push(n.Model)
      for (const k of Object.keys(n)) walk(n[k])
    }
    walk(doc)
    for (const m of models) {
      const modelName: string = m?.name || ''
      if (!modelName) continue
      const items: Array<{ memory: string; color: string; ram: string }> = []
      const mems = m?.MemorySize
      const memArr = Array.isArray(mems) ? mems : (mems ? [mems] : [])
      for (const mem of memArr) {
        const memName: string = mem?.name || ''
        const colors = mem?.Color
        const colorsArr = Array.isArray(colors) ? colors : (colors ? [colors] : [])
        for (const c of colorsArr) {
          const colorName: string = c?.name || ''
          const ramNode = c?.RamSize
          const ramName: string = (Array.isArray(ramNode) ? ramNode[0]?.name : ramNode?.name) || ''
          items.push({ memory: memName, color: colorName, ram: ramName })
        }
      }
      // Try to detect vendor from model
      const det = detectVendorFromName(modelName)
      out.push({ model: modelName, vendor: det.canonical || det.vendor || undefined, items })
    }
    phoneCatalog = out
  } catch (e) {
    console.error('Phone catalog load error:', (e as any)?.message || e)
    phoneCatalog = null
  }
}

function isPlaceholderImage(u: string): boolean {
  if (!u) return true
  const s = String(u).toLowerCase()
  // strip host
  const pathOnly = s.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '')
  const file = pathOnly.split('?')[0]
  return /(^|\/)placeholder(\.[a-z0-9]+)?$/i.test(file)
    || /(^|\/)no[_-]?photo(\.[a-z0-9]+)?$/i.test(file)
    || /(^|\/)nophoto(\.[a-z0-9]+)?$/i.test(file)
    || /(^|\/)default([-_]?image)?(\.[a-z0-9]+)?$/i.test(file)
}

function matchCatalog(fullName: string): { vendor?: string; model?: string; memory?: string; color?: string; ram?: string } | null {
  if (!phoneCatalog || phoneCatalog.length === 0) {
    loadPhoneCatalog()
    if (!phoneCatalog || phoneCatalog.length === 0) return null
  }
  const n = normalizeName(fullName)
  // Text variants for matching
  const textVariants = [
    n,
    // insert 'galaxy' after samsung
    n.replace(/\bsamsung\s+/g, 'samsung galaxy '),
    // treat '+' as ' plus '
    n.replace(/\+/g, ' plus ')
  ]

  // 1) Samsung precise parser: series/number/(+|plus|ultra|fe)/5g
  // Guard: if title clearly mentions Xiaomi family (Xiaomi/Redmi/Poco/Mi), skip Samsung parser entirely
  const mentionsXiaomiFamily = /(\bxiaomi\b|\bredmi\b|\bpoco\b|\bmi\b)/i.test(n)
  if (!mentionsXiaomiFamily) {
  const nameForSamsung = fullName.replace(/\+/g, ' Plus ')
  const samsungRe = /\b(?:samsung\s+)?(?:galaxy\s+)?(a|s|m|f|z)\s*(\d{1,3})(?:\s*(\+|plus|ultra|fe|edge))?(?:\s*(5\s*g))?/i
  const sm = nameForSamsung.match(samsungRe)
  if (sm) {
    const series = sm[1].toLowerCase()
    const num = sm[2]
    let suffix = (sm[3] || '').toLowerCase() // +|plus|ultra|fe
    if (suffix === '+') suffix = 'plus'
    const is5g = !!sm[4]
    const prefix = normalizeName(`galaxy ${series}${num}${suffix ? ' ' + suffix : ''}`)
    const altPrefix = prefix.replace(/^galaxy\s+/, '') // e.g., 's25 ...'
    // Prefer exact model token match first (e.g., A07 should not drift to A7/A36)
    const seriesToken = series
    const numToken = num
    const exactTokenRe = new RegExp(`(^|\\s)galaxy\\s+${seriesToken}0?${numToken.replace(/^0+/, '')}(\\s|$)`) // allow optional leading zero in name
    let candidates = phoneCatalog.filter(e => {
      const emRaw = normalizeName(e.model)
      return exactTokenRe.test(emRaw)
    })
    if (!candidates.length) {
      candidates = phoneCatalog.filter(e => {
      const em = normalizeName(e.model)
      const emPlus = normalizeName(String(e.model).replace(/\+/g, ' plus '))
      const emNoSamsung = em.replace(/^samsung\s+/, '')
      const emNoSG = emNoSamsung.replace(/^galaxy\s+/, '')
      return (
        em.startsWith(prefix) || emPlus.startsWith(prefix) ||
        emNoSamsung.startsWith(prefix) || emNoSG.startsWith(prefix) ||
        em.startsWith(altPrefix) || emNoSamsung.startsWith(altPrefix) || emNoSG.startsWith(altPrefix)
      )
    })
    }
    if (candidates.length) {
      // prefer base model when no explicit suffix, else prefer exact suffix; then 5G if requested; then longer
      candidates.sort((a, b) => {
        const aHasPlus = /\bplus\b|\+/i.test(a.model) ? 1 : 0
        const bHasPlus = /\bplus\b|\+/i.test(b.model) ? 1 : 0
        const aHasUltra = /\bultra\b/i.test(a.model) ? 1 : 0
        const bHasUltra = /\bultra\b/i.test(b.model) ? 1 : 0
        const aHasFe = /\bfe\b/i.test(a.model) ? 1 : 0
        const bHasFe = /\bfe\b/i.test(b.model) ? 1 : 0
        const aHasEdge = /\bedge\b/i.test(a.model) ? 1 : 0
        const bHasEdge = /\bedge\b/i.test(b.model) ? 1 : 0
        // If no suffix in input, prefer models without suffix
        const wantBase = !suffix
        if (wantBase) {
          const aSuffix = aHasPlus + aHasUltra + aHasFe + aHasEdge
          const bSuffix = bHasPlus + bHasUltra + bHasFe + bHasEdge
          if (aSuffix !== bSuffix) return aSuffix - bSuffix
        } else {
          // prefer exact suffix match
          const matchScore = (m: string) => {
            const s = suffix
            if (s === 'plus') return (/\bplus\b|\+/i.test(m) ? 1 : 0)
            if (s === 'ultra') return (/\bultra\b/i.test(m) ? 1 : 0)
            if (s === 'fe') return (/\bfe\b/i.test(m) ? 1 : 0)
            if (s === 'edge') return (/\bedge\b/i.test(m) ? 1 : 0)
            return 0
          }
          const as = matchScore(a.model)
          const bs = matchScore(b.model)
          if (as !== bs) return bs - as
        }
        const a5 = /\b5\s*g\b/i.test(a.model) ? 1 : 0
        const b5 = /\b5\s*g\b/i.test(b.model) ? 1 : 0
        // If input mentions 5G, prefer 5G; otherwise prefer non-5G
        if (is5g && a5 !== b5) return b5 - a5
        if (!is5g && a5 !== b5) return a5 - b5
        // Finally, prefer exact base match (e.g., 'galaxy s25' should beat 'galaxy s25 ultra/edge')
        const basePrefix = normalizeName(`galaxy ${series}${num}`)
        const aBase = normalizeName(a.model).startsWith(basePrefix) ? 1 : 0
        const bBase = normalizeName(b.model).startsWith(basePrefix) ? 1 : 0
        if (aBase !== bBase) return bBase - aBase
        return normalizeName(b.model).length - normalizeName(a.model).length
      })
      const best = candidates[0]
      const memory = normalizeMemoryFromName(fullName)
      const preferred = pickPreferredColorFromName(fullName)
      const colorEq = (a?: string, b?: string) => a && b && normalizeName(normalizeColor(a)) === normalizeName(normalizeColor(b))
      let picked = best.items.find(it => (!memory || normalizeName(it.memory) === normalizeName(memory)) && (preferred ? colorEq(it.color, preferred) : true))
      if (!picked && preferred) picked = best.items.find(it => normalizeName(normalizeColor(String(it.color))).includes(normalizeName(preferred))) || null as any
      if (!picked && memory) picked = best.items.find(it => normalizeName(it.memory) === normalizeName(memory)) || null as any
      if (!picked) picked = best.items[0]
      return { vendor: best.vendor, model: best.model, memory: picked?.memory, color: picked?.color ? normalizeColor(picked.color) : undefined, ram: picked?.ram }
    }
  }
  }

  // 1.2) Samsung Fold/Flip parser: map "Samsung Fold5" → "Galaxy Z Fold5", "Samsung Flip5" → "Galaxy Z Flip5"
  {
    const fold = n.match(/\b(?:samsung\s+)?(?:galaxy\s+)?(?:z\s+)?fold\s*(\d{1,2})\b/i)
    const flip = n.match(/\b(?:samsung\s+)?(?:galaxy\s+)?(?:z\s+)?flip\s*(\d{1,2})\b/i)
    const isFold = !!fold
    const isFlip = !!flip
    const num = fold ? fold[1] : (flip ? flip[1] : null)
    if (num) {
      const want = normalizeName(`galaxy z ${isFold ? 'fold' : 'flip'} ${num}`)
      const candidates = phoneCatalog.filter(e => {
        const em = normalizeName(e.model)
        // allow exact startsWith and variants without 'galaxy'
        const emNoGalaxy = em.replace(/^samsung\s+galaxy\s+/, '').replace(/^galaxy\s+/, '')
        return em.startsWith(want) || emNoGalaxy.startsWith(want.replace(/^galaxy\s+/, ''))
      })
      if (candidates.length) {
        // Prefer exact normalized equality first, else longer
        candidates.sort((a, b) => {
          const ea = Number(normalizeName(a.model) === want)
          const eb = Number(normalizeName(b.model) === want)
          if (ea !== eb) return eb - ea
          return normalizeName(b.model).length - normalizeName(a.model).length
        })
        const best = candidates[0]
        const memory = normalizeMemoryFromName(fullName)
        const preferred = pickPreferredColorFromName(fullName)
        const colorEq = (a?: string, b?: string) => a && b && normalizeName(normalizeColor(a)) === normalizeName(normalizeColor(b))
        let picked = best.items.find(it => (!memory || normalizeName(it.memory) === normalizeName(memory)) && (preferred ? colorEq(it.color, preferred) : true))
        if (!picked && preferred) picked = best.items.find(it => normalizeName(normalizeColor(String(it.color))).includes(normalizeName(preferred))) || null as any
        if (!picked && memory) picked = best.items.find(it => normalizeName(it.memory) === normalizeName(memory)) || null as any
        if (!picked) picked = best.items[0]
        return { vendor: best.vendor, model: best.model, memory: picked?.memory, color: picked?.color ? normalizeColor(picked.color) : undefined, ram: picked?.ram }
      }
    }
  }

  // 1.5) Xiaomi T-models (e.g., 14T, 14T Pro, 15T, 15T Pro)
  const tMatch = n.match(/\b(1[45])\s*t\b(?:\s*(pro))?/)
  if (tMatch) {
    const series = tMatch[1] // 14 or 15
    const wantsPro = Boolean(tMatch[2]) || /\bpro\b/i.test(fullName)
    // Prefer exact model name equal to token; else contains token
    let candidates = phoneCatalog.filter(e => {
      const em = normalizeName(e.model)
      // Match "14t" or "14 t" with optional "pro"
      const base = normalizeName(e.model)
      const isPro = /\bpro\b/i.test(e.model)
      const hasT = new RegExp(`\\b${series}t\\b`).test(base)
      return hasT && (wantsPro ? isPro : true)
    })
    if (candidates.length) {
      // Prefer exact equality first, then longer
      candidates.sort((a, b) => {
        // Prefer Pro if requested; otherwise non-Pro first
        const ap = /\bpro\b/i.test(a.model) ? 1 : 0
        const bp = /\bpro\b/i.test(b.model) ? 1 : 0
        if (ap !== bp) return wantsPro ? (bp - ap) : (ap - bp)
        return normalizeName(a.model).length - normalizeName(b.model).length
      })
      const best = candidates[0]
      const memory = normalizeMemoryFromName(fullName)
      const preferred = pickPreferredColorFromName(fullName)
      const colorEq = (a?: string, b?: string) => a && b && normalizeName(normalizeColor(a)) === normalizeName(normalizeColor(b))
      let picked = best.items.find(it => (!memory || normalizeName(it.memory) === normalizeName(memory)) && (preferred ? colorEq(it.color, preferred) : true))
      if (!picked && preferred) picked = best.items.find(it => normalizeName(normalizeColor(String(it.color))).includes(normalizeName(preferred))) || null as any
      if (!picked && memory) picked = best.items.find(it => normalizeName(it.memory) === normalizeName(memory)) || null as any
      if (!picked) picked = best.items[0]
      return { vendor: best.vendor, model: best.model, memory: picked?.memory, color: picked?.color ? normalizeColor(picked.color) : undefined, ram: picked?.ram }
    }
  }
  // Additional guard: if the input clearly mentions Samsung with explicit series+number (e.g., "A07", "A56"),
  // restrict generic matching to the same series to avoid false hits like S25 from "... 256 ...".
  {
    const samsungHint = /(samsung|самсунг|galaxy)/i.test(fullName)
    const mSeries = fullName.replace(/\+/g, ' Plus ').match(/\b([aAsSmMfFzZ])\s*0?(\d{1,3})\b/)
    if (samsungHint && mSeries) {
      const wantSeries = mSeries[1].toLowerCase()
      const wantNum = mSeries[2]
      const wantPrefix = normalizeName(`galaxy ${wantSeries}${wantNum}`)
      const filtered = phoneCatalog.filter(e => {
        const em = normalizeName(e.model)
        const emNo = em.replace(/^samsung\s+/, '').replace(/^galaxy\s+/, '')
        return em.startsWith(wantPrefix) || emNo.startsWith(wantPrefix.replace(/^galaxy\s+/, ''))
      })
      if (filtered.length) {
        // Pick by memory/color like below and return early
        const best = filtered.sort((a, b) => normalizeName(b.model).length - normalizeName(a.model).length)[0]
        const memory = normalizeMemoryFromName(fullName)
        const preferred = pickPreferredColorFromName(fullName)
        const colorEq = (a?: string, b?: string) => a && b && normalizeName(normalizeColor(a)) === normalizeName(normalizeColor(b))
        let picked = best.items.find(it => (!memory || normalizeName(it.memory) === normalizeName(memory)) && (preferred ? colorEq(it.color, preferred) : true))
        if (!picked && preferred) picked = best.items.find(it => normalizeName(normalizeColor(String(it.color))).includes(normalizeName(preferred))) || null as any
        if (!picked && memory) picked = best.items.find(it => normalizeName(it.memory) === normalizeName(memory)) || null as any
        if (!picked) picked = best.items[0]
        return { vendor: best.vendor, model: best.model, memory: picked?.memory, color: picked?.color ? normalizeColor(picked.color) : undefined, ram: picked?.ram }
      }
    }
  }
  // Find model mention in name by best (longest) model match, with 5G preference rules
  const inputHas5g = /\b5\s*g\b/i.test(fullName)
  const candidates: Array<{ entry: CatalogEntry; length: number; has5g: boolean }> = []
  for (const entry of phoneCatalog) {
    const base = normalizeName(entry.model)
    if (!base) continue
    // Generate model aliases: optional 'galaxy' prefix, optional 'samsung', optional '5g', plus sign synonyms
    const aliases = new Set<string>()
    const rawModel = String(entry.model)
    const b1 = base
    const b2 = base.replace(/^samsung\s+galaxy\s+/, 'galaxy ').replace(/^galaxy\s+/, '')
    const b3 = base.replace(/\b5\s*g\b/g, '').replace(/\s+/g, ' ').trim()
    const plusVariant = normalizeName(rawModel.replace(/\+/g, ' plus '))
    ;[b1, b2, b3, plusVariant].forEach(s => aliases.add(s))

    const makeRegex = (s: string) => {
      const tokens = s.split(/\s+/).filter(Boolean)
      const body = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*')
      return new RegExp(`\\b${body}\\b`)
    }
    const regexes = Array.from(aliases).map(makeRegex)
    const hit = textVariants.some(t => regexes.some(rx => rx.test(t)))
    if (hit) {
      candidates.push({ entry, length: base.length, has5g: /\b5\s*g\b/i.test(rawModel) })
    }
  }
  if (candidates.length === 0) return null
  const wantsAir = /\bair\b/i.test(fullName)
  candidates.sort((a, b) => {
    // Prefer Air models if name mentions Air
    if (wantsAir) {
      const aAir = /\bair\b/i.test(a.entry.model) ? 1 : 0
      const bAir = /\bair\b/i.test(b.entry.model) ? 1 : 0
      if (aAir !== bAir) return bAir - aAir
    }
    // Prefer matching 5G presence: if input doesn't have 5G, prefer non-5G models
    if (inputHas5g) {
      if (a.has5g !== b.has5g) return b.has5g ? 1 : -1
    } else {
      if (a.has5g !== b.has5g) return a.has5g ? 1 : -1
    }
    // Fall back to longer normalized model name
    return b.length - a.length
  })
  const best = candidates[0].entry
  const memory = normalizeMemoryFromName(fullName)
  // color candidates from name
  const preferred = pickPreferredColorFromName(fullName)
  // Pick item by memory + color if possible
  const colorEq = (a?: string, b?: string) => a && b && normalizeName(normalizeColor(a)) === normalizeName(normalizeColor(b))
  let picked = best.items.find(it => (!memory || normalizeName(it.memory) === normalizeName(memory)) && (preferred ? colorEq(it.color, preferred) : true))
  // if color specified, try color-only before memory-only to satisfy color preference
  if (!picked && preferred) picked = best.items.find(it => normalizeName(normalizeColor(String(it.color))).includes(normalizeName(preferred))) || null as any
  if (!picked && memory) picked = best.items.find(it => normalizeName(it.memory) === normalizeName(memory)) || null as any
  if (!picked) picked = best.items[0]
  return { vendor: best.vendor, model: best.model, memory: picked?.memory, color: picked?.color ? normalizeColor(picked.color) : undefined, ram: picked?.ram }
}

function findSheetForCategory(wb: XLSX.WorkBook, categoryName: string): string | null {
  const target = normalizeName(categoryName)
  // Exact normalized match first
  for (const n of wb.SheetNames) {
    if (normalizeName(n) === target) return n
  }
  // Then includes/keywords
  for (const n of wb.SheetNames) {
    const nn = normalizeName(n)
    if (nn.includes(target) || target.includes(nn)) return n
  }
  return null
}

function findHeaderRowIndex(aoa: any[][], sheetName?: string): number {
  const isNotebook = !!(sheetName && /ноутбук/i.test(sheetName))
  // For phones – classic Avito headers. For notebooks – use broader patterns.
  const EXPECT = isNotebook ? [
    'Категори', // Категория
    'Производ', // Производитель
    'Модель',
    'Операцион', // Операционная система
    'Тип видеокар', // Тип видеокарты
    'Конфигурац', // Конфигурация диска
    'Общий объем', // Общий объем накопителя
    'Разрешен' // Разрешение
  ] : [
    'Уникальный идентификатор объявления',
    'Название',
    'Цена',
    'Категория',
    'Подкатегория',
    'Производитель',
    'Модель'
  ]
  let bestIdx = 0
  let bestScore = -1
  const limit = Math.min(50, aoa.length)
  for (let i = 0; i < limit; i++) {
    const row = (aoa[i] || []).map((v: any) => String(v || '').trim())
    const nrow = row.map(normalizeName)
    let score = 0
    for (const key of EXPECT) {
      const nk = normalizeName(key)
      if (nrow.some(cell => cell.includes(nk))) score++
    }
    if (score > bestScore) { bestScore = score; bestIdx = i }
    if (!isNotebook && score >= 5) return i
    if (isNotebook && score >= 4) return i
  }
  return bestIdx
}

function getSheetRef(ws: XLSX.WorkSheet): { r0: number; c0: number; r1: number; c1: number } {
  const ref = ws['!ref'] || 'A1:A1'
  const range = XLSX.utils.decode_range(ref)
  return { r0: range.s.r, c0: range.s.c, r1: range.e.r, c1: range.e.c }
}

function appendRows(ws: XLSX.WorkSheet, rows: any[][]) {
  if (!rows.length) return
  const { r1 } = getSheetRef(ws)
  const origin = { r: r1 + 1, c: 0 }
  XLSX.utils.sheet_add_aoa(ws, rows, { origin })
}

export async function generateFeed(feedId: string): Promise<{ path: string, report: any[] }> {
  const feed = await AvitoFeed.findById(feedId)
  if (!feed) throw new Error('Feed not found')

  // Force filters for specific feeds (business rule)
  const FORCE_ONLY_IDS = new Set<string>(['68f3b0e1b8474990e85c2f1e'])
  const isForced = FORCE_ONLY_IDS.has(String(feed._id)) || /^(тест|test)$/i.test(String((feed as any).name || ''))
  const onlyActiveFlag = isForced ? true : (feed.settings as any)?.includeOnlyActive === true
  const onlyInStockFlag = isForced ? true : (feed.settings as any)?.includeOnlyInStock === true

  const templateAbs = findTemplatePath()
  // Собираем новую книгу БЕЗ служебных листов (СПР-*, инструкции)
  const baseWb = XLSX.readFile(templateAbs)
  const wb: XLSX.WorkBook = XLSX.utils.book_new()
  for (const name of baseWb.SheetNames) {
    const normalized = normalizeName(name)
    if (normalized.startsWith('спр') || normalized.startsWith('инструкц')) continue
    ;(wb.Sheets as any)[name] = (baseWb.Sheets as any)[name]
    wb.SheetNames.push(name)
  }
  const defaultHeaders = getHeaderRow(wb)

  // Selected root categories (do NOT expand here to avoid double-counting). Descendants are collected per root below.
  const selectedCatIds: string[] = feed.settings.categories || []
  let catObjectIds: any[] = selectedCatIds.length ? [...new Set(selectedCatIds.map(String))] : []

  // Decide whether we need to import the supplemental notebook sheet based on selection
  const macRx = /mac\s*book|macbook|ноутбук/i
  if (selectedCatIds.length) {
    const selectedCats = await Category.find({ _id: { $in: selectedCatIds } }).lean()
    const cache = new Map<string, any>()
    let needNotebook = false
    for (const sc of selectedCats) {
      if (macRx.test(String(sc?.name || ''))) { needNotebook = true; break }
      // climb up to 6 levels
      let pid = sc?.parentId as any
      let hops = 0
      while (pid && hops < 6) {
        let p = cache.get(String(pid))
        if (!p) { p = await Category.findById(pid).lean(); if (p) cache.set(String(pid), p) }
        if (!p) break
        if (macRx.test(String(p.name || ''))) { needNotebook = true; break }
        pid = p.parentId; hops++
      }
      if (needNotebook) break
    }
    if (needNotebook) {
      // Import only specific new sheets from other xlsx files (e.g., Электроника-Ноутбуки)
      importSupplementSheets(wb, templateAbs)
    }
  }

  // Helper: extract attributes
  function detectVendorFromName(name: string): { vendor: string, canonical: string } {
    const raw = String(name || '')
    const n = normalizeName(raw)
    // Map of canonical brand -> synonyms/variants (latin + cyrillic)
    const brandMap: Record<string, string[]> = {
      'Apple': ['apple', 'iphone', 'айфон', 'эппл'],
      'Samsung': ['samsung', 'самсунг', 'galaxy'],
      'Xiaomi': ['xiaomi', 'ксиаоми', 'сяоми', 'mi', 'redmi', 'poco'],
      'Honor': ['honor', 'хонор'],
      'Huawei': ['huawei', 'хуавей'],
      'Realme': ['realme', 'риалми'],
      'OnePlus': ['oneplus', 'one plus', 'ванплас'],
      'Google': ['google', 'pixel', 'пиксель'],
      'Nokia': ['nokia', 'нокиа', 'нокия'],
      'Sony': ['sony', 'xperia', 'сони'],
      'Motorola': ['motorola', 'моторола', 'moto'],
      'Asus': ['asus', 'азус', 'rog'],
      'Vivo': ['vivo', 'виво', 'iqoo'],
      'Oppo': ['oppo', 'оппо'],
      'Nothing': ['nothing', 'phone (1)', 'phone (2)'],
      'Meizu': ['meizu', 'мейзу'],
      'ZTE': ['zte', 'nubia', 'red magic'],
      'Infinix': ['infinix', 'инфиникс'],
      'Tecno': ['tecno', 'текно'],
      'Oukitel': ['oukitel', 'оукител', 'окител'],
      'Blackview': ['blackview', 'блеквью'],
      'Doogee': ['doogee', 'дуги'],
      'Cubot': ['cubot', 'кубот']
    }
    // Prefer matches at the beginning, else anywhere
    for (const [canon, variants] of Object.entries(brandMap)) {
      for (const v of variants) {
        const vn = normalizeName(v)
        if (n.startsWith(vn + ' ') || n === vn) return { vendor: v, canonical: canon }
      }
    }
    for (const [canon, variants] of Object.entries(brandMap)) {
      for (const v of variants) {
        const vn = normalizeName(v)
        if (n.includes(' ' + vn + ' ') || n.endsWith(' ' + vn) || n.includes(vn)) {
          return { vendor: v, canonical: canon }
        }
      }
    }
    return { vendor: '', canonical: '' }
  }

  const extract = (p: any) => {
    const fullName = `${p.name || ''} ${p.additionalTitle || ''}`
    // Try to match against catalog first
    if (!phoneCatalog) loadPhoneCatalog()
    const cat = matchCatalog(fullName)
  let vendor = (p.attributes?.brand || p.vendor || '').toString().trim()
  // If name explicitly mentions Xiaomi family (Poco/Redmi/Mi), prefer Xiaomi vendor and ignore conflicting catalog vendor
  const fullNorm = normalizeName(fullName)
  const mentionsXiaomi = /(\bxiaomi\b|\bmi\b|\bredmi\b|\bpoco\b)/i.test(fullNorm)
    if (!vendor) vendor = (cat?.vendor || '')
    let model = String(p.name || '').trim()
    let modelFromCatalog = false
    if (cat?.model) { model = cat.model; modelFromCatalog = true }
  // Special rules: typo variants → canonical
  //  - "iPhone 17 Air" → "iPhone Air"
  //  - "iPhone Ai" (common typo) → "iPhone Air"
  if (/\biphone\s*17\s*air\b/i.test(fullName) || /\biphone\s*ai\b/i.test(fullName)) {
    vendor = 'Apple';
    model = 'iPhone Air';
    modelFromCatalog = true;
  }
  // Fallback brand detection from name when missing
  if (!vendor) {
    const det = detectVendorFromName(fullName)
    vendor = det.canonical || det.vendor || vendor
  }
  // Enforce Xiaomi if title clearly indicates Poco/Redmi/Mi to avoid Samsung misclassification (e.g., F6 vs F62)
  // Keep the catalog-derived model intact regardless of catalog vendor value.
  if (mentionsXiaomi) {
    vendor = 'Xiaomi'
  }
  // Force canonical names for rugged brands
  if (/doogee/i.test(vendor)) vendor = 'Doogee'
  if (/blackview/i.test(vendor)) vendor = 'Blackview'
  if (/oukitel/i.test(vendor)) vendor = 'Oukitel'
    // If vendor empty but catalog has vendor, use canonical
    if (!vendor && cat?.vendor) vendor = cat.vendor
    // Remove vendor-like prefixes
    // IMPORTANT: if model comes from catalog, keep it EXACTLY as in catalog
    if (vendor && !modelFromCatalog) {
      const vendorNorm = normalizeName(vendor)
      const nameNorm = normalizeName(model)
      if (nameNorm.startsWith(vendorNorm + ' ')) model = model.slice(vendor.length).trim()
      if (/^iphone\b/i.test(model) && /apple/i.test(vendor)) model = model.replace(/^iphone\s*/i, '').trim()
      if (/^galaxy\b/i.test(model) && /samsung/i.test(vendor)) model = model.replace(/^galaxy\s*/i, '').trim()
      if (/^(mi|redmi|poco)\b/i.test(model) && /xiaomi|redmi|poco/i.test(vendor)) model = model.replace(/^(mi|redmi|poco)\s*/i, '').trim()
    }
  // Extract color: priority = laptopCatalog (for MacBooks) > phoneCatalog > product.name > attributes > additionalTitle
  const colorFromName = (p.name || '').match(/(obsidian\s?black|cosmic\s?orange|sky\s?blue|sky\s?light\s?gold|light\s?gold|icy\s?blue|blue\s?black|light\s?gray|light\s?grey|jet\s?black|midnight|space\s?black|space\s?gray|navy|starlight|ultramarine|teal|orange|green|yellow|silver|gold|blue|purple|pink|black|white|gray|grey|голубой|черн|серебр|голуб|син|золот|фиолет|розов|зел|желт|оранж)/i)?.[0] || ''
  const colorFromAttrs = (p.attributes?.color || '').toString()
  const colorFromAddTitle = (p.additionalTitle || '').match(/(jet\s?black|midnight|space black|space gray|starlight|ultramarine|teal|green|yellow|silver|gold|blue|purple|pink|black|white|gray|grey|голубой|черн|серебр|голуб|син|золот|фиолет|розов|зел|желт)/i)?.[0] || ''
  // For MacBooks, try laptops.xml catalog first
  const isMacBook = /macbook/i.test(fullName)
  let laptopCatColor = ''
  let laptopCatRamGb: number | undefined = undefined
  let laptopCatStorageGb: number | undefined = undefined
  if (isMacBook) {
    const lap = matchLaptopCatalog(fullName)
    // Extract RAM/Storage to find best matching item
    const rs = parseRamStorageFromName(fullName)
    const wantRam = rs.ramGb
    const wantStorage = rs.storageGb
    if (lap && lap.items && lap.items.length) {
      // Try to match by RAM/Storage first, then pick best color
      const byBoth = lap.items.find(it => (wantRam ? it.ramGb === wantRam : true) && (wantStorage ? it.storageGb === wantStorage : true))
      const item = byBoth || lap.items[0]
      laptopCatColor = item?.color || ''
      laptopCatRamGb = item?.ramGb
      laptopCatStorageGb = item?.storageGb
    }
  }
  // Normalize phone colors aggressively to catalog RU spelling
  let color = laptopCatColor || (isMacBook ? '' : cat?.color) || colorFromName || colorFromAttrs || colorFromAddTitle || ''
  // Special case: Samsung A16 Gray → чёрный
  if (/\bsamsung\b/i.test(fullName) && /\ba16\b/i.test(fullName) && /\bgray\b/i.test(fullName)) {
    color = 'чёрный' as any
  }
  if (!isMacBook) {
    const preferredFromName = pickPreferredColorFromName(fullName)
    if (preferredFromName) color = toRuCatalogColor(preferredFromName)
    else if (color) color = toRuCatalogColor(color)
  }
  if (isMacBook) {
    console.log(`🎨 MacBook color: laptopCat="${laptopCatColor}", fromName="${colorFromName}", final="${color}"`)
  }
    // RAM/Storage extraction — prefer explicit 8/256 style; then single-value like 256GB; then catalog
    const rs = parseRamStorageFromName(fullName)
    const singleStorage = normalizeMemoryFromName(fullName) || ''
    // Доп. правило для MacBook: если в названии есть значения вида "36 ГБ", берем максимальное значение ≤ 128 как RAM
    let macRamFromUnits: number | undefined
    if (/mac\s*book/i.test(fullName)) {
      // Собираем значения с единицами, приводим TB → GB и выбираем максимум ≤ 128 (как RAM)
      const memValsGb = Array.from(fullName.matchAll(/\b(\d{1,3})\s*(TB|ТБ|Тб|GB|ГБ|Гб)\b/gi))
        .map(m => {
          let n = Number(m[1])
          const unit = (m[2] || '').toUpperCase()
          if (unit === 'TB' || unit.startsWith('Т')) n = n * 1024
          return n
        })
        .filter(n => isFinite(n))
      const asRam = memValsGb.filter(n => n <= 128)
      if (asRam.length) macRamFromUnits = Math.max(...asRam)
    }
    // Приоритет RAM: из названия > каталог (кроме iPhone — там каталог важнее)
    let storage = (rs.storageGb ? `${rs.storageGb} ГБ` : '') || singleStorage || (laptopCatStorageGb ? `${laptopCatStorageGb} ГБ` : '') || cat?.memory || (p.attributes?.storage || '').toString() || (fullName.match(/(\b\d+\s?(TB|Тб|Гб|GB)\b)/i)?.[0] || '')
    let ram = ''
    if (isMacBook) {
      // Для MacBook сначала берём значения с единицами (например, 36 ГБ),
      // затем пары X/Y, и только потом каталог.
      if (typeof macRamFromUnits === 'number') ram = `${macRamFromUnits} ГБ`
      else if (rs.ramGb && rs.ramGb >= 8) ram = `${rs.ramGb} ГБ`
      else if (typeof laptopCatRamGb === 'number') ram = `${laptopCatRamGb} ГБ`
      else if (cat?.ram) ram = cat.ram
    } else {
      ram = (rs.ramGb ? `${rs.ramGb} ГБ` : '') || cat?.ram || ''
    }
    // iPhone: всегда берём RAM из phone_catalog.xml (если есть),
    // чтобы избежать путаницы с номером модели (например, "iPhone 16 128Gb").
    // ВАЖНО: только для iPhone, не для MacBook/других Apple-устройств.
    const isIphoneDevice = /\biphone\b/i.test(`${vendor} ${model} ${fullName}`)
    if (isIphoneDevice && cat?.ram) {
      ram = cat.ram
    }
    // Если RAM почему-то распарсился как МБ, нормализуем в ГБ минимум 8
    if (/\b\d+\s*мб\b/i.test(fullName) && (!ram || /\b256\s*мб\b/i.test(String(ram)))) {
      ram = '12 ГБ'
    }
    // Дополнительные эвристики для iPhone применяем ТОЛЬКО если RAM всё ещё не определён
    if (/apple/i.test(vendor)) {
      const isIphoneAir = /iphone\s*17\s*air/i.test(fullName) || /iphone\s*air/i.test(fullName) || /\bair\b/i.test(model)
      const isIphone17Base = (/iphone\s*17\b/i.test(fullName) || /iphone\s*17\b/i.test(model)) && !/\bpro\b/i.test(fullName) && !/\bpro\b/i.test(model) && !isIphoneAir
      if (!ram) {
        if (isIphone17Base) ram = '8 ГБ'
        if (isIphoneAir) ram = '12 ГБ'
      }
      // Цвет: для Apple приоритет ТОЛЬКО по названию/каталогу, не по атрибутам
      const preferredFromName = pickPreferredColorFromName(fullName)
      if (preferredFromName) color = toRuCatalogColor(preferredFromName) as any
      else if (cat?.color) color = toRuCatalogColor(String(cat.color)) as any
      else if (/sky\s*blue|icy\s*blue|ultramarine|\bblue\b|\bсин(ий|яя|ее)\b|голуб/i.test(fullName)) color = 'Голубой' as any
      else if (/\bgold\b|золот/i.test(fullName)) color = 'Золотистый' as any
      else if (/cloud\s*white|\bwhite\b|бел/i.test(fullName)) color = 'Белый' as any
      // Жёсткий оверрайд для iPhone Air: всегда RAM = 12 ГБ, плюс корректировки цвета/хранилища
      if ((/\biphone\b/i.test(`${vendor} ${model} ${fullName}`) && /\bair\b/i.test(`${model} ${fullName}`))) {
        ram = '12 ГБ'
        if (/\bgold\b/i.test(fullName) && !/золот/i.test(String(color))) {
          // cannot reassign const color above; override via local variable
          const forcedColor = 'золотистый'
          // embed into final return by shadowing
          color = forcedColor as any
        }
        // Normalize "Blue" and RU synonyms → Голубой for Air
        if (/(\bblue\b|\bсин(ий|яя|ее)\b|голуб)/i.test(fullName)) {
          color = 'Голубой' as any
        }
        // Хранилище 1Tb → 1024 ГБ
        if (/\b1\s*t[bб]\b/i.test(fullName) && (!storage || !/\b1024\s*ГБ\b/i.test(String(storage)))) storage = '1024 ГБ'
      }
    }
    return { vendor, model, color, storage, ram }
  }

  const report: any[] = []

  // Simple cache for categories by id to avoid repeated DB reads when traversing parents
  const catById = new Map<string, any>()

  // Helper: climb parents and check if any ancestor name matches pattern
  const hasAncestorWith = async (c: any, re: RegExp): Promise<boolean> => {
    let cur: any = c
    const safe = new Set<string>()
    while (cur && cur.parentId && !safe.has(String(cur.parentId))) {
      safe.add(String(cur.parentId))
      const pid = String(cur.parentId)
      let p = catById.get(pid)
      if (!p) { p = await Category.findById(pid).lean(); if (p) catById.set(pid, p) }
      if (!p) break
      if (re.test(String(p.name || ''))) return true
      cur = p
    }
    return false
  }

  // Определяем корневые выбранные категории "Мобильные телефоны" по их ID
  const selectedRoots = selectedCatIds.length ? await Category.find({ _id: { $in: selectedCatIds } }).lean() : []
  const PHONE_NAME_NORM = normalizeName('Мобильные телефоны')
  const phoneRootIds = new Set<string>((selectedRoots as any[]).filter(sc => normalizeName(String(sc?.name || '')) === PHONE_NAME_NORM).map(sc => String(sc._id)))

  // Проверить, принадлежит ли категория поддереву одного из заданных корневых ID
  const hasAncestorInSet = async (c: any, roots: Set<string>): Promise<boolean> => {
    if (!c) return false
    if (roots.has(String(c._id))) return true
    let cur: any = c
    const safe = new Set<string>()
    while (cur && cur.parentId && !safe.has(String(cur.parentId))) {
      safe.add(String(cur.parentId))
      const pid = String(cur.parentId)
      if (roots.has(pid)) return true
      let p = catById.get(pid)
      if (!p) { p = await Category.findById(pid).lean(); if (p) catById.set(String(pid), p) }
      cur = p
    }
    return false
  }

  // Init map to avoid resetting the same sheet multiple times (when many categories map to one tab)
  const initializedSheets = new Set<string>()

  // For each selected category: append rows to matching sheet; keep all tabs as-is
  for (const catId of catObjectIds) {
    let cat = catById.get(String(catId))
    if (!cat) { cat = await Category.findById(catId).lean(); if (cat) catById.set(String(catId), cat) }
    if (!cat) continue
    // Всегда складываем все телефонные категории в один лист "Телефоны — Мобильные телефоны"
    const name = String((cat as any).name || '')
    const isPhone = phoneRootIds.size > 0 ? (await hasAncestorInSet(cat, phoneRootIds)) : false
    const isNotebook = /ноутбук|mac\s*book|macbook/i.test(name) || await hasAncestorWith(cat, /ноутбук|mac\s*book|macbook/i)
    let sheetName: string | null = null
    if (isPhone) {
      sheetName = findSheetForCategory(wb, 'Мобильные телефоны')
        || findSheetForCategory(wb, 'Телефоны мобильные телефоны')
        || findSheetForCategory(wb, 'Телефоны - Мобильные телефоны')
        || findSheetForCategory(wb, 'Телефоны — Мобильные телефоны')
        || findSheetForCategory(wb, 'Телефоны')
        || findSheetForCategory(wb, 'Электроника - Мобильные телефоны')
        || findSheetForCategory(wb, 'Электроника- Мобильные телефоны')
    } else if (isNotebook) {
      // Поддерживаем разные варианты именования листа для ноутбуков
      sheetName = findSheetForCategory(wb, 'Ноутбуки')
        || findSheetForCategory(wb, 'Электроника - Ноутбуки')
        || findSheetForCategory(wb, 'Электроника-Ноутбуки')
    } else {
      // По умолчанию пытаемся совпасть по имени категории
      sheetName = findSheetForCategory(wb, name)
    }
    if (!sheetName || !wb.Sheets[sheetName]) {
      // If no sheet matches, SKIP this category to preserve template structure
      report.push({ category: (cat as any).name, sheet: null, action: 'sheet-not-found' })
      console.warn(`Avito generate: sheet not found for category '${(cat as any).name}'. Skipped.`)
      continue
    }

    let ws = wb.Sheets[sheetName]
    let aoa = XLSX.utils.sheet_to_json<any>(ws, { header: 1, defval: '' }) as any[][]
    if (!aoa || aoa.length === 0) { report.push({ category: (cat as any).name, sheet: sheetName, action: 'empty-sheet' }); continue }

    // For notebook sheet: keep top 4 rows 1:1; detect header row dynamically for correct column indices
    const isNotebookTab = /ноутбук/i.test(sheetName)
    let headerRowIdx = findHeaderRowIndex(aoa, sheetName)

    // Reset sheet to header-only ONCE per sheet to preserve previously appended rows across categories
    if (!initializedSheets.has(sheetName)) {
      let keepRows: any[][]
      if (isNotebookTab) {
        keepRows = aoa.slice(0, 4)
      } else {
        let extraKeep = 0
        for (let off = 1; off <= 3; off++) {
          const row = aoa[headerRowIdx + off]
          if (!row) break
          const text = row.map(v => normalizeName(String(v || ''))).join(' ')
          if (/(обязател|подроб|одно знач)/.test(text)) extraKeep++
          else break
        }
        keepRows = aoa.slice(0, headerRowIdx + 1 + extraKeep)
      }
      wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(keepRows)
      ws = wb.Sheets[sheetName]
      aoa = keepRows
      headerRowIdx = findHeaderRowIndex(aoa, sheetName)
      initializedSheets.add(sheetName)
    }

    const headers: string[] = (aoa[headerRowIdx] as any[]).map(v => String(v || ''))
    const normalizedHeaders = headers.map(h => normalizeName(h))
    const findCol = (variants: string[]): number | null => {
      const vNorm = variants.map(normalizeName)
      for (let i = 0; i < normalizedHeaders.length; i++) {
        const h = normalizedHeaders[i]
        for (const v of vNorm) {
          if (!v) continue
          if (h === v) return i
          // For very short labels (<=3 chars) like "ОС" require token match, not substring
          if (v.length <= 3) {
            const tokens = h.split(' ').filter(Boolean)
            if (tokens.includes(v)) return i
          } else {
            if (h.includes(v)) return i
          }
        }
      }
      return null
    }
    const headerIndex = new Map(headers.map((h, i) => [h, i]))
    const baseDataRow: any[] = new Array(headers.length).fill('')
    
    // Sheet is already initialized; do not truncate rows again for the same sheet
    // Validate required headers to avoid corrupting template
    const reqCols = [
      findCol(['Уникальный идентификатор объявления','Уникальный номер объявления','id объявления','id'] ),
      findCol(['Название','Название объявления']),
      findCol(['Цена'])
    ]
    const hasAll = reqCols.filter(i => i !== null).length >= 2
    if (!hasAll) {
      report.push({ category: (cat as any).name, sheet: sheetName, action: 'headers-missing', headers })
      console.warn(`Avito generate: required headers not found on sheet '${sheetName}', skip appending.`)
      continue
    }

    // Query products for this root category and its descendants only
    const localIds: any[] = [cat._id]
    // Collect descendants of current root
    let f: any[] = await Category.find({ parentId: cat._id }).lean()
    while (f.length > 0) {
      localIds.push(...f.map(c => c._id))
      const ids = f.map(c => c._id)
      f = await Category.find({ parentId: { $in: ids as any } }).lean()
    }
    const q: any = { isDeleted: { $ne: true }, categoryId: { $in: localIds } }
    if (onlyActiveFlag) q.isActive = true
    if (onlyInStockFlag) {
      q.inStock = true
      q.stockQuantity = { $gt: 0 }
      // некоторые товары помечаются флагом доступности отдельно
      q.isAvailable = { $ne: false }
    }
    let plist = await Product.find(q).lean()
    // Exclude by keywords from feed settings (match in name or additionalTitle, case-insensitive)
    const exclude: string[] = Array.isArray(feed.settings?.categories) ? [] : []
    const excludeKw: string[] = Array.isArray((feed as any).settings?.excludeKeywords) ? (feed as any).settings!.excludeKeywords : []
    if (excludeKw.length) {
      const words = excludeKw.map(w => String(w || '').trim()).filter(Boolean)
      if (words.length) {
        const rx = new RegExp(words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
        plist = plist.filter((p: any) => !rx.test(`${p.name || ''} ${p.additionalTitle || ''}`))
      }
    }
    // Exclude by explicit SKUs
    const excludeSkus: string[] = Array.isArray((feed as any).settings?.excludeSkus) ? (feed as any).settings!.excludeSkus : []
    if (excludeSkus.length) {
      const set = new Set(excludeSkus.map(s => String(s || '').trim()).filter(Boolean))
      plist = plist.filter((p: any) => !set.has(String(p.sku || '')))
    }

    // Apply strict post-filtering (defensive) and collect diagnostics
    const excludedInactive: string[] = []
    const excludedNoStock: string[] = []
    const filtered = plist.filter((p: any) => {
      const sku = p.sku || String(p._id)
      if (onlyActiveFlag && p.isActive === false) {
        excludedInactive.push(sku)
        return false
      }
      if (onlyInStockFlag) {
        const inStock = p.inStock === true
        const qty = Number(p.stockQuantity || 0) > 0
        const available = p.isAvailable !== false
        if (!(inStock && qty && available)) {
          excludedNoStock.push(sku)
          return false
        }
      }
      return true
    })

    const idCol = findCol(['Уникальный идентификатор объявления','Уникальный номер объявления','id объявления','id'])
    const titleCol = findCol(['Название','Название объявления'])
    const descCol = findCol(['Описание объявления','Описание'])
    const priceCol = findCol(['Цена'])
    const vendorCol = findCol(['Производитель','Бренд'])
    const modelCol = findCol(['Модель'])
    const colorCol = findCol(['Цвет'])
    const storageCol = findCol(['Встроенная память','Память','Объем встроенной памяти'])
    const ramCol = findCol(['Оперативная память','RAM','Оперативная память, ГБ','ОЗУ'])
    const ramMbCol = findCol(['Оперативная память, МБ','Оперативная память (МБ)','Оперативная память МБ','ОЗУ, МБ','ОЗУ (МБ)','RAM, MB','RAM (MB)','RAM MB'])
    const simCol = findCol(['sim-карты','sim карты'])
    const audienceCol = findCol(['Целевая аудитория'])
    const avitoNumCol = findCol(['Номер объявления на Авито'])
    const photoLinksCol = findCol(['Ссылки на фото','Ссылка на фото','Фото','Ссылки на изображения'])
    const categoryCol = findCol(['Категория'])
    const conditionCol = findCol(['Состояние'])
    const phoneTypeCol = findCol(['Тип телефона'])
    const adTypeCol = findCol(['Вид объявления'])
    // Custom required columns
    const placementCol = findCol(['Способ размещения'])
    const phoneCol = findCol(['Номер телефона'])
    const contactMethodCol = findCol(['Способ связи'])
    const addressCol = findCol(['Адрес'])
    const connectWithOthersCol = findCol(['Соединять это объявление с другими объявлениями'])
    const phoneHistoryCol = findCol(['История смартфона'])
    const equipmentCol = findCol(['Комплектация'])
    const sealedBoxCol = findCol(['Коробка запечатана'])
    const companyNameCol = findCol(['Название компании'])
    const emailCol = findCol(['Почта','E-mail','Email'])
    const avitoStatusCol = findCol(['AvitoStatus','avito status'])
    const screenCondCol = findCol(['Состояние экрана'])
    const bodyCondCol = findCol(['Состояние корпуса'])

    // Helper: build concise MacBook title for Avito
    function cleanMacBookTitle(name: string, opts?: { fallbackRamGb?: number; fallbackStorageGb?: number; forcedKeyboard?: 'RU' | 'EN'; fallbackColor?: string }): string {
      // Расширенное распознавание MacBook:
      // - явное упоминание "MacBook"
      // - или Air/Pro + диагональ (13/14/15/16), даже если нет явного Mx
      // - или наличие кода модели Apple (например, MTL73, MRYT3) + диагональ
      const original = String(name || '')
      const safe = original.replace(/"/g, ' ')
      const hasLine = /(\bair\b|\bpro\b)/i.test(safe)
      const hasDiag = /\b(13(?:[.,]\d)?|14|15|16)\b/i.test(safe)
      const hasChip = /\b[mM]\s*[1-9]\b/.test(safe)
      const hasModelCode = /\bM[A-Z0-9]{4,5}\b/.test(safe)
      const looksLikeMac = /mac\s*book/i.test(safe) || ((hasLine || hasModelCode) && hasDiag) || (hasLine && hasChip)
      if (!looksLikeMac) return original
      const toTitle = (s: string) => s.replace(/\s+/g, ' ').split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1).toLowerCase()) : '').join(' ').trim()

      // Line (Pro/Air)
      const isPro = /\bpro\b/i.test(safe)
      const isAir = /\bair\b/i.test(safe)
      let line = isPro ? 'Pro' : (isAir ? 'Air' : '')

      // Diagonal (13/14/15/16). Also handle 13.6 → 13
      let diag = (safe.match(/\b(13(?:[.,]\d)?|14|15|16)\b/) || [])[1] || ''
      diag = diag ? diag.replace(/[^0-9]/g, '') : ''

      // Chip (M1..M9) with optional suffix (Pro/Max)
      const chipMatch = safe.match(/\b[mM]\s*([1-9])\s*(Pro|Max)?\b/i)
      const chipNum = chipMatch ? chipMatch[1] : ''
      const chipSuffix = chipMatch && chipMatch[2] ? ` ${chipMatch[2]}` : ''
      const chipPart = chipNum ? `M${chipNum}${chipSuffix}` : ''
      // Year from chip generation
      const yearMap: Record<string,string> = { '1':'2021', '2':'2022', '3':'2023', '4':'2024', '5':'2025' }
      const year = chipNum ? (yearMap[String(chipNum)] || '') : ''

      // Default line by diagonal if missing
      if (!line) {
        if (diag === '14' || diag === '16') line = 'Pro'
        else if (diag === '13' || diag === '15') line = 'Air'
      }

      // Memory pair 16/512
      const rs = parseRamStorageFromName(original)
      // Прямой разбор всех значений с единицами: TB→GB; RAM = max ≤128; Storage = max ≥96
      const unitVals = Array.from(original.matchAll(/\b(\d{1,4})\s*(TB|ТБ|Тб|GB|ГБ|Гб)\b/gi)).map(m => {
        let n = Number(m[1])
        const u = (m[2] || '').toUpperCase()
        if (u === 'TB' || u.startsWith('Т')) n = n * 1024
        return n
      })
      let ramGb: number | undefined = rs.ramGb
      let storageGb: number | undefined = rs.storageGb
      const unitsRam = unitVals.filter(v => v <= 128)
      const unitsStorage = unitVals.filter(v => v >= 96)
      if (!ramGb && unitsRam.length) ramGb = Math.max(...unitsRam)
      if (!storageGb && unitsStorage.length) storageGb = Math.max(...unitsStorage)
      // Fallback A: two values with units anywhere in the string (e.g., "24 Гб ... 512 Гб")
      if (!ramGb || !storageGb) {
        const m = original.match(/\b(\d{1,2})\s*(?:TB|ТБ|Тб|GB|ГБ|Гб)\b[\s,;:\-—\/xX×]*?(\d{2,4})\s*(?:TB|ТБ|Тб|GB|ГБ|Гб)\b/i)
        if (m) {
          const a = Number(m[1])
          let b = Number(m[2])
          // If second number is in TB (rare), convert; we can't know from this regex, assume GB
          ramGb = isFinite(a) ? a : ramGb
          storageGb = isFinite(b) ? b : storageGb
        }
      }
      // Fallback B: collect all memory numbers with units, deduce RAM/Storage by thresholds
      if (!ramGb || !storageGb) {
        const mems = Array.from(original.matchAll(/\b(\d{1,4})\s*(TB|ТБ|Тб|GB|ГБ|Гб)\b/gi)).map(m => {
          let n = Number(m[1])
          const u = (m[2] || '').toUpperCase()
          if (u === 'TB' || u.startsWith('Т')) n = n * 1024
          return n
        })
        if (!ramGb) {
          const r = mems.filter(v => v <= 128)
          ramGb = r.length ? Math.max(...r) : undefined
        }
        if (!storageGb) {
          const s = mems.filter(v => v >= 96)
          storageGb = s.length ? Math.max(...s) : undefined
        }
      }
      // Fallback C: pair without units (e.g., "16 ... 512") avoiding resolution and diagonal
      if (!ramGb || !storageGb) {
        const noRes = original.replace(/\b\d{3,4}\s*[xXхХ×]\s*\d{3,4}\b/g, ' ')
        const diagNum = diag ? Number(diag) : NaN
        const pair = noRes.match(/\b(8|12|16|24|32|64)\b[\s,;:\-—\/]*?(128|256|512|1024|2048|4096)\b/)
        if (pair) {
          const a = Number(pair[1])
          const b = Number(pair[2])
          // Ensure first isn't the diagonal value
          if (!isFinite(diagNum) || a !== diagNum) {
            ramGb = ramGb || a
            storageGb = storageGb || b
          }
        }
      }
      // Apply fallbacks from opts if still missing
      if ((!ramGb || !storageGb) && opts) {
        if (!ramGb && typeof opts.fallbackRamGb === 'number' && isFinite(opts.fallbackRamGb)) ramGb = opts.fallbackRamGb
        if (!storageGb && typeof opts.fallbackStorageGb === 'number' && isFinite(opts.fallbackStorageGb)) storageGb = opts.fallbackStorageGb
      }
      // Format storage in TB for Avito-style compact titles (e.g., 1024→1, 2048→2)
      let storageOut: number | undefined
      if (typeof storageGb === 'number' && isFinite(storageGb)) {
        // Do NOT upconvert 256/512 to TB. Only 1024/2048/... → 1/2/...
        if (storageGb % 1024 === 0) {
          storageOut = Math.max(1, Math.round(storageGb / 1024))
        } else {
          storageOut = storageGb
        }
      }
      const memPart = (ramGb && storageOut) ? `${ramGb}/${storageOut}` : (typeof storageOut === 'number' ? String(storageOut) : (typeof ramGb === 'number' ? String(ramGb) : ''))

      // Keyboard language (RU/EN)
      let kbPart = ''
      if (/(ru\s*клавиатура|\bru\b|русская\s*клавиатура|russian\s*keyboard)/i.test(original)) kbPart = 'RU Клавиатура'
      else if (/(en\s*клавиатура|\ben\b|english\s*keyboard)/i.test(original)) kbPart = 'EN Клавиатура'
      else if (opts?.forcedKeyboard) kbPart = `${opts.forcedKeyboard} Клавиатура`
      else kbPart = 'RU Клавиатура'
      
      // Color (prefer Apple palette in English). Map RU synonyms → EN
      let color = ''
      const colorEn = safe.match(/\b(Space\s*Gray|Space\s*Grey|Space\s*Black|Midnight|Starlight|Silver|Gold|Blue|Gray|Grey|Black)\b/i)
      if (colorEn) color = toTitle(colorEn[1])
      if (!color) {
        const lower = safe.toLowerCase()
        if (/(серебрист|silver)/i.test(original)) color = 'Silver'
        else if (/(стард?лайт|starlight)/i.test(original)) color = 'Starlight'
        else if (/(миднайт|ночн|midnight)/i.test(original)) color = 'Midnight'
        else if (/(голуб|синий|blue)/i.test(original)) color = 'Blue'
        else if (/(золот|gold)/i.test(original)) color = 'Gold'
        else if (/(чёрн|черн|black)/i.test(original)) color = 'Black'
        else if (/(серый|серые|grey|gray|graphite|графит)/i.test(original)) color = 'Space Gray'
      }
      if (!color && opts?.fallbackColor) {
        const c = String(opts.fallbackColor)
        if (/silver/i.test(c)) color = 'Silver'
        else if (/starlight/i.test(c)) color = 'Starlight'
        else if (/midnight|ночн/i.test(c)) color = 'Midnight'
        else if (/blue|син|голуб/i.test(c)) color = 'Blue'
        else if (/gold|золот/i.test(c)) color = 'Gold'
        else if (/black|черн/i.test(c)) color = 'Black'
        else if (/grey|gray|graphite|серый|графит/i.test(c)) color = 'Space Gray'
      }

      // Normalize color to catalog-style Russian (Starlight→Белый, Midnight→Чёрный, etc.)
      const colorNormalized = color ? toRuCatalogColor(color) : ''

      // Order: MacBook [Pro/Air] Mx [Pro|Max] <diag> <ram/storage> <kb> <color>
      // Убираем слово "Apple" и год по требованию пользователя
      // Нормализуем числа диагонали: 13.6 → 13.6
      const diagOut = diag ? (diag.length > 2 ? diag.replace(/^(13)(6)$/,'13.6') : diag) : ''
      const parts = ['MacBook', line, chipPart, diagOut, memPart, kbPart, colorNormalized].filter(Boolean)
      const compact = parts.join(' ').replace(/\s+/g, ' ').trim()
      if (compact) return compact

      // Fallback to light cleanup
      let clean = original
      clean = clean.replace(/\b[A-Z0-9]{5}\b/g, '')
      clean = clean.replace(/\b\d{3,4}\s*[xXхХ×]\s*\d{3,4}\b/gi, '')
      clean = clean.replace(/\bDDR[45]\b/gi, '')
      clean = clean.replace(/\b(Mac\s?OS|macOS)\b/gi, '')
      clean = clean.replace(/\s+/g, ' ').trim()
      return clean
    }

    const mappedRows: any[][] = []
    for (const p of filtered) {
      const { vendor, model, color, storage, ram } = extract(p)
      const row = [...baseDataRow]
      const setIdx = (idx: number | null, val: any) => { if (idx !== null) row[idx] = val }
      setIdx(idCol, p.sku || String(p._id))
      setIdx(avitoNumCol, '')
      // Нормализуем заголовки MacBook ВСЕГДА: функция сама вернёт исходник, если не распознает MacBook
      const fallbackRam = ram ? Number(String(ram).replace(/[^0-9]/g, '')) : undefined
      const fallbackStorage = storage ? Number(String(storage).replace(/[^0-9]/g, '')) : undefined
      const nameCombo = `${p.name || ''} ${p.additionalTitle || ''}`
      const cleanedTitle = cleanMacBookTitle(nameCombo, {
        fallbackRamGb: fallbackRam,
        fallbackStorageGb: fallbackStorage,
        forcedKeyboard: /\ben\b|english/i.test(String(nameCombo)) ? 'EN' : (undefined as any),
        fallbackColor: color
      })
      if (cleanedTitle !== p.name) {
        console.log(`🧹 Title: "${p.name}" => "${cleanedTitle}"`)
      }
      // For mobile phones sheet: use only original title (additionalTitle) to avoid duplication
      const isMobileSheetPre = /мобиль|телефон/i.test(sheetName)
      const finalTitle = isMobileSheetPre ? (String(p.additionalTitle || '').trim() || cleanedTitle) : cleanedTitle
      setIdx(titleCol, finalTitle)
      // Description: choose HTML by sheet (mobile phones get extended version with TG line)
      const fixedDescriptionDefault = '<p>💯 <strong>Гарантия:</strong> до 24 месяцев</p> <p>🔥 <strong>TRADE-IN АКЦИЯ:</strong> обменяй свой старый смартфон на новый с выгодой</p> <p>⭐️ <strong>Более 400 положительных отзывов от реальных покупателей!</strong></p> <p>🚀 <strong>Самовывоз из магазина</strong> — всего <strong>10 минут от метро Волоколамская</strong></p> <p>ᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔ</p> <p>📱 <strong>НОВЫЕ СМАРТФОНЫ В НАЛИЧИИ</strong></p> <p>✅ Абсолютно новые ✅ <strong>Неактивированные</strong> и <strong>оригинальные устройства</strong>✅ В наличии <strong>разные цвета и объёмы памяти</strong>✅ Проверенные, с официальной <strong>гарантией 1 год</strong></p> <p>💎 <strong>Готовы к любым проверкам!</strong> Мы уверены в качестве каждого устройства.</p> <p>❤️‍ Сохраняйте объявление в избранное, чтобы не потерять нас ❤️‍</p> <p>📞 Звоните или пишите прямо СЕЙЧАС — получите лучшее предложение сегодня!</p> <p>ᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔ</p> <p>📦 <strong>Как оформить заказ:</strong>— Для самовывоза требуется предварительно оформить заказ (Написать нам или позвонить) — Возможна доставка по <strong>Москве и Московской области</strong> 🚚</p> <p>— Возможна Авито-Доставка(по договоренности)</p> <p>ᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔ</p> <p>✅ <strong>Гарантия лучшей цены в России</strong>✅ <strong>Более 10 лет на рынке</strong>✅ <strong>Более 400 отзывов на Авито</strong>✅ <strong>Огромный выбор аксессуаров</strong> для любых моделей</p> <p>ᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔ</p> <p>📍 <strong>Technohub — Москва, Пятницкое шоссе, 18, Павильон 73</strong></p> <p>1 этаж, 3 вход, прямо до конца, возле <strong>Mix Bar</strong></p> <p>🕙 Работаем <strong>ежедневно с 10:00 до 19:00</strong></p> <p>📞 Звоните или пишите прямо СЕЙЧАС — поможем подобрать идеальный смартфон под ваши задачи!</p> <p>ᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔ</p>'
      const fixedDescriptionMobile = '<p>Цена указана за НАЛИЧНЫЕ</p> <p>Авито доставка ТОЛЬКО по согласованию</p> <p>💯 <strong>Гарантия:</strong> до 24 месяцев</p> <p>🔥 <strong>TRADE-IN АКЦИЯ:</strong> обменяй свой старый смартфон на новый с выгодой</p> <p>⭐️ <strong>Более 400 положительных отзывов от реальных покупателей!</strong></p> <p>🚀 <strong>Самовывоз из магазина</strong> — всего <strong>10 минут от метро Волоколамская</strong></p> <p>ᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔ</p> <p>📱 <strong>НОВЫЕ СМАРТФОНЫ В НАЛИЧИИ</strong></p> <p>✅ Абсолютно новые ✅ <strong>Неактивированные</strong> и <strong>оригинальные устройства</strong>✅ В наличии <strong>разные цвета и объёмы памяти</strong>✅ Проверенные, с официальной <strong>гарантией 1 год</strong></p> <p>💎 <strong>Готовы к любым проверкам!</strong> Мы уверены в качестве каждого устройства.</p> <p>❤️‍ Сохраняйте объявление в избранное, чтобы не потерять нас ❤️‍</p> <p>📞 Звоните или пишите прямо СЕЙЧАС — получите лучшее предложение сегодня!</p> <p>ᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔ</p> <p>📦 <strong>Как оформить заказ:</strong>— Для самовывоза требуется предварительно оформить заказ (Написать нам или позвонить) — Возможна доставка по <strong>Москве и Московской области</strong> 🚚</p> <p>— Возможна Авито-Доставка(по договоренности)</p> <p>ᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔ</p> <p>✅ <strong>Гарантия лучшей цены в России</strong>✅ <strong>Более 10 лет на рынке</strong>✅ <strong>Более 400 отзывов на Авито</strong>✅ <strong>Огромный выбор аксессуаров</strong> для любых моделей</p> <p>ᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔ</p> <p>📍 <strong>Technohub — Москва, Пятницкое шоссе, 18, Павильон 73</strong></p> <p>📍 <strong>Techno Hub —  в поиске тг, всегда актульные цены и наличие</strong></p> <p>1 этаж, 3 вход, прямо до конца, возле <strong>Mix Bar</strong></p> <p>🕙 Работаем <strong>ежедневно с 10:00 до 19:00</strong></p> <p>📞 Звоните или пишите прямо СЕЙЧАС — поможем подобрать идеальный смартфон под ваши задачи!</p> <p>ᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔᚔ</p>'
    const isMobileSheet = /мобиль|телефон/i.test(sheetName)
    const isNotebookSheet = /ноутбук/i.test(sheetName)
      setIdx(descCol, isMobileSheet ? fixedDescriptionMobile : fixedDescriptionDefault)
      setIdx(priceCol, p.price || 0)
      // For notebooks (MacBooks), vendor is always Apple
      // Vendor: for notebook sheet do NOT force Apple globally; only set Apple if name implies MacBook
      {
        const nameComboForVendor = `${p.name || ''} ${p.additionalTitle || ''}`
        const looksLikeMacbook = /mac\s*book/i.test(nameComboForVendor) || /\bM[1-9]\b/.test(nameComboForVendor)
        setIdx(vendorCol, looksLikeMacbook ? 'Apple' : vendor)
      }
      setIdx(modelCol, model)
      setIdx(colorCol, color)
      setIdx(storageCol, storage)
      setIdx(ramCol, ram)
      if (ramMbCol !== null && ram) {
        const g = Number(String(ram).replace(/[^0-9]/g, ''))
        if (isFinite(g)) setIdx(ramMbCol, String(g * 1024))
      }
      if (!isNotebookSheet) {
        const simFromName = deriveIphoneSimFromName(`${p.name || ''} ${p.additionalTitle || ''}`, vendor, model)
        setIdx(simCol, simFromName || 'Не знаю')
      }
      // Photo link: prefer first non-placeholder image
      const images: string[] = []
      const pushIf = (x: any) => { if (x) images.push(String(x)) }
      pushIf(p.mainImage)
      if (Array.isArray(p.images)) p.images.forEach(pushIf)
      // Фильтруем явные служебные/заглушечные URL
      const filtered = images.filter(u => !/\b(no[_-]?photo|placeholder|nophoto|default[-_]?image)\b/i.test(String(u)))
      let chosen = filtered.find(u => !isPlaceholderImage(u)) || filtered[0] || images.find(u => !isPlaceholderImage(u)) || images[0] || ''
      const imgAbs = chosen ? (chosen.startsWith('http') ? chosen : `https://technolinestore.ru/${String(chosen).replace(/^\/+/, '')}`) : ''
      setIdx(photoLinksCol, imgAbs)
      // Category and types
      if (isNotebookSheet) setIdx(categoryCol, 'Ноутбуки')
      else setIdx(categoryCol, 'Телефоны')
      setIdx(conditionCol, 'Новое')
      if (!isNotebookSheet) setIdx(phoneTypeCol, 'Мобильные телефоны')
      // Ensure mobile description template for phone rows regardless of sheet name
      if (!isNotebookSheet && descCol !== null) setIdx(descCol, fixedDescriptionMobile)
      setIdx(adTypeCol, 'Продаю своё')
      // Fixed columns per request
      setIdx(placementCol, 'Package')
      setIdx(phoneCol, '79067101379')
      setIdx(contactMethodCol, 'По телефону и в сообщениях')
      setIdx(addressCol, 'Пятницкое ш., 18')
      // Always set audience
      setIdx(audienceCol, 'Частные лица')
      // All other columns remain copied from the template base row
      // Fixed fields requested
      setIdx(placementCol, 'Package')
      setIdx(phoneCol, '79067101379')
      setIdx(contactMethodCol, 'По телефону и в сообщениях')
      setIdx(addressCol, 'Пятницкое ш., 18')
      setIdx(connectWithOthersCol, 'Да')
      setIdx(phoneHistoryCol, 'Новый')
      setIdx(equipmentCol, 'Коробка')
      setIdx(sealedBoxCol, 'Да')
      setIdx(companyNameCol, 'Олег')
      setIdx(emailCol, 'slowbaka@yandex.ru')
      setIdx(avitoStatusCol, 'Активно')

      // Final OS enforcement for notebook sheet: always set macOS for MacBooks
      if (isNotebookSheet) {
        const osColFinal = findCol(['Операционная система','ОС','Операционка','Операционная система ноутбука','OS','Operating System'])
        if (osColFinal !== null) {
          const nameComboOS = `${p.name || ''} ${p.additionalTitle || ''}`
          const isMac = /mac\s*book/i.test(nameComboOS) || (/\b[mM][1-9]\b/.test(nameComboOS) && /\b(air|pro)\b/i.test(nameComboOS)) || /\bapple\b/i.test(String(vendor))
          if (isMac) setIdx(osColFinal, 'macOS')
        }
      }
      setIdx(screenCondCol, 'Идеальное')
      setIdx(bodyCondCol, 'Идеальное')

      // Notebook-specific optional columns mapping (with laptop catalog enrichment)
      if (isNotebookSheet) {
        // OS column: include broader synonyms
        // Broaden OS column detection to cover more header variants
        const osCol = findCol(['Операционная система','ОС','Операционка','Операционная система ноутбука','OS','Operating System'])
        const totalDiskCol = findCol(['Общий объем накопителей','Общий объем накопителя','Общий объем диска'])
        const ramSizeCol = findCol(['Объем оперативной памяти','Объем ОЗУ'])
        const diskCfgCol = findCol(['Конфигурация диска','Конфигурация накопителей','Конфигурация накопителя'])
        const kbCol = findCol(['Клавиатура'])
        const gpuTypeCol = findCol(['Тип видеокарты'])
        // CPU columns: broaden synonyms so we can duplicate reliably
        const cpuLineCol = findCol(['Линейка процессора','Семейство процессора','Серия процессора'])
        const cpuNameCol = findCol(['Процессор','CPU'])
        const cpuCoresCol = findCol(['Количество ядер процессора'])
        console.log(`📊 Notebook columns: totalDisk=${totalDiskCol}, ram=${ramSizeCol}, cpu=${cpuLineCol}`)

        // Always set Apple for Macbook vendor
        if (/mac\s*book/i.test(p.name || '')) setIdx(vendorCol, 'Apple')

        const nameCombo = `${p.name || ''} ${p.additionalTitle || ''}`
        const colorNameSource = /mac\s*book/i.test(String(p.name||'')) ? `${cleanedTitle} ${nameCombo}` : nameCombo
        let lap = matchLaptopCatalog(nameCombo)
        // Validate: if catalog chip differs from product name chip (including Pro/Max suffix), discard match
        if (lap) {
          const nameChipMatch = nameCombo.match(/\b[mM]([1-9])\s*(Pro|Max)?\b/i)
          const nameChipFull = nameChipMatch ? `M${nameChipMatch[1]}${nameChipMatch[2] ? ' ' + nameChipMatch[2] : ''}` : null
          const catalogChipFull = lap.cpuLine ? lap.cpuLine.replace(/Apple\s+/i, '').trim() : null
          if (nameChipFull && catalogChipFull) {
            const nameNorm = normalizeName(nameChipFull)
            const catNorm = normalizeName(catalogChipFull)
            if (nameNorm !== catNorm) {
              console.log(`⚠️ Chip mismatch: product has "${nameChipFull}", catalog has "${lap.cpuLine}". Using fallback.`)
              lap = null
            }
          }
        }
        if (lap) {
          // Try to pick the closest item by RAM/Storage from product name
          // Recompute from raw name as well: take max ≤128 as RAM, max ≥96 as Storage
          const units = Array.from(nameCombo.matchAll(/\b(\d{1,4})\s*(TB|ТБ|Тб|GB|ГБ|Гб)\b/gi)).map(m => {
            let n = Number(m[1])
            const u = (m[2] || '').toUpperCase()
            if (u === 'TB' || u.startsWith('Т')) n = n * 1024
            return n
          }).filter(n => isFinite(n))
          const nameUnitsRam = units.filter(n => n <= 128)
          const nameUnitsStorage = units.filter(n => n >= 96)
          const pair = parseRamStorageFromName(nameCombo)
          let wantRam = pair.ramGb || (nameUnitsRam.length ? Math.max(...nameUnitsRam) : (ram ? Number(String(ram).replace(/[^0-9]/g, '')) : undefined))
          let wantStorage = pair.storageGb || (storage ? Number(String(storage).replace(/[^0-9]/g, '')) : (nameUnitsStorage.length ? Math.max(...nameUnitsStorage) : undefined))
          let item = Array.isArray(lap.items) && lap.items.length ? lap.items[0] : undefined
          if (lap.items && lap.items.length) {
            const preferredColorFromName = pickPreferredColorFromName(colorNameSource)
            const norm = (x?: string) => x ? normalizeName(normalizeColor(String(x))) : ''
            const wantColor = norm(preferredColorFromName)
            // Priority: exact pair (RAM & Storage) with color → pair → storage → RAM → color → first
            const byBothColor = wantColor ? lap.items.find(it => (wantRam ? it.ramGb === wantRam : true) && (wantStorage ? it.storageGb === wantStorage : true) && norm(it.color) === wantColor) : undefined
            const byBoth = lap.items.find(it => (wantRam ? it.ramGb === wantRam : true) && (wantStorage ? it.storageGb === wantStorage : true))
            const byStorage = !byBoth ? (wantStorage ? lap.items.find(it => it.storageGb === wantStorage) : undefined) : undefined
            const byRam = (!byBoth && !byStorage && wantRam) ? lap.items.find(it => it.ramGb === wantRam) : undefined
            const byColor = (!byBoth && !byStorage && !byRam && wantColor) ? lap.items.find(it => norm(it.color) === wantColor) : undefined
            item = (byBothColor || byBoth || byStorage || byRam || byColor || lap.items[0])
          }
          // ОС: для MacBook/Apple ноутбуков всегда macOS, даже если каталог указывает Windows
          if (osCol !== null) {
            // Treat implicit MacBook patterns as Mac too: Air/Pro + Mx + diagonal
            const implicitMac = (/(?:^|\s)(air|pro)\b/i.test(nameCombo) && /\b[mM][1-9]\b/.test(nameCombo) && /\b(13|14|15|16)\b/.test(nameCombo))
            const isMacbookName = /mac\s*book/i.test(nameCombo) || /mac\s*book/i.test(String(lap?.model || '')) || implicitMac
            const hasAppleChip = /\b[mM][1-9]\s*(Pro|Max)?\b/.test(nameCombo)
            const isAppleVendor = /apple/i.test(String(vendor)) || /apple/i.test(String(lap?.vendor || ''))
            const forceMacOs = isMacbookName || hasAppleChip || isAppleVendor
            setIdx(osCol, forceMacOs ? 'macOS' : (item?.os || 'Windows 11'))
          }
          if (kbCol !== null) {
            const titleForKb = cleanedTitle || nameCombo
            const isEnKb = /(EN\s*Клавиатура|english\s*keyboard)/i.test(titleForKb)
            const isRuKb = /(RU\s*Клавиатура|русская\s*клавиатура)/i.test(titleForKb)
            setIdx(kbCol, isEnKb ? 'Нет кириллицы' : (isRuKb ? 'Есть кириллица' : 'Есть кириллица'))
          }
          if (ramSizeCol !== null || ramCol !== null) {
            // Жёсткий приоритет RAM из единиц в названии (макс. ≤128)
            const unitMatches = Array.from(nameCombo.matchAll(/\b(\d{1,4})\s*(TB|ТБ|Тб|тб|GB|Gb|gb|ГБ|Гб|гб)\b/gi))
            const unitVals = unitMatches.map(m => {
              let n = Number(m[1])
              const u = (m[2] || '').toUpperCase()
              if (u === 'TB' || u.startsWith('Т')) n = n * 1024
              return n
            }).filter(n => isFinite(n))
            const unitsRam = unitVals.filter(n => n <= 128)
            const ramFromUnits = unitsRam.length ? Math.max(...unitsRam) : undefined
            // Приоритет RAM: из единиц в названии → wantRam → каталог
            const nameRam = (wantRam || undefined)
            const ramNum = (ramFromUnits || nameRam || item?.ramGb)
            if (ramNum) {
              if (ramSizeCol !== null) setIdx(ramSizeCol, String(ramNum))
              if (ramCol !== null) setIdx(ramCol, `${ramNum} ГБ`)
              // Fallback: попробуем дополнительные варианты заголовков RAM
              const trySet = (labels: string[]) => {
                const c = findCol(labels)
                if (c !== null) setIdx(c, String(ramNum))
              }
              trySet(['Оперативная память, ГБ'])
              trySet(['Оперативная память (ГБ)'])
              trySet(['ОЗУ'])
              trySet(['ОЗУ, ГБ'])
              trySet(['RAM, GB'])
              trySet(['RAM, ГБ'])
            }
          }
          // Prefer model value from laptops.xml exactly as in the file
          if (modelCol !== null && lap.model) setIdx(modelCol, lap.model)
          // Also override generic columns if we have explicit pair
          if (ramCol !== null && typeof wantRam === 'number') setIdx(ramCol, `${wantRam} ГБ`)
          if (storageCol !== null && typeof wantStorage === 'number') setIdx(storageCol, `${wantStorage} ГБ`)
          // CPU columns: duplicate "Процессор" = "Линейка процессора"
          {
            const cpuDisplay = lap.cpuLine || lap.cpuName || ''
            if (cpuLineCol !== null && cpuDisplay) setIdx(cpuLineCol, cpuDisplay)
            if (cpuNameCol !== null && cpuDisplay) setIdx(cpuNameCol, cpuDisplay)
          }
          if (cpuCoresCol !== null && lap.cpuCores) setIdx(cpuCoresCol, String(lap.cpuCores))
          if (totalDiskCol !== null) {
            // Prefer storage parsed from name (e.g., 8/256) over catalog default
            const val = (wantStorage || undefined) || item?.storageGb
            if (val) setIdx(totalDiskCol, String(val))
          }
          if (diskCfgCol !== null && item?.disk) setIdx(diskCfgCol, item.disk)
          if (gpuTypeCol !== null && item?.gpuType) setIdx(gpuTypeCol, item.gpuType)
          if (colorCol !== null) {
            const preferredColorFromName = pickPreferredColorFromName(colorNameSource)
            if (preferredColorFromName) setIdx(colorCol, toRuCatalogColor(preferredColorFromName))
            else if (item?.color) setIdx(colorCol, toRuCatalogColor(String(item.color)))
          }
        } else {
          if (kbCol !== null) {
            const titleForKb = cleanedTitle || nameCombo
            const isEnKb = /(EN\s*Клавиатура|english\s*keyboard)/i.test(titleForKb)
            const isRuKb = /(RU\s*Клавиатура|русская\s*клавиатура)/i.test(titleForKb)
            setIdx(kbCol, isEnKb ? 'Нет кириллицы' : (isRuKb ? 'Есть кириллица' : 'Есть кириллица'))
          }
          // Prefer macOS if MacBook mentioned even if vendor variable says otherwise
          if (osCol !== null) {
            const implicitMac = (/(?:^|\s)(air|pro)\b/i.test(nameCombo) && /\b[mM][1-9]\b/.test(nameCombo) && /\b(13|14|15|16)\b/.test(nameCombo))
            setIdx(osCol, (/mac\s*book/i.test(nameCombo) || implicitMac || /apple/i.test(vendor)) ? 'macOS' : 'Windows 11')
          }
          console.log(`💾 Fallback for "${p.name}": ram="${ram}", storage="${storage}"`)
          if (ramSizeCol !== null && ram) {
            const ramVal = String(ram).replace(/\s*ГБ/i,'').trim()
            console.log(`  RAM: setting col ${ramSizeCol} = "${ramVal}"`)
            setIdx(ramSizeCol, ramVal)
          }
          if (totalDiskCol !== null) {
            // Avoid wrong 1024 for pairs like 8/256; prefer parsed storage from name if present
            const parsed = parseRamStorageFromName(nameCombo)
            const diskVal = parsed.storageGb ? String(parsed.storageGb) : (storage ? String(storage).replace(/\s*ГБ/i,'').trim() : '')
            console.log(`  Storage: setting col ${totalDiskCol} = "${diskVal}"`)
            setIdx(totalDiskCol, diskVal)
          }
          if (diskCfgCol !== null) setIdx(diskCfgCol, 'SSD')
          // CPU duplicate from name when catalog missing
          {
            const m = nameCombo.match(/\b[mM]([1-9])\s*(Pro|Max)?\b/i)
            const cpuDisplay = m ? `Apple M${m[1]}${m[2] ? ' ' + m[2] : ''}` : ''
            if (cpuLineCol !== null && cpuDisplay) setIdx(cpuLineCol, cpuDisplay)
            if (cpuNameCol !== null && cpuDisplay) setIdx(cpuNameCol, cpuDisplay)
          }
          if (gpuTypeCol !== null) setIdx(gpuTypeCol, 'Встроенная')
          // Fallback: construct model from product title to avoid phone catalog artifacts
          if (modelCol !== null) setIdx(modelCol, buildMacModelFromName(nameCombo))
          // Ensure vendor is Apple for any Macbook
          if (/mac\s*book/i.test(nameCombo)) setIdx(vendorCol, 'Apple')
          // Try to derive color from name if present
          if (colorCol !== null) {
            const colorFromName = pickPreferredColorFromName(colorNameSource)
            if (colorFromName) setIdx(colorCol, toRuCatalogColor(colorFromName))
          }
          // Try to extract CPU info from name if MacBook (including Pro/Max variants)
          if (/mac\s*book/i.test(nameCombo)) {
            const chipMatch = nameCombo.match(/\b[mM]([1-9])\s*(Pro|Max)?\b/i)
            if (chipMatch) {
              const chipNum = chipMatch[1]
              const chipSuffix = chipMatch[2] ? ` ${chipMatch[2]}` : ''
              const cpuName = `Apple M${chipNum}${chipSuffix}`
              if (cpuLineCol !== null) setIdx(cpuLineCol, cpuName)
              if (cpuNameCol !== null) setIdx(cpuNameCol, cpuName)
              if (cpuCoresCol !== null) setIdx(cpuCoresCol, '8') // Default fallback
            }
          }
        }
        // Унификация CPU колонок: если одна из колонок заполнена, продублировать в другую
        {
          const valLine = (cpuLineCol !== null) ? row[cpuLineCol] : undefined
          const valName = (cpuNameCol !== null) ? row[cpuNameCol] : undefined
          if (cpuLineCol !== null && cpuNameCol !== null) {
            if (valLine && !valName) setIdx(cpuNameCol, valLine)
            else if (!valLine && valName) setIdx(cpuLineCol, valName)
          }
        }
      }
      mappedRows.push(row)
    }

    // Append after existing rows without rewriting the sheet
    appendRows(ws, mappedRows)
    report.push({
      category: (cat as any).name,
      sheet: sheetName,
      appended: mappedRows.length,
      products: plist.length,
      excludedInactive: excludedInactive.length,
      excludedNoStock: excludedNoStock.length,
      excludedInactiveSamples: excludedInactive.slice(0, 10),
      excludedNoStockSamples: excludedNoStock.slice(0, 10)
    })
  }

  // Исправляем заголовки: "Уникальный идентификатор объявления" → "Id" для корректной загрузки в Avito
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' }) as any[][]
    let modified = false
    for (let rowIdx = 0; rowIdx < Math.min(5, aoa.length); rowIdx++) {
      const row = aoa[rowIdx]
      if (!Array.isArray(row)) continue
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const val = String(row[colIdx] || '')
        if (val === 'Уникальный идентификатор объявления' || val === 'Уникальный номер объявления') {
          aoa[rowIdx][colIdx] = 'Id'
          modified = true
        }
      }
    }
    if (modified) {
      wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(aoa)
    }
  }

  // Пишем именно туда, откуда статика раздается в index.ts (для __dirname=dist/routes → ../../public/avito)
  const outDir = path.join(__dirname, '../../public/avito')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const fileName = feed.settings.outputFileName || `avito_${String(feed._id)}.xlsx`
  if (!feed.settings.outputFileName) {
    await AvitoFeed.updateOne({ _id: feed._id }, { $set: { 'settings.outputFileName': fileName } })
  }
  const outPath = path.join(outDir, fileName)
  XLSX.writeFile(wb, outPath)
  return { path: outPath, report }
}

// CRUD
router.get('/', async (req, res) => {
  const feeds = await AvitoFeed.find().sort({ createdAt: -1 })
  res.json({ success: true, feeds })
})

router.post('/', async (req, res) => {
  const payload = req.body || {}
  // derive cron from interval minutes on save
  const interval = Math.max(1, Number(payload?.schedule?.intervalMinutes || 20))
  const toBool = (v: any) => v === true || v === 'true' || v === 1 || v === '1' || v === 'on'
  const normalizedSettings: any = { ...(payload.settings || {}) }
  normalizedSettings.includeOnlyActive = toBool(payload.settings?.includeOnlyActive)
  normalizedSettings.includeOnlyInStock = toBool(payload.settings?.includeOnlyInStock)
  const feed = new AvitoFeed({
    ...payload,
    settings: normalizedSettings,
    schedule: { ...(payload.schedule || {}), intervalMinutes: interval }
  })
  await feed.save()
  setupCron(feed)
  res.json({ success: true, feed })
})

router.put('/:id', async (req, res) => {
  const payload = req.body || {}
  const interval = Math.max(1, Number(payload?.schedule?.intervalMinutes || 20))
  const existing = await AvitoFeed.findById(req.params.id)
  if (!existing) return res.status(404).json({ success: false, message: 'Not found' })
  
  // Explicitly override boolean fields from payload; preserve if omitted
  const mergedSettings: any = {
    ...(existing.toObject().settings || {}),
    ...(payload.settings || {})
  }
  const toBool = (v: any) => v === true || v === 'true' || v === 1 || v === '1' || v === 'on'
  if (payload.settings && Object.prototype.hasOwnProperty.call(payload.settings, 'includeOnlyActive')) {
    mergedSettings.includeOnlyActive = toBool(payload.settings.includeOnlyActive)
  }
  if (payload.settings && Object.prototype.hasOwnProperty.call(payload.settings, 'includeOnlyInStock')) {
    mergedSettings.includeOnlyInStock = toBool(payload.settings.includeOnlyInStock)
  }

  const feed = await AvitoFeed.findByIdAndUpdate(
    req.params.id,
    { ...payload, settings: mergedSettings, schedule: { ...(payload.schedule || {}), intervalMinutes: interval } },
    { new: true }
  )
  if (!feed) return res.status(404).json({ success: false, message: 'Not found' })
  setupCron(feed)
  res.json({ success: true, feed })
})

router.delete('/:id', async (req, res) => {
  await AvitoFeed.findByIdAndDelete(req.params.id)
  const job = cronJobs.get(req.params.id)
  if (job) job.stop()
  cronJobs.delete(req.params.id)
  res.json({ success: true })
})

router.post('/:id/generate', async (req, res) => {
  try {
    const { path: out, report } = await generateFeed(req.params.id)
    // persist last run info for manual runs
    await AvitoFeed.updateOne(
      { _id: req.params.id },
      { $set: { 'schedule.lastRunAt': new Date(), 'schedule.lastStatus': 'success', 'schedule.lastError': null } }
    )
    const fileName = path.basename(out)
    const urlPath = `/api/avito/${fileName}`
    res.json({ success: true, path: out, fileName, url: urlPath, report })
  } catch (e: any) {
    try {
      await AvitoFeed.updateOne(
        { _id: req.params.id },
        { $set: { 'schedule.lastRunAt': new Date(), 'schedule.lastStatus': 'error', 'schedule.lastError': e?.message || String(e) } }
      )
    } catch {}
    res.status(500).json({ success: false, message: e?.message || String(e) })
  }
})

// Initialize crons on module load
;(async () => {
  try {
    const feeds = await AvitoFeed.find({ 'schedule.enabled': true })
    feeds.forEach(setupCron)
    console.log(`✅ AvitoFeed cron jobs initialized for ${feeds.length} feeds.`)
  } catch (e) {
    console.error('❌ Error initializing AvitoFeed cron jobs:', e)
  }
})()

export default router



