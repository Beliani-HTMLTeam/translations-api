import * as xlsx from 'xlsx'
import { Hermes } from './Logger'

export class ExcelParser {
  static parseXLSXBuffer(
    buffer: ArrayBuffer,
    sheetNameRequest: string | string[]
  ) {
    const workbook = xlsx.read(buffer)

    const matchSheetName = (requested: string, actual: string) => {
      const req = requested.trim()
      const act = actual.trim()
      return (
        act === req ||
        act === req.slice(0, 31).trim() ||
        act === req.slice(0, 31)
      )
    }

    const sheetsToProcess: string[] = []
    if (Array.isArray(sheetNameRequest)) {
      if (
        sheetNameRequest.length === 1 &&
        sheetNameRequest[0] === 'everything'
      ) {
        sheetsToProcess.push(...workbook.SheetNames)
      } else {
        for (const name of sheetNameRequest) {
          const match = workbook.SheetNames.find((n) => matchSheetName(name, n))
          if (match) {
            sheetsToProcess.push(match)
          }
        }
      }
    } else if (sheetNameRequest === 'everything') {
      sheetsToProcess.push(...workbook.SheetNames)
    } else {
      const match = workbook.SheetNames.find((n) =>
        matchSheetName(sheetNameRequest, n)
      )
      if (match) {
        sheetsToProcess.push(match)
      }
    }

    if (!sheetsToProcess.length) {
      Hermes.error(
        `✖ No sheets to process! workbook.SheetNames:`,
        workbook.SheetNames
      )
      return null
    }

    const processSheet = (sheetTitle: string) => {
      try {
        const sheet = workbook.Sheets[sheetTitle]
        if (!sheet) return null

        const matrix: any[][] = xlsx.utils.sheet_to_json(sheet, {
          header: 1,
          defval: null,
        })
        if (!matrix || matrix.length === 0) return null

        const headers = matrix[0] || []
        const rows = matrix.slice(1)
        const result: { [key: string]: any } = {}

        for (let i = 0; i < headers.length; i++) {
          const header = headers[i]
          if (
            header !== null &&
            header !== undefined &&
            String(header).trim() !== ''
          ) {
            const headerName = String(header).trim()
            result[headerName] = rows.map((row) => {
              const val = row[i]
              if (val === null || val === undefined) return null
              return String(val).replaceAll('\n', '<br />').trim()
            })
          }
        }

        if (Object.keys(result).length === 0) return null

        return { name: sheetTitle, data: result }
      } catch (err: any) {
        Hermes.warn(`✖ Cannot process sheet "${sheetTitle}": ${err.message}`)
        return null
      }
    }

    if (Array.isArray(sheetNameRequest) || sheetNameRequest === 'everything') {
      const results = []

      for (const title of sheetsToProcess) {
        const parsed = processSheet(title)
        if (parsed) results.push(parsed)
      }

      if (results.length === 0) {
        Hermes.error(`✖ processSheet returned null for all sheets!`)
        return null
      }

      return results.reduce((acc, curr) => {
        acc[curr.name] = curr.data
        return acc
      }, {} as any)
    }

    const parsed = processSheet(sheetsToProcess[0])
    if (!parsed) return null

    return parsed.data
  }
}
