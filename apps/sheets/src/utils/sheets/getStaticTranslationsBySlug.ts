import cache, { checkIfPrewarmIsDone } from '../../services/cache'
import { fetchSheetData } from './fetchSheetData'
import { keyToSheetMap } from '../../constants'
import { getOrRefreshCache, logCacheEvent } from '../cache'
import { Result } from '../../types/cache/Result'

export async function getStaticTranslationsBySlug(
  cacheKey: string,
  languageSlug: string
): Promise<Result<Record<string, any>>> {
  const start_time = Date.now()
  checkIfPrewarmIsDone()

  const cachedData = await cache.get(cacheKey)
  const isCacheHit = cachedData !== undefined

  const cacheEntry = await getOrRefreshCache(
    cacheKey,
    async () => {
      const sheetName = keyToSheetMap[cacheKey]
      if (!sheetName) {
        throw new Error(`No sheet mapping for cache key: ${cacheKey}`)
      }
      const result = await fetchSheetData('STATIC', sheetName)

      // Handle error responses from fetchSheetData
      if (result.code === 404 || result.code === 500) {
        throw new Error(result.message)
      }

      return result.data!
    },
    isCacheHit
  )

  const slugArray = Array.isArray(cacheEntry.slug) ? cacheEntry.slug : []
  const idx = slugArray.findIndex((s: string) => s === languageSlug)

  if (idx === -1) {
    const responseTime = Number((Date.now() - start_time).toFixed(2))

    return {
      code: 404,
      message: `No translations found!`,
    }
  }

  const values: Record<string, any> = {}
  const entriesWithoutSlug = Object.entries(cacheEntry).slice(1)

  for (const [propertyKeys, translationsArray] of entriesWithoutSlug) {
    if (Array.isArray(translationsArray)) {
      values[propertyKeys] = translationsArray[idx] ?? null
    } else {
      return {
        code: 500,
        message: `Error! No array found!`,
      }
    }
  }

  const responseTime = Number((Date.now() - start_time).toFixed(2))

  logCacheEvent(
    '🎯 Translations fetched',
    cacheKey,
    `Execution time: ${responseTime}ms`
  )

  return {
    executionTime: responseTime,
    data: values,
  }
}
