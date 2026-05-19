import { Result } from '../../types/cache/Result'
import { Sheet } from '../../utils/Sheet'
import { makeResponseSchema } from '../../types/api-response'

import { extractKeys, filterToAllowedHeaders } from './utils'
import settings from '../../config'

const getDynamicSheet = (year: string) => {
  const y = year || new Date().getFullYear().toString()
  return new Sheet('newsletterTranslations', y)
}

const formatResponse = (envelope: any, rangeStr?: string) => {
  const keys = extractKeys(envelope.data) || []
  const filteredData = filterToAllowedHeaders(
    envelope.data,
    settings.headers.allowed,
    settings.headers.transformations
  )

  if (!rangeStr) {
    return { keys, data: filteredData }
  }

  const isRangeValid = /^\d+:\d+$|^\d+$/.test(rangeStr)
  if (!isRangeValid) {
    throw new Error(
      `Error! Invalid range format! Use "start:end" or "index" format.`
    )
  }

  const [startStr, endStr] = rangeStr.split(':')
  const start = parseInt(startStr, 10) - 2
  const end = endStr ? parseInt(endStr, 10) - 1 : start + 1

  const slicedData: Record<string, any[]> = {}
  for (const [header, values] of Object.entries(filteredData)) {
    if (header === 'slug' || header === 'id') continue
    if (!Array.isArray(values)) continue
    slicedData[header] = values.slice(start, end)
  }

  return {
    keys: keys.slice(start, end),
    data: slicedData,
  }
}

export function registerDynamic(parent: any) {
  parent.group('/:sheet_tab', (_sheet_tab: any) =>
    _sheet_tab
      .get(
        '/',
        async ({
          params: { sheet_tab, year },
          set,
        }: any): Promise<Result<any>> => {
          try {
            const sheet = getDynamicSheet(year)
            const envelope = await sheet.getTab(sheet_tab)

            if (!envelope) {
              set.status = 404
              return {
                code: 404,
                message: settings.endpoints.dynamic.messages.not_found,
              }
            }

            const { keys, data } = formatResponse(envelope)

            return {
              code: 200,
              message: settings.endpoints.dynamic.messages.success_fetch,
              dataOrigin: envelope.dataOrigin as any,
              executionTime: envelope.executionTime,
              keys,
              data,
            }
          } catch (err: any) {
            set.status = 500
            return {
              code: 500,
              message: settings.endpoints.dynamic.messages.error,
            }
          }
        },
        makeResponseSchema(settings.endpoints.dynamic)
      )

      .get(
        '/force-refresh',
        async ({ params: { sheet_tab, year } }: any): Promise<Result<null>> => {
          try {
            const sheet = getDynamicSheet(year)
            const res = await sheet.forceRefresh(sheet_tab)

            return {
              code: 200,
              message: settings.endpoints.dynamic.messages.success_refresh,
              executionTime: res.executionTime,
            }
          } catch (err) {
            return {
              code: 500,
              message: settings.endpoints.dynamic.messages.error,
            }
          }
        },
        makeResponseSchema(settings.endpoints.dynamic)
      )

      .get(
        '/:range',
        async ({
          params: { sheet_tab, range, year },
          set,
        }: any): Promise<Result<any>> => {
          try {
            const sheetObj = getDynamicSheet(year)
            const envelope = await sheetObj.getTab(sheet_tab)

            if (!envelope) {
              set.status = 404
              return {
                code: 404,
                message: settings.endpoints.dynamic.messages.not_found,
              }
            }

            try {
              const { keys, data } = formatResponse(envelope, range)
              return {
                code: 200,
                message: settings.endpoints.dynamic.messages.success_fetch,
                dataOrigin: envelope.dataOrigin as any,
                executionTime: envelope.executionTime,
                keys,
                data,
              }
            } catch (formatErr: any) {
              set.status = 400
              return {
                code: 400,
                message: formatErr.message,
              }
            }
          } catch (err: any) {
            set.status = 500
            return {
              code: 500,
              message: settings.endpoints.dynamic.messages.error,
            }
          }
        },
        makeResponseSchema(settings.endpoints.dynamic)
      )
  )
  return parent
}
