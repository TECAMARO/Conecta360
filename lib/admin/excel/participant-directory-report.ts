import ExcelJS from 'exceljs'
import { EVENT } from '@/lib/event-config'
import {
  formatParticipantJoinDate,
  sortParticipantsForExcel,
  type ParticipantReportRow,
} from '@/lib/admin/participant-reports'
import { logoToExcelImage, type ReportLogoBuffers } from '@/lib/admin/report-assets'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFEEF3EA' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FF1A3C34' },
  size: 11,
}

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFDDE8D8' } },
  left: { style: 'thin', color: { argb: 'FFDDE8D8' } },
  bottom: { style: 'thin', color: { argb: 'FFDDE8D8' } },
  right: { style: 'thin', color: { argb: 'FFDDE8D8' } },
}

export async function buildParticipantDirectoryExcelReport(
  participants: ParticipantReportRow[],
  logos: ReportLogoBuffers,
  generatedAt = new Date(),
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Conecta360 Admin Portal'
  workbook.created = generatedAt

  const sheet = workbook.addWorksheet('Participantes', {
    views: [{ state: 'frozen', ySplit: 7 }],
  })

  sheet.columns = [
    { key: 'empresa', width: 34 },
    { key: 'nombre', width: 28 },
    { key: 'cargo', width: 24 },
    { key: 'sector', width: 28 },
    { key: 'correo', width: 32 },
    { key: 'pais', width: 20 },
    { key: 'registro', width: 28 },
  ]

  const logo1Id = workbook.addImage(logoToExcelImage(logos.logo1))
  const logo2Id = workbook.addImage(logoToExcelImage(logos.logo2))
  const logo3Id = workbook.addImage(logoToExcelImage(logos.logo3))

  sheet.addImage(logo1Id, { tl: { col: 0.1, row: 0.2 }, ext: { width: 130, height: 52 } })
  sheet.addImage(logo2Id, { tl: { col: 2.3, row: 0.2 }, ext: { width: 130, height: 52 } })
  sheet.addImage(logo3Id, { tl: { col: 4.5, row: 0.2 }, ext: { width: 130, height: 52 } })

  sheet.mergeCells('A3:G3')
  const titleCell = sheet.getCell('A3')
  titleCell.value = 'Directorio Oficial de Participantes — Conecta360'
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1A3C34' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

  sheet.mergeCells('A4:G4')
  const subtitleCell = sheet.getCell('A4')
  subtitleCell.value = EVENT.name
  subtitleCell.font = { size: 11, color: { argb: 'FF5A6B62' } }
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' }

  sheet.mergeCells('A5:G5')
  const dateCell = sheet.getCell('A5')
  dateCell.value = `Generado: ${new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(generatedAt)}`
  dateCell.font = { size: 10, color: { argb: 'FF5A6B62' } }
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' }

  sheet.getRow(6).height = 8

  const headerRow = sheet.getRow(7)
  headerRow.values = [
    'Empresa',
    'Nombre de usuario',
    'Cargo',
    'Sector económico / Categoría',
    'Correo electrónico',
    'País',
    'Día de registro en plataforma',
  ]
  headerRow.height = 22
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.border = BORDER_THIN
    cell.alignment = { vertical: 'middle', wrapText: true }
  })

  const sorted = sortParticipantsForExcel(participants)
  sorted.forEach((participant, index) => {
    const row = sheet.getRow(8 + index)
    row.values = [
      participant.organizationName,
      participant.fullName,
      participant.jobTitle,
      participant.sector,
      participant.email,
      participant.country,
      formatParticipantJoinDate(participant.joinedAt),
    ]
    row.eachCell((cell) => {
      cell.border = BORDER_THIN
      cell.alignment = { vertical: 'top', wrapText: true }
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
