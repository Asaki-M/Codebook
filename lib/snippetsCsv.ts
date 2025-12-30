import type { Snippet } from "~/lib/snippets"

const CSV_HEADERS = [
  "id",
  "title",
  "category",
  "language",
  "code",
  "createdAt",
  "updatedAt"
] as const

type CsvHeader = (typeof CSV_HEADERS)[number]

const escapeCsvCell = (value: string) => {
  const normalized = value.replaceAll("\r\n", "\n")
  return `"${normalized.replaceAll('"', '""')}"`
}

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  const pushCell = () => {
    row.push(cell)
    cell = ""
  }

  const pushRow = () => {
    rows.push(row)
    row = []
  }

  const input = text.replaceAll("\r\n", "\n")

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (inQuotes) {
      if (char === '"') {
        const next = input[i + 1]
        if (next === '"') {
          cell += '"'
          i++
          continue
        }
        inQuotes = false
        continue
      }
      cell += char
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ",") {
      pushCell()
      continue
    }

    if (char === "\n") {
      pushCell()
      pushRow()
      continue
    }

    cell += char
  }

  pushCell()
  pushRow()

  const last = rows[rows.length - 1]
  if (last && last.length === 1 && last[0] === "") rows.pop()

  return rows
}

const makeId = () => {
  const now = Date.now()
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${now}-${Math.random().toString(16).slice(2)}`
}

const normalizeSnippet = (value: Partial<Snippet>): Snippet | null => {
  const title = value.title?.trim() || "Untitled"
  const category = value.category?.trim() || "General"
  const language = value.language?.trim() || "text"
  const code = value.code ?? ""
  if (!code.trim()) return null

  const now = Date.now()
  const createdAt =
    typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
      ? value.createdAt
      : now
  const updatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : createdAt

  return {
    id: value.id?.trim() || makeId(),
    title,
    category,
    language,
    code,
    createdAt,
    updatedAt
  }
}

export const snippetsToCsv = (snippets: Snippet[]): string => {
  const header = CSV_HEADERS.join(",")
  const lines = snippets.map((snippet) =>
    [
      escapeCsvCell(snippet.id),
      escapeCsvCell(snippet.title),
      escapeCsvCell(snippet.category),
      escapeCsvCell(snippet.language),
      escapeCsvCell(snippet.code),
      String(snippet.createdAt),
      String(snippet.updatedAt)
    ].join(",")
  )

  return [header, ...lines].join("\n")
}

export const snippetsFromCsv = (
  csvText: string
): { snippets: Snippet[]; warnings: string[] } => {
  const warnings: string[] = []
  const trimmed = csvText.replace(/^\uFEFF/, "").trim()
  if (!trimmed) return { snippets: [], warnings }

  const rows = parseCsv(trimmed)
  if (rows.length === 0) return { snippets: [], warnings }

  const firstRow = rows[0].map((c) => c.trim())
  const firstRowLower = firstRow.map((c) => c.toLowerCase())
  const looksLikeHeader = firstRowLower.some((c) =>
    CSV_HEADERS.includes(c as CsvHeader)
  )

  const columnIndex: Partial<Record<CsvHeader, number>> = {}
  let dataStart = 0

  if (looksLikeHeader) {
    for (let i = 0; i < firstRowLower.length; i++) {
      const key = firstRowLower[i] as CsvHeader
      if (CSV_HEADERS.includes(key) && columnIndex[key] == null) {
        columnIndex[key] = i
      }
    }
    dataStart = 1
  } else {
    for (let i = 0; i < CSV_HEADERS.length; i++) {
      columnIndex[CSV_HEADERS[i]] = i
    }
  }

  const getCell = (row: string[], key: CsvHeader) => {
    const idx = columnIndex[key]
    if (idx == null) return ""
    return row[idx] ?? ""
  }

  const snippets: Snippet[] = []
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i]
    const partial: Partial<Snippet> = {
      id: getCell(row, "id"),
      title: getCell(row, "title"),
      category: getCell(row, "category"),
      language: getCell(row, "language"),
      code: getCell(row, "code")
    }

    const createdAtRaw = getCell(row, "createdAt")
    const updatedAtRaw = getCell(row, "updatedAt")
    const createdAt = Number(createdAtRaw)
    const updatedAt = Number(updatedAtRaw)
    if (Number.isFinite(createdAt)) partial.createdAt = createdAt
    if (Number.isFinite(updatedAt)) partial.updatedAt = updatedAt

    const normalized = normalizeSnippet(partial)
    if (!normalized) continue
    snippets.push(normalized)
  }

  if (snippets.length === 0) {
    warnings.push("未解析到任何有效片段（至少需要 code 字段）")
  }

  return { snippets, warnings }
}
