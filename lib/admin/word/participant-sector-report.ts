import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { EVENT } from '@/lib/event-config'
import {
  formatParticipantJoinDate,
  groupParticipantsBySector,
  type ParticipantReportRow,
} from '@/lib/admin/participant-reports'
import type { ReportLogoBuffers } from '@/lib/admin/report-assets'

function logoParagraph(data: Buffer): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        type: 'png',
        data,
        transformation: { width: 110, height: 44 },
      }),
    ],
  })
}

function logosHeaderTable(logos: ReportLogoBuffers): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            children: [logoParagraph(logos.logo1)],
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            children: [logoParagraph(logos.logo2)],
          }),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            children: [logoParagraph(logos.logo3)],
          }),
        ],
      }),
    ],
  })
}

function participantLines(participants: ParticipantReportRow[]): Paragraph[] {
  if (participants.length === 0) {
    return [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: 'Sin participantes registrados en este sector.',
            italics: true,
            color: '666666',
            size: 20,
          }),
        ],
      }),
    ]
  }

  return participants.flatMap((participant, index) => [
    new Paragraph({
      spacing: { before: index === 0 ? 80 : 40, after: 40 },
      children: [
        new TextRun({ text: `${index + 1}. `, bold: true, size: 22 }),
        new TextRun({ text: 'Empresa: ', bold: true, size: 22 }),
        new TextRun({ text: participant.organizationName, size: 22 }),
      ],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 20 },
      children: [
        new TextRun({ text: 'Correo electrónico: ', bold: true, size: 20 }),
        new TextRun({ text: participant.email, size: 20 }),
      ],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 20 },
      children: [
        new TextRun({ text: 'Nombre del delegado: ', bold: true, size: 20 }),
        new TextRun({ text: participant.fullName, size: 20 }),
      ],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Registro en plataforma: ', bold: true, size: 20 }),
        new TextRun({ text: formatParticipantJoinDate(participant.joinedAt), size: 20 }),
      ],
    }),
  ])
}

export async function buildParticipantSectorWordReport(
  participants: ParticipantReportRow[],
  logos: ReportLogoBuffers,
  generatedAt = new Date(),
): Promise<Buffer> {
  const groups = groupParticipantsBySector(participants)
  const generatedLabel = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(generatedAt)

  const children: (Paragraph | Table)[] = [
    logosHeaderTable(logos),
    new Paragraph({ spacing: { after: 200 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'Directorio Oficial de Participantes por Sector Económico',
          bold: true,
          size: 32,
          color: '1A3C34',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `${EVENT.name} · Conecta360 Admin Portal`,
          size: 22,
          color: '5A6B62',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: `Generado: ${generatedLabel}`,
          size: 20,
          color: '5A6B62',
        }),
      ],
    }),
  ]

  for (const group of groups) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: group.sector,
            bold: true,
            size: 26,
            color: '1A3C34',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `${group.participants.length} participante(s)`,
            size: 20,
            color: '5A6B62',
          }),
        ],
      }),
      ...participantLines(group.participants),
    )
  }

  children.push(
    new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Documento confidencial y oficial — Conecta360 Admin Portal',
          italics: true,
          size: 18,
          color: '5A6B62',
        }),
      ],
    }),
  )

  const doc = new Document({
    sections: [{ properties: {}, children }],
  })

  return Packer.toBuffer(doc)
}
