import "~style.css"

import { useEffect, useMemo, useRef, useState } from "react"

import { IconButton } from "~/components/IconButton"
import { HighlightedCode } from "~/components/HighlightedCode"
import { Modal } from "~/components/Modal"
import { IconCopy } from "~/icon/IconCopy"
import { IconDownload } from "~/icon/IconDownload"
import { IconEdit } from "~/icon/IconEdit"
import { IconPlus } from "~/icon/IconPlus"
import { IconTrash } from "~/icon/IconTrash"
import { IconUpload } from "~/icon/IconUpload"
import type { Snippet } from "~/lib/snippets"
import {
  createSnippet,
  loadSnippets,
  saveSnippets,
  updateSnippet
} from "~/lib/snippets"
import { snippetsFromCsv, snippetsToCsv } from "~/lib/snippetsCsv"

type SnippetDraft = {
  id?: string
  title: string
  category: string
  language: string
  code: string
}

const formatDateTime = (timestamp: number) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(timestamp))
  } catch {
    return new Date(timestamp).toLocaleString()
  }
}

const normalizeCategory = (value: string) => value.trim() || "General"

function IndexPopup() {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [selectedId, setSelectedId] = useState<string>("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState<SnippetDraft>({
    title: "",
    category: "General",
    language: "text",
    code: ""
  })
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importFileName, setImportFileName] = useState("")
  const [importSnippets, setImportSnippets] = useState<Snippet[]>([])
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [toast, setToast] = useState<string>("")

  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const loaded = await loadSnippets()
        if (!cancelled) {
          setSnippets(loaded)
          setSelectedId(loaded[0]?.id ?? "")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(""), 1400)
    return () => clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    setPage(1)
  }, [query, selectedCategory])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const snippet of snippets) {
      if (snippet.category.trim()) set.add(snippet.category)
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [snippets])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return snippets.filter((snippet) => {
      if (selectedCategory !== "All" && snippet.category !== selectedCategory) {
        return false
      }

      if (!q) return true
      return (
        snippet.title.toLowerCase().includes(q) ||
        snippet.code.toLowerCase().includes(q) ||
        snippet.category.toLowerCase().includes(q) ||
        snippet.language.toLowerCase().includes(q)
      )
    })
  }, [query, selectedCategory, snippets])

  const pageSize = 5
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const normalizedPage = Math.min(page, pageCount)

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const paged = useMemo(() => {
    const start = (normalizedPage - 1) * pageSize
    const end = start + pageSize
    return filtered.slice(start, end)
  }, [filtered, normalizedPage])

  const selected = useMemo(
    () => snippets.find((s) => s.id === selectedId) ?? null,
    [selectedId, snippets]
  )

  const persist = async (next: Snippet[]) => {
    const sorted = next.slice().sort((a, b) => b.updatedAt - a.updatedAt)
    setSnippets(sorted)
    await saveSnippets(sorted)
  }

  const downloadCsv = () => {
    const csv = `\uFEFF${snippetsToCsv(snippets)}`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    const date = new Date()
    const y = String(date.getFullYear())
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    anchor.href = url
    anchor.download = `codebook-snippets-${y}${m}${d}.csv`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setToast("已导出 CSV")
  }

  const openImportPicker = () => {
    importInputRef.current?.click()
  }

  const handleImportFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const result = snippetsFromCsv(text)
      setImportFileName(file.name)
      setImportSnippets(result.snippets)
      setImportWarnings(result.warnings)
      setIsImportOpen(true)
    } catch {
      setToast("导入失败：无法读取文件")
    } finally {
      if (importInputRef.current) importInputRef.current.value = ""
    }
  }

  const closeImport = () => {
    setIsImportOpen(false)
    setImportFileName("")
    setImportSnippets([])
    setImportWarnings([])
  }

  const mergeImport = async () => {
    const map = new Map<string, Snippet>()
    for (const s of snippets) map.set(s.id, s)
    for (const s of importSnippets) map.set(s.id, s)
    const merged = Array.from(map.values())
    await persist(merged)
    setSelectedId(merged[0]?.id ?? "")
    closeImport()
    setToast("已导入（合并）")
  }

  const replaceImport = async () => {
    await persist(importSnippets)
    setSelectedId(importSnippets[0]?.id ?? "")
    closeImport()
    setToast("已导入（覆盖）")
  }

  const openCreate = () => {
    setDraft({
      title: "",
      category: selectedCategory === "All" ? "General" : selectedCategory,
      language: "text",
      code: ""
    })
    setIsEditorOpen(true)
  }

  const openEdit = (snippet: Snippet) => {
    setDraft({
      id: snippet.id,
      title: snippet.title,
      category: snippet.category,
      language: snippet.language,
      code: snippet.code
    })
    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    setIsEditorOpen(false)
    setDraft({ title: "", category: "General", language: "text", code: "" })
  }

  const submitDraft = async () => {
    const category = normalizeCategory(draft.category)
    const title = draft.title.trim() || "Untitled"
    const language = draft.language.trim() || "text"
    const code = draft.code.trim()

    if (!code) {
      setToast("Code 不能为空")
      return
    }

    if (draft.id) {
      const existing = snippets.find((s) => s.id === draft.id)
      if (!existing) return

      const updated = updateSnippet(existing, {
        title,
        category,
        language,
        code
      })
      const next = [updated, ...snippets.filter((s) => s.id !== updated.id)]
      await persist(next)
      setSelectedId(updated.id)
      setSelectedCategory("All")
      closeEditor()
      setToast("已更新")
      return
    }

    const created = createSnippet({ title, category, language, code })
    await persist([created, ...snippets])
    setSelectedId(created.id)
    setSelectedCategory("All")
    closeEditor()
    setToast("已保存")
  }

  const removeSnippet = async (id: string) => {
    const next = snippets.filter((s) => s.id !== id)
    await persist(next)
    if (selectedId === id) setSelectedId(next[0]?.id ?? "")
    setToast("已删除")
  }

  const copySelected = async () => {
    if (!selected) return
    try {
      await navigator.clipboard.writeText(selected.code)
      setToast("已复制到剪贴板")
    } catch {
      setToast("复制失败")
    }
  }

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const snippet of snippets) {
      counts.set(snippet.category, (counts.get(snippet.category) ?? 0) + 1)
    }
    return counts
  }, [snippets])

  return (
    <div className="relative h-[560px] w-[780px] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
              CB
            </div>
            <div>
              <div className="text-sm font-semibold leading-5">Codebook</div>
              <div className="text-xs text-slate-500">
                代码片段 + 分类管理（只在 popup 内）
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                className="h-9 w-[240px] rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索标题 / 代码 / 分类 / 语言…"
                value={query}
              />
              {query ? (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-xs text-slate-500 hover:text-slate-800"
                  onClick={() => setQuery("")}
                  type="button">
                  清除
                </button>
              ) : null}
            </div>

            <IconButton label="新建" onClick={openCreate} variant="primary">
              <IconPlus className="h-4 w-4" />
            </IconButton>

            <IconButton label="导出 CSV" onClick={downloadCsv}>
              <IconDownload className="h-4 w-4" />
            </IconButton>

            <IconButton label="导入 CSV" onClick={openImportPicker}>
              <IconUpload className="h-4 w-4" />
            </IconButton>
          </div>
        </header>

        <input
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => void handleImportFile(e.target.files?.[0] ?? null)}
          ref={importInputRef}
          type="file"
        />

        <div className="flex min-h-0 flex-1">
          <aside className="w-[200px] border-r border-slate-200 bg-white/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold tracking-wide text-slate-500">
                CATEGORIES
              </div>
              <div className="text-xs text-slate-400">{snippets.length}</div>
            </div>

            <div className="space-y-1">
              {categories.map((category) => {
                const active = category === selectedCategory
                const count =
                  category === "All"
                    ? snippets.length
                    : categoryCounts.get(category) ?? 0

                return (
                  <button
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    ].join(" ")}
                    key={category}
                    onClick={() => {
                      const first =
                        category === "All"
                          ? snippets[0]?.id
                          : snippets.find((s) => s.category === category)?.id

                      setSelectedCategory(category)
                      setSelectedId(first ?? "")
                    }}
                    type="button">
                    <span className="truncate">{category}</span>
                    <span
                      className={[
                        "ml-2 rounded-full px-2 py-0.5 text-xs",
                        active
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-600"
                      ].join(" ")}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
              <div className="font-medium text-slate-800">Tips</div>
              <div className="mt-1 leading-5">
                点击片段查看详情；支持搜索、复制、编辑、删除。
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-1">
            <section className="flex min-h-0 w-[280px] flex-col border-r border-slate-200 bg-white/40">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">Snippets</div>
                  <div className="text-xs text-slate-500">
                    {loading ? "Loading…" : `${filtered.length} results`}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col px-2 pb-3">
                {loading ? (
                  <div className="px-2 py-6 text-sm text-slate-500">
                    正在加载…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-2 py-6 text-sm text-slate-500">
                    暂无片段，点击右上角「新建」添加。
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col px-1">
                    <div className="space-y-2">
                      {paged.map((snippet) => {
                        const active = snippet.id === selectedId
                        return (
                          <button
                            className={[
                              "w-full rounded-xl border p-3 text-left shadow-sm",
                              active
                                ? "border-slate-900 bg-white"
                                : "border-slate-200 bg-white/70 hover:bg-white"
                            ].join(" ")}
                            key={snippet.id}
                            onClick={() => setSelectedId(snippet.id)}
                            type="button">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">
                                  {snippet.title}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                  <span className="truncate">
                                    {snippet.category}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="truncate">
                                    {snippet.language}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 text-xs text-slate-400">
                                {formatDateTime(snippet.updatedAt)}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-3 flex items-center justify-between px-1 text-xs text-slate-500">
                      <div>
                        Page {normalizedPage} / {pageCount}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          disabled={normalizedPage <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          type="button">
                          上一页
                        </button>
                        <button
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          disabled={normalizedPage >= pageCount}
                          onClick={() =>
                            setPage((p) => Math.min(pageCount, p + 1))
                          }
                          type="button">
                          下一页
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="min-h-0 flex-1">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {selected?.title ?? "选择一个片段"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {selected
                        ? `${selected.category} • ${selected.language} • ${formatDateTime(
                          selected.updatedAt
                        )}`
                        : "从左侧列表点击一个条目查看"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <IconButton
                      disabled={!selected}
                      label="复制"
                      onClick={copySelected}>
                      <IconCopy className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      disabled={!selected}
                      label="编辑"
                      onClick={() => {
                        if (!selected) return
                        openEdit(selected)
                      }}>
                      <IconEdit className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      disabled={!selected}
                      label="删除"
                      onClick={() => {
                        if (!selected) return
                        void removeSnippet(selected.id)
                      }}
                      variant="danger">
                      <IconTrash className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
                  {selected ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">
                            {selected.category}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">
                            {selected.language}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Created {formatDateTime(selected.createdAt)}
                        </div>
                      </div>

                      <HighlightedCode
                        code={selected.code}
                        language={selected.language}
                        preClassName="max-h-[360px] overflow-hidden rounded-xl bg-slate-950 p-4 text-slate-50"
                      />
                      <div className="mt-2 text-xs text-slate-500">
                        内容过长会被截断；需要完整查看请点「编辑」或直接「复制」。
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
                        <div className="text-sm font-semibold text-slate-800">
                          还没有选择片段
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          点击「新建」添加，或从左侧选择一个片段。
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {toast ? (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>
      ) : null}

      {isEditorOpen ? (
        <Modal onClose={closeEditor} title={draft.id ? "编辑片段" : "新建片段"}>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block">
                <div className="text-xs font-medium text-slate-600">标题</div>
                <input
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, title: e.target.value }))
                  }
                  placeholder="例如：Fetch with AbortController"
                  value={draft.title}
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-slate-600">
                  分类（添加时设置）
                </div>
                <input
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  list="codebook-categories"
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, category: e.target.value }))
                  }
                  placeholder="例如：React / Node / SQL"
                  value={draft.category}
                />
                <datalist id="codebook-categories">
                  {categories
                    .filter((c) => c !== "All")
                    .map((c) => (
                      <option key={c} value={c} />
                    ))}
                </datalist>
              </label>

              <label className="block">
                <div className="text-xs font-medium text-slate-600">
                  语言/标签
                </div>
                <input
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, language: e.target.value }))
                  }
                  placeholder="例如：ts / bash / sql"
                  value={draft.language}
                />
              </label>
            </div>

            <label className="block md:col-span-2">
              <div className="text-xs font-medium text-slate-600">代码内容</div>
              <textarea
                className="scrollbar-none mt-1 h-[180px] w-full resize-none rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onChange={(e) =>
                  setDraft((s) => ({ ...s, code: e.target.value }))
                }
                placeholder={`例如：\nconst res = await fetch(url)\nconst json = await res.json()`}
                value={draft.code}
              />
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">
              {draft.id ? "修改会覆盖原片段" : "保存后会出现在列表顶部"}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={closeEditor}
                type="button">
                取消
              </button>
              <button
                className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
                onClick={() => void submitDraft()}
                type="button">
                保存
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {isImportOpen ? (
        <Modal
          maxWidthClassName="max-w-[620px]"
          onClose={closeImport}
          subtitle={importFileName || "未选择文件"}
          title="导入 CSV">
          <div className="space-y-3 p-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              解析到{" "}
              <span className="font-semibold">{importSnippets.length}</span>{" "}
              条片段
            </div>

            {importWarnings.length ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {importWarnings[0]}
              </div>
            ) : null}

            <div className="text-xs leading-5 text-slate-500">
              「合并」会按 <span className="font-medium">id</span> 去重并覆盖同
              id 的旧数据；「覆盖」会清空现有数据后导入。
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <button
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={closeImport}
              type="button">
              取消
            </button>

            <div className="flex items-center gap-2">
              <button
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={importSnippets.length === 0}
                onClick={() => void mergeImport()}
                type="button">
                合并导入
              </button>
              <button
                className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={importSnippets.length === 0}
                onClick={() => void replaceImport()}
                type="button">
                覆盖导入
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

export default IndexPopup
