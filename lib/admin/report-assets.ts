import fs from 'fs'
import path from 'path'

export type ReportLogoBuffers = {
  logo1: Buffer
  logo2: Buffer
  logo3: Buffer
}

export function loadReportLogoBuffers(): ReportLogoBuffers {
  const publicDir = path.join(process.cwd(), 'public')
  return {
    logo1: fs.readFileSync(path.join(publicDir, 'logo.png')),
    logo2: fs.readFileSync(path.join(publicDir, 'logo2.png')),
    logo3: fs.readFileSync(path.join(publicDir, 'logo3.png')),
  }
}

export function buildReportStamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
}

/** ExcelJS tipa `Buffer` con una versión distinta a la de Node 24+; base64 evita el conflicto. */
export function logoToExcelImage(data: Buffer): { extension: 'png'; base64: string } {
  return {
    extension: 'png',
    base64: data.toString('base64'),
  }
}
