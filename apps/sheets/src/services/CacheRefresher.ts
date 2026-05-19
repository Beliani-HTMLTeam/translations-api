import cache from './Cache'
import { Sheet } from '../utils/Sheet'
import settings from '../config'
import { Hermes } from '../utils/Logger'

class CacheRefresher {
  private isRenewing = false
  private intervalId?: ReturnType<typeof setInterval>

  start() {
    this.intervalId = setInterval(async () => {
      await this.tick()
    }, settings.workerInterval * 1000)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  private async tick() {
    if (!cache.isPrewarmed) return
    if (this.isRenewing) return
    this.isRenewing = true

    Hermes.log(`$ Checking for expired cache entries...`)

    try {
      const expiredKeys = cache.keys().filter((key) => cache.isExpired(key))

      if (expiredKeys.length > 0) {
        Hermes.info(` > Found %s expired keys. Renewing...`, expiredKeys.length)

        const newsletterTranslationsKeys = new Set<string>()
        let renewGlobal = false

        for (const key of expiredKeys) {
          const raw = await cache.getRaw(key)
          const age = cache.getAge(key)
          Hermes.debug(
            ` > Key "${key}" expired (Age: ${age !== null ? age.toFixed(1) : '?'}s). Queued for recache.`
          )

          if (raw?.type === 'newsletterTranslations' && raw.year) {
            newsletterTranslationsKeys.add(raw.year)
          } else if (raw?.type === 'globalTranslations') {
            renewGlobal = true
          } else {
            await cache.renew(key)
          }
        }

        // renew all at once, prevents rate limiting issues
        if (renewGlobal) {
          Hermes.debug(` > - Renewing all global translations...`)
          try {
            const sheet = new Sheet('globalTranslations')

            await sheet.recache('everything')

            Hermes.debug(` > ✔ Global translations renewed!`)
          } catch (err) {
            Hermes.error(` > ✖ Failed to mass-refresh globalTranslations:`, err)
          }
        }

        // for newsletter translations, we can batch them by year
        for (const year of newsletterTranslationsKeys) {
          Hermes.debug(
            ` > - Mass-refreshing all newsletter translations for year:`,
            year
          )

          try {
            const sheet = new Sheet('newsletterTranslations', year)

            await sheet.recache('everything')

            Hermes.debug(
              ` > ✔ Year ${year} refreshed successfully without hitting Google API limits.`
            )
          } catch (err) {
            Hermes.error(` > ✖ Failed to mass-refresh year ${year}:`, err)
          }
        }
      }
    } catch (err) {
      Hermes.error(`✖ Worker error:`, err)
    } finally {
      this.isRenewing = false
    }
  }
}

export const cacheRefresher = new CacheRefresher()
