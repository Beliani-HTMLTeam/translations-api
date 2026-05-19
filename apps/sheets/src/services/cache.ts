import { compress, Compressed, decompress } from 'compress-json'
import { Sheet } from '../utils/Sheet'
import settings from '../config'
import { Hermes } from '../utils/Logger'

export type CacheType = 'newsletterTranslations' | 'globalTranslations'

export interface CacheEntry {
  value: Compressed
  type: CacheType
  year?: string
  tabName: string
  timestamp: number
}

class Cache {
  private store: Map<string, CacheEntry>
  private ttl: number
  public isPrewarmed: boolean = false
  private renewing: Map<string, Promise<void>> = new Map()

  constructor({ ttl }: { ttl: number }) {
    this.store = new Map()
    this.ttl = ttl * 1000
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key)
  }

  async get<T = Record<string, any[]>>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key)
    if (!entry) return undefined

    return decompress(entry.value) as T
  }

  async getRaw(key: string): Promise<CacheEntry | undefined> {
    return this.store.get(key)
  }

  async set(
    key: string,
    value: object,
    type: CacheType,
    tabName: string,
    year?: string
  ): Promise<void> {
    const compressedValue: Compressed = compress(value)

    this.store.set(key, {
      value: compressedValue,
      type,
      year,
      tabName,
      timestamp: Date.now(),
    })
  }

  del(key: string): void {
    this.store.delete(key)
  }

  reset(): void {
    this.store.clear()
  }

  keys(): string[] {
    return Array.from(this.store.keys())
  }

  values(): object[] {
    return Array.from(this.store.values()).map((entry) =>
      decompress(entry.value)
    )
  }

  entries(): [string, object][] {
    return Array.from(this.store.entries()).map(([key, entry]) => [
      key,
      decompress(entry.value),
    ])
  }

  size(): number {
    return this.store.size
  }

  setTTL(ttl: number): void {
    this.ttl = ttl * 1000
  }

  getTTL(): number {
    return this.ttl
  }

  isExpired(key: string): boolean | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined

    return Date.now() - entry.timestamp > this.ttl
  }

  getAge(key: string): number | null {
    const entry = this.store.get(key)
    if (!entry) return null

    return (Date.now() - entry.timestamp) / 1000
  }

  getDate(key: string): Date | null {
    const entry = this.store.get(key)
    if (!entry) return null

    return new Date(entry.timestamp)
  }

  getLocaleString(key: string, locale: string = 'pl'): string | null {
    const entry = this.store.get(key)
    if (!entry) return null

    return new Date(entry.timestamp).toLocaleString(locale)
  }

  async renew(key: string): Promise<void> {
    if (this.renewing.has(key)) {
      return this.renewing.get(key)
    }

    const renewPromise = (async () => {
      const entry = this.store.get(key)
      if (!entry) return

      try {
        const sheet = new Sheet(entry.type, entry.year)
        await sheet.forceRefresh(entry.tabName)
      } catch (err) {
        Hermes.error(`✖ Error renewing "${key}"`, err)
      } finally {
        this.renewing.delete(key)
      }
    })()

    this.renewing.set(key, renewPromise)
    return renewPromise
  }
}

const cache = new Cache({ ttl: settings.ttl })

export default cache
