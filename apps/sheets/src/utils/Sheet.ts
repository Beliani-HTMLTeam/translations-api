import type { Result } from '../types/cache/Result'
import cache, { CacheType } from '../services/Cache'
import { Hermes } from './Logger'
import { GoogleSheetsRepository } from '../services/GoogleSheetsRepository'
import { ExcelParser } from './ExcelParser'

export class Sheet {
  public sheetType: CacheType
  public year?: string

  constructor(sheetType: CacheType, year?: string) {
    this.sheetType = sheetType
    this.year = year
  }

  getCacheKey(tabName: string): string {
    const normalizedTab = tabName.trim().slice(0, 31).trim()
    return this.year
      ? `dynamic_${this.year}_${normalizedTab}`
      : `static_${normalizedTab}`
  }

  // raw sheets fetch
  async getNewData(
    sheetName: string | string[]
  ): Promise<Result<Record<string, any>>> {
    try {
      const buffer = await GoogleSheetsRepository.fetchDocumentBuffer(
        this.sheetType,
        this.year
      )
      const parsedData = ExcelParser.parseXLSXBuffer(buffer, sheetName)

      if (!parsedData) {
        return { code: 404, message: 'No translations found or error parsing!' }
      }

      return { code: 200, data: parsedData }
    } catch (err: any) {
      Hermes.error(`Error in getNewData:`, err)
      return {
        code: 500,
        message: err.message || 'Error occurred during data processing',
      }
    }
  }

  // get single tab either from cache or automatically downloaded and cached
  async getTab(tabName: string): Promise<{
    data: Record<string, any[]>
    dataOrigin: string
    executionTime: number
  } | null> {
    const start_time = Date.now()
    const cacheKey = this.getCacheKey(tabName)

    if (await cache.has(cacheKey)) {
      // background worker handles expiration
      const data = await cache.get<Record<string, any[]>>(cacheKey)
      const age = cache.getAge(cacheKey)
      Hermes.log(
        `✓ Cache HIT for "${cacheKey}" (Age: ${age !== null ? age.toFixed(1) : '?'}s)`
      )

      if (age !== null && age > cache.getTTL() / 1000) {
        Hermes.debug(
          ` > Cache is stale (Age > TTL). Refreshing before responding...`
        )
        await cache.renew(cacheKey)

        const freshData = await cache.get<Record<string, any[]>>(cacheKey)
        return freshData
          ? {
              data: freshData,
              dataOrigin: 'googleAPI',
              executionTime: Number((Date.now() - start_time).toFixed(2)),
            }
          : null
      }

      return data
        ? {
            data,
            dataOrigin: 'cache',
            executionTime: Number((Date.now() - start_time).toFixed(2)),
          }
        : null
    }

    // cache miss - we fetch it, save it, and return it
    Hermes.log(`✖ Cache MISS for "${cacheKey}". Fetching from Google API...`)
    const res = await this.getNewData(tabName)

    if (res.code === 200 && res.data) {
      await cache.set(cacheKey, res.data, this.sheetType, tabName, this.year)

      return {
        data: res.data,
        dataOrigin: 'googleAPI',
        executionTime: Number((Date.now() - start_time).toFixed(2)),
      }
    }

    return null
  }

  //force renew tab without waiting for worker
  async forceRefresh(tabName: string): Promise<{ executionTime: number }> {
    const start_time = Date.now()
    const cacheKey = this.getCacheKey(tabName)
    const res = await this.getNewData(tabName)

    if (res.code === 200 && res.data) {
      await cache.set(cacheKey, res.data, this.sheetType, tabName, this.year)

      Hermes.log(`✓ Cache renewed for "${tabName}"`)

      return { executionTime: Number((Date.now() - start_time).toFixed(2)) }
    } else {
      throw new Error(`✖ Failed to force refresh ${tabName}: ${res.code}`)
    }
  }

  private async populateCache(
    sheetNames: string[] | 'everything',
    isRecache: boolean
  ): Promise<{ executionTime: number }> {
    const start_time = Date.now()
    const actionName = isRecache ? 'recache' : 'prewarm'
    const ActionPast = isRecache ? 'Recached' : 'Prewarmed'

    Hermes.log(
      `-> Starting ${actionName} for ${this.sheetType} ${this.year ? `(${this.year})` : ''}...`
    )

    const res = await this.getNewData(sheetNames)

    if (res.code === 200 && res.data) {
      const titles = Object.keys(res.data)

      for (const title of titles) {
        const cacheKey = this.getCacheKey(title)

        await cache.set(
          cacheKey,
          res.data[title],
          this.sheetType,
          title,
          this.year
        )
      }
      Hermes.log(
        `--> ✓ ${ActionPast} ${titles.length} tabs for ${this.sheetType}`
      )
      return { executionTime: Number((Date.now() - start_time).toFixed(2)) }
    } else {
      Hermes.error(
        `--> ✖ Failed to ${actionName} ${this.sheetType}`,
        res.message
      )
      throw new Error(
        `✖ Failed to ${actionName} ${this.sheetType}: ${res.code}`
      )
    }
  }

  // download all tabs in this document and bulk insert into Cache on startup
  async prewarm(
    sheetNames: string[] | 'everything' = 'everything'
  ): Promise<{ executionTime: number }> {
    return this.populateCache(sheetNames, false)
  }

  // refresh all tabs in this document and bulk insert into Cache during runtime
  async recache(
    sheetNames: string[] | 'everything' = 'everything'
  ): Promise<{ executionTime: number }> {
    return this.populateCache(sheetNames, true)
  }
}
