import { Result } from '../../types/cache/Result'
import { Sheet } from '../../utils/Sheet'
import { makeResponseSchema } from '../../types/api-response'
import { Hermes } from '../../utils/Logger'

import settings from '../../config'

interface EndpointSettings {
  tags: string[]
  endpoint: string
  sheetName: string
  messages: {
    success_fetch: string
  }
}

function schema(endpoint: EndpointSettings) {
  return makeResponseSchema({
    tags: endpoint.tags,
    messages: {
      success_fetch: endpoint.messages.success_fetch,
      success_refresh: settings.endpoints.static.messages.success_refresh,
      not_found: settings.endpoints.static.messages.not_found,
      error: settings.endpoints.static.messages.error,
    },
  })
}

export function registerAllAtOnce(parent: any) {
  const { routes, messages } = settings.endpoints.static

  Object.keys(routes).forEach((key: string) => {
    const endp = (routes as Record<string, EndpointSettings>)[key]

    Hermes.debug(`% Registering static endpoint: ${endp.endpoint}`)

    parent.group(endp.endpoint, (group: any) =>
      group
        // get all translations
        .get(
          '/',
          async (context: any): Promise<Result<any>> => {
            const sheet = new Sheet('globalTranslations')
            const res = await sheet.getTab(endp.sheetName)
            if (!res) {
              context.set.status = 404
              return { code: 404, message: messages.not_found }
            }

            return {
              code: 200,
              message: endp.messages.success_fetch,
              executionTime: res.executionTime,
              dataOrigin: res.dataOrigin as any,
              data: res.data,
            }
          },
          schema(endp)
        )

        // force refresh
        .get(
          '/force-refresh',
          async (context: any): Promise<Result<null>> => {
            try {
              const sheet = new Sheet('globalTranslations')
              const res = await sheet.forceRefresh(endp.sheetName)

              return {
                code: 200,
                message: messages.success_refresh,
                executionTime: res.executionTime,
              }
            } catch (err: any) {
              context.set.status = 500
              return { code: 500, message: messages.error }
            }
          },
          schema(endp)
        )

        .group('/lang', (_lang: any) =>
          _lang
            // list available slugs
            .get(
              '/',
              async (context: any): Promise<Result<any>> => {
                const sheet = new Sheet('globalTranslations')
                const res = await sheet.getTab(endp.sheetName)

                if (!res) {
                  context.set.status = 404
                  return { code: 404, message: messages.not_found }
                }

                return {
                  code: 200,
                  message: messages.available_languages,
                  executionTime: res.executionTime,
                  dataOrigin: res.dataOrigin as any,
                  data: res.data.slug || [],
                }
              },
              schema(endp)
            )

            // get translations by slug
            .group('/:language_slug', (_langSlug: any) =>
              _langSlug.get(
                '/',
                async ({
                  params: { language_slug },
                  set,
                }: any): Promise<Result<any>> => {
                  try {
                    const sheet = new Sheet('globalTranslations')
                    const res = await sheet.getTab(endp.sheetName)

                    if (!res) {
                      set.status = 404
                      return { code: 404, message: messages.not_found }
                    }

                    const slugs = res.data.slug
                    if (!slugs) {
                      set.status = 404
                      return { code: 404, message: messages.not_found }
                    }

                    const index = slugs.indexOf(language_slug)
                    if (index === -1) {
                      set.status = 404
                      return { code: 404, message: messages.not_found }
                    }

                    const resultData: Record<string, any> = {}
                    const allKeys = Object.keys(res.data)
                    for (const k of allKeys) {
                      resultData[k] = res.data[k][index]
                    }

                    return {
                      code: 200,
                      message: endp.messages.success_fetch,
                      executionTime: res.executionTime,
                      dataOrigin: res.dataOrigin as any,
                      data: resultData,
                    }
                  } catch (err: any) {
                    set.status = 500
                    return { code: 500, message: messages.error }
                  }
                },
                schema(endp)
              )
            )
        )
    )

    Hermes.debug(`@ ${endp.endpoint} registered!`)
  })
  return parent
}
