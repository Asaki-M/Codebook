export type Snippet = {
  id: string
  title: string
  code: string
  category: string
  language: string
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = "codebook:snippets:v1"
const DB_NAME = "codebook"
const DB_VERSION = 1
const STORE_SNIPPETS = "snippets"

const isSnippet = (value: unknown): value is Snippet => {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>

  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.code === "string" &&
    typeof record.category === "string" &&
    typeof record.language === "string" &&
    typeof record.createdAt === "number" &&
    typeof record.updatedAt === "number"
  )
}

const normalizeSnippets = (value: unknown): Snippet[] => {
  if (!Array.isArray(value)) return []
  return value.filter(isSnippet)
}

const hasChromeStorage = (): boolean =>
  typeof chrome !== "undefined" &&
  !!chrome.storage?.local &&
  typeof chrome.storage.local.get === "function" &&
  typeof chrome.storage.local.set === "function"

const chromeStorageGet = async (key: string): Promise<unknown> => {
  if (!hasChromeStorage()) return null
  return await new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (items) => {
      const error = chrome.runtime?.lastError
      if (error) reject(error)
      else resolve(items?.[key])
    })
  })
}

const chromeStorageSet = async (key: string, value: unknown): Promise<void> => {
  if (!hasChromeStorage()) return
  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      const error = chrome.runtime?.lastError
      if (error) reject(error)
      else resolve()
    })
  })
}

const chromeStorageRemove = async (key: string): Promise<void> => {
  if (!hasChromeStorage()) return
  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.remove(key, () => {
      const error = chrome.runtime?.lastError
      if (error) reject(error)
      else resolve()
    })
  })
}

const hasIndexedDb = (): boolean =>
  typeof indexedDB !== "undefined" && typeof indexedDB.open === "function"

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const transactionDone = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error)
    tx.onerror = () => reject(tx.error)
  })

let dbPromise: Promise<IDBDatabase> | null = null

const openDb = async (): Promise<IDBDatabase> => {
  if (!hasIndexedDb()) {
    throw new Error("IndexedDB is not available in this environment.")
  }

  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_SNIPPETS)) {
        db.createObjectStore(STORE_SNIPPETS, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

const getAllSnippetsFromDb = async (): Promise<Snippet[]> => {
  const db = await openDb()
  const tx = db.transaction(STORE_SNIPPETS, "readonly")
  const store = tx.objectStore(STORE_SNIPPETS)
  const items = await requestToPromise(store.getAll())
  await transactionDone(tx)
  return normalizeSnippets(items).sort((a, b) => b.updatedAt - a.updatedAt)
}

const replaceAllSnippetsInDb = async (snippets: Snippet[]): Promise<void> => {
  const db = await openDb()
  const tx = db.transaction(STORE_SNIPPETS, "readwrite")
  const store = tx.objectStore(STORE_SNIPPETS)

  await requestToPromise(store.clear())
  for (const snippet of snippets) {
    await requestToPromise(store.put(snippet))
  }

  await transactionDone(tx)
}

let migrationPromise: Promise<void> | null = null

const ensureMigratedToIndexedDb = async (): Promise<void> => {
  if (migrationPromise) return migrationPromise

  migrationPromise = (async () => {
    if (!hasIndexedDb()) return

    const existing = await getAllSnippetsFromDb()
    if (existing.length > 0) return

    const legacy = normalizeSnippets(await chromeStorageGet(STORAGE_KEY))
    if (legacy.length === 0) return

    await replaceAllSnippetsInDb(legacy)
    await chromeStorageRemove(STORAGE_KEY)
  })()

  return migrationPromise
}

export const loadSnippets = async (): Promise<Snippet[]> => {
  if (!hasIndexedDb()) {
    const value = await chromeStorageGet(STORAGE_KEY)
    return normalizeSnippets(value).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  await ensureMigratedToIndexedDb()
  return await getAllSnippetsFromDb()
}

export const saveSnippets = async (snippets: Snippet[]): Promise<void> => {
  const sorted = snippets.slice().sort((a, b) => b.updatedAt - a.updatedAt)

  if (!hasIndexedDb()) {
    await chromeStorageSet(STORAGE_KEY, sorted)
    return
  }

  await replaceAllSnippetsInDb(sorted)
}

export const createSnippet = (input: {
  title: string
  code: string
  category: string
  language: string
}): Snippet => {
  const now = Date.now()
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${now}-${Math.random().toString(16).slice(2)}`

  return {
    id,
    title: input.title,
    code: input.code,
    category: input.category,
    language: input.language,
    createdAt: now,
    updatedAt: now
  }
}

export const updateSnippet = (
  snippet: Snippet,
  patch: Partial<Pick<Snippet, "title" | "code" | "category" | "language">>
): Snippet => ({
  ...snippet,
  ...patch,
  updatedAt: Date.now()
})
