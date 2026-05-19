import settings from '../../config'

function findKeysHeader(data: Record<string, any[]>): string | undefined {
  const headers = Object.keys(data)
  for (const header of headers) {
    if (settings.issue_regex.test(header)) return header
  }
  return undefined
}

function normalizeKeyCell(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.replaceAll('\n', '<br />').trim()
  return String(value).trim()
}

function extractKeys(rawData: Record<string, any[]>) {
  const keysHeader = findKeysHeader(rawData)
  if (!keysHeader) return undefined

  const col = rawData[keysHeader]
  if (!Array.isArray(col)) return undefined

  return col.map(normalizeKeyCell)
}

export function filterToAllowedHeaders(
  data: Record<string, any[]>,
  allowedHeaders: string[],
  headerTransformations: Record<string, string>
) {
  const filtered: Record<string, any[]> = {}

  for (const [header, values] of Object.entries(data)) {
    if (allowedHeaders.includes(header)) {
      const outputHeader = headerTransformations[header] || header
      filtered[outputHeader] = values
    }
  }

  return filtered
}

export { extractKeys }
