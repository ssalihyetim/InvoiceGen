// Excel okuma/yazma yardımcıları (exceljs tabanlı).
//
// `xlsx` (SheetJS) paketinin npm sürümü bakımsız ve High-severity advisory'li
// (prototype pollution + ReDoS) — kullanıcı yüklemelerini parse ettiğimiz için
// gerçek tehdit yüzeyindeydi (audit G-1 / task 1.7). Bu modül aynı davranışı
// exceljs ile sağlar: ilk satır başlık, sonraki satırlar { başlık: değer }
// objeleri; formül hücreleri sonuçlarına, tarih hücreleri Date'e çözülür.
// exceljs lazy-import edilir ki sayfa bundle'ları büyümesin.

import type ExcelJS from 'exceljs'

export type ExcelRow = Record<string, any>

export interface ParsedWorkbook {
  sheetNames: string[]
  /** XLSX.utils.sheet_to_json eşdeğeri: ilk satır başlık, boş satırlar atlanır. */
  sheetToJson(sheetName: string): ExcelRow[]
}

function cellValue(v: ExcelJS.CellValue): any {
  if (v == null) return undefined
  if (v instanceof Date) return v
  if (typeof v === 'object') {
    const o = v as any
    if ('result' in o) return cellValue(o.result) // formül → hesaplanmış değer
    if ('richText' in o) return o.richText.map((r: any) => r.text).join('')
    if ('text' in o) return cellValue(o.text) // hyperlink
    if ('error' in o) return undefined
    return undefined
  }
  return v
}

export async function readWorkbook(data: ArrayBuffer): Promise<ParsedWorkbook> {
  const { Workbook } = (await import('exceljs')).default ?? (await import('exceljs'))
  const wb = new Workbook()
  await wb.xlsx.load(data)

  return {
    sheetNames: wb.worksheets.map(ws => ws.name),
    sheetToJson(sheetName: string): ExcelRow[] {
      const ws = wb.getWorksheet(sheetName)
      if (!ws) return []

      const rows: ExcelRow[] = []
      let headers: string[] | null = null

      ws.eachRow({ includeEmpty: false }, row => {
        const values = row.values as ExcelJS.CellValue[] // 1-indexli seyrek dizi

        if (!headers) {
          headers = []
          const seen = new Set<string>()
          for (let col = 1; col < values.length; col++) {
            const h = cellValue(values[col])
            let key = h == null || h === '' ? `__EMPTY_${col}` : String(h)
            while (seen.has(key)) key = `${key}_1` // sheet_to_json gibi tekille
            seen.add(key)
            headers[col] = key
          }
          return
        }

        const obj: ExcelRow = {}
        let hasValue = false
        for (let col = 1; col < values.length; col++) {
          const v = cellValue(values[col])
          if (v === undefined || v === '') continue
          obj[headers[col] ?? `__EMPTY_${col}`] = v
          hasValue = true
        }
        if (hasValue) rows.push(obj)
      })

      return rows
    },
  }
}

/** json_to_sheet + write eşdeğeri: obje dizisinden tek sayfalık .xlsx üretir. */
export async function buildWorkbook(rows: ExcelRow[], sheetName: string): Promise<ArrayBuffer> {
  const { Workbook } = (await import('exceljs')).default ?? (await import('exceljs'))
  const wb = new Workbook()
  const ws = wb.addWorksheet(sheetName)

  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  ws.addRow(headers)
  for (const row of rows) ws.addRow(headers.map(h => row[h]))

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>
}
