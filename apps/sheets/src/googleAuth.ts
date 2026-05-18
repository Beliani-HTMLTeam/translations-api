import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'
import credentials from '../google-credentials.json'
import spreadsheets from '../spreadsheets.json'

const xlsxAccount = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const STATIC_TRANSLATIONS = new GoogleSpreadsheet(
  spreadsheets.static,
  xlsxAccount
)

const DYNAMIC_SHEETS: Record<string, GoogleSpreadsheet> = Object.fromEntries(
  Object.entries(spreadsheets.dynamic).map(([year, id]) => [
    year,
    new GoogleSpreadsheet(id as string, xlsxAccount),
  ])
)

export function resolveYearFromSpreadsheetId(
  spreadsheetId: string
): string | undefined {
  const entry = Object.entries(spreadsheets.dynamic).find(
    ([_, id]) => id === spreadsheetId
  )
  return entry?.[0]
}

export async function getStaticTranslations() {
  await STATIC_TRANSLATIONS.loadInfo()
  return STATIC_TRANSLATIONS
}

export async function getDynamicTranslations(year?: string) {
  if (!year) return undefined

  const doc = DYNAMIC_SHEETS[year]
  if (!doc) return undefined

  await doc.loadInfo()
  return doc
}
