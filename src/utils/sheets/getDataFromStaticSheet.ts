import cache from '../../services/cache';
import { fetchSheetData } from './fetchSheetData';
import { refreshCacheInBackground } from '../refresh';
import { logCacheEvent, handleCacheError } from '../cache';
import { Result } from '../../types/cache/Result';
import { REFRESH_THRESHOLD_MS } from '../../constants';

export async function getDataFromStaticSheet(
  sheetName: string,
  cacheKey: string,
  isPrewarm: boolean = false
): Promise<Result<any>> {
  let start_time = Date.now();

  try {
    const cachedData = await cache.get(cacheKey);

    if (cachedData) {
      const responseTime = Number((Date.now() - start_time).toFixed(2));

      if (!isPrewarm) {
        refreshCacheInBackground(sheetName, cacheKey);
        logCacheEvent('⚡ Cache hit', cacheKey);
      }

      return {
        dataOrigin: 'cache',
        executionTime: responseTime,
        data: cachedData,
      };
    }

    if (!isPrewarm)
      logCacheEvent('🎯 Cache miss', cacheKey, `fetching fresh data from sheet '${sheetName}'`);

    const sheetData = await fetchSheetData('STATIC', sheetName);
    await cache.set(cacheKey, sheetData.data);

    const responseTime = Date.now() - start_time;
    if (!isPrewarm) logCacheEvent('🎯 New static cache entry', cacheKey);

    return {
      dataOrigin: 'googleAPI',
      executionTime: responseTime,
      data: sheetData.data,
    };
  } catch (err) {
    return handleCacheError(cacheKey, err);
  }
}
