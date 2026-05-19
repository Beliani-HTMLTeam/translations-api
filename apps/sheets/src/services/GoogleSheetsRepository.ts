import { getStaticTranslations, getDynamicTranslations } from '../googleAuth'
import type { CacheType } from './Cache'
import { Hermes } from '../utils/Logger'

export class GoogleSheetsRepository {
  static async fetchDocumentBuffer(
    sheetType: CacheType,
    year?: string
  ): Promise<ArrayBuffer> {
    let document

    if (sheetType === 'globalTranslations') {
      document = await getStaticTranslations()
    } else if (sheetType === 'newsletterTranslations') {
      if (!year) {
        throw new Error('Year must be provided for newsletter translations.')
      }
      document = await getDynamicTranslations(year)
    }

    if (!document) {
      throw new Error('Unexpected error occurred. Document not found.')
    }

    try {
      return await document.downloadAsXLSX()
    } catch (err: any) {
      Hermes.error('✖ Failed to download document as XLSX:', err.message)
      throw new Error('Failed to download spreadsheet!')
    }
  }
}
