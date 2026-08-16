import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import type { ExecutiveSnapshot, SlotGridCell } from '@/lib/admin/analytics'
import { formatProcessTimestamp } from '@/lib/admin/activity-feed'
import { MAX_MEETINGS_PER_ORGANIZATION } from '@/lib/admin/constants'

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a3c34',
  },
  headerLogos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    height: 36,
    objectFit: 'contain',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    color: '#1a3c34',
  },
  subtitle: {
    fontSize: 9,
    textAlign: 'center',
    color: '#5a6b62',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#1a3c34',
    borderBottomWidth: 1,
    borderBottomColor: '#8ac441',
    paddingBottom: 4,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  kpiBox: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#dde8d8',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#f8fbf8',
  },
  kpiLabel: { fontSize: 8, color: '#5a6b62' },
  kpiValue: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#eef3ea',
    borderBottomWidth: 1,
    borderBottomColor: '#dde8d8',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eef3eb',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  cellOrg: { width: '22%' },
  cellOrgB: { width: '22%' },
  cellDay: { width: '14%' },
  cellTime: { width: '18%' },
  cellTable: { width: '10%' },
  cellStatus: { width: '14%' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#5a6b62',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#dde8d8',
    paddingTop: 8,
  },
  tagLine: { fontSize: 9, marginBottom: 3 },
  processImage: {
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dde8d8',
    borderRadius: 6,
    objectFit: 'contain',
    maxHeight: 220,
    width: '100%',
  },
  processFallback: {
    borderWidth: 1,
    borderColor: '#dde8d8',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#f8fbf8',
    marginTop: 8,
  },
  slotCellDay: { width: '16%' },
  slotCellTime: { width: '14%' },
  slotCellTable: { width: '10%' },
  slotCellStatus: { width: '14%' },
  slotCellOrgs: { width: '46%' },
  historyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4ee',
    paddingVertical: 2,
    paddingHorizontal: 4,
    paddingLeft: 16,
    backgroundColor: '#fafcfa',
  },
  historyLabel: {
    fontSize: 7,
    color: '#5a6b62',
    fontStyle: 'italic',
  },
  categoryHeading: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#5a6b62',
    marginBottom: 6,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kpiMeta: {
    fontSize: 7,
    color: '#5a6b62',
    marginTop: 2,
  },
  metricTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#eef3ea',
    borderBottomWidth: 1,
    borderBottomColor: '#dde8d8',
    paddingVertical: 3,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  metricTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eef3eb',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  metricColLabel: { width: '52%' },
  metricColValue: { width: '18%', textAlign: 'right' },
  metricColPct: { width: '18%', textAlign: 'right' },
  metricColNote: { width: '12%', textAlign: 'right', fontSize: 8, color: '#5a6b62' },
})

function formatPrintDate(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(iso))
}

const SLOT_STATUS_LABEL: Record<SlotGridCell['status'], string> = {
  scheduled: 'Agendada',
  in_progress: 'En curso',
  completed: 'Completada',
  available: 'Disponible',
  cancelled: 'Cancelada',
}

function formatInteractionTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function SlotGridPdfRows({ cells }: { cells: SlotGridCell[] }) {
  const activeCells = cells.filter((cell) => cell.status !== 'available' || (cell.history?.length ?? 0) > 0)

  if (activeCells.length === 0) {
    return (
      <Text style={{ fontSize: 9, color: '#5a6b62' }}>
        No hay interacciones registradas para los filtros aplicados.
      </Text>
    )
  }

  return (
    <>
      <View style={styles.tableHeader}>
        <Text style={styles.slotCellDay}>Día</Text>
        <Text style={styles.slotCellTime}>Bloque</Text>
        <Text style={styles.slotCellTable}>Mesa</Text>
        <Text style={styles.slotCellStatus}>Estado</Text>
        <Text style={styles.slotCellOrgs}>Organizaciones</Text>
      </View>
      {activeCells.map((cell) => {
        const cellKey = `${cell.slotId}-${cell.tableNumber}`
        const tableLabel = `Mesa ${String(cell.tableNumber).padStart(2, '0')}`

        return (
          <View key={cellKey}>
            <View style={styles.tableRow}>
              <Text style={styles.slotCellDay}>{cell.dayLabel}</Text>
              <Text style={styles.slotCellTime}>{cell.time}</Text>
              <Text style={styles.slotCellTable}>{tableLabel}</Text>
              <Text style={styles.slotCellStatus}>{SLOT_STATUS_LABEL[cell.status]}</Text>
              <Text style={styles.slotCellOrgs}>{cell.organizations ?? '—'}</Text>
            </View>
            {(cell.history ?? []).map((item) => (
              <View key={item.meetingId} style={styles.historyRow}>
                <Text style={styles.slotCellDay}>
                  <Text style={styles.historyLabel}>Anterior · </Text>
                  {formatInteractionTime(item.occurredAt)}
                </Text>
                <Text style={styles.slotCellTime}>{cell.time}</Text>
                <Text style={styles.slotCellTable}>{tableLabel}</Text>
                <Text style={styles.slotCellStatus}>{SLOT_STATUS_LABEL[item.status]}</Text>
                <Text style={styles.slotCellOrgs}>
                  {item.organizations} ({item.statusLabel})
                </Text>
              </View>
            ))}
          </View>
        )
      })}
    </>
  )
}

function KpiMetricBox({
  label,
  value,
  meta,
}: {
  label: string
  value: string
  meta?: string
}) {
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {meta ? <Text style={styles.kpiMeta}>{meta}</Text> : null}
    </View>
  )
}

function SectorConcentrationTable({
  rows,
}: {
  rows: ExecutiveSnapshot['kpis']['sectorMeetingConcentration']
}) {
  if (rows.length === 0) {
    return (
      <Text style={{ fontSize: 8, color: '#5a6b62', marginTop: 4 }}>
        Sin reuniones confirmadas para calcular concentración sectorial.
      </Text>
    )
  }

  return (
    <View>
      <View style={styles.metricTableHeader}>
        <Text style={styles.metricColLabel}>Sector comercial</Text>
        <Text style={styles.metricColValue}>Reuniones</Text>
        <Text style={styles.metricColPct}>Concentración</Text>
        <Text style={styles.metricColNote}>Share</Text>
      </View>
      {rows.slice(0, 10).map((row) => (
        <View key={row.label} style={styles.metricTableRow}>
          <Text style={styles.metricColLabel}>{row.label}</Text>
          <Text style={styles.metricColValue}>{row.count}</Text>
          <Text style={styles.metricColPct}>{row.percentage}%</Text>
          <Text style={styles.metricColNote}>vol.</Text>
        </View>
      ))}
    </View>
  )
}

function DayOccupancyTable({
  rows,
}: {
  rows: ExecutiveSnapshot['kpis']['tableOccupancyByDay']
}) {
  if (rows.length === 0) return null

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 4, color: '#1a3c34' }}>
        Distribución temporal de ocupación
      </Text>
      <View style={styles.metricTableHeader}>
        <Text style={styles.metricColLabel}>Día del evento</Text>
        <Text style={styles.metricColValue}>Mesas usadas</Text>
        <Text style={styles.metricColPct}>Ocupación</Text>
        <Text style={styles.metricColNote}>N</Text>
      </View>
      {rows.map((row) => (
        <View key={row.dayId} style={styles.metricTableRow}>
          <Text style={styles.metricColLabel}>{row.label}</Text>
          <Text style={styles.metricColValue}>
            {row.occupied}/{row.total}
          </Text>
          <Text style={styles.metricColPct}>{row.percentage}%</Text>
          <Text style={styles.metricColNote}>celdas</Text>
        </View>
      ))}
    </View>
  )
}

export function ExecutiveReportDocument({
  snapshot,
  logoUrls,
  lastProcessImage,
}: {
  snapshot: ExecutiveSnapshot
  logoUrls: { logo1: string; logo2: string; logo3: string }
  lastProcessImage?: string
}) {
  const { kpis, offerDistribution, seekDistribution, meetingLedger, latestProcess, slotGrid } =
    snapshot

  const topOffers = offerDistribution.slice(0, 5)
  const topSeeks = seekDistribution.slice(0, 5)
  const ledgerPreview = meetingLedger.slice(0, 80)
  const contactQuality =
    kpis.satisfactionScore != null ? `${kpis.satisfactionScore} / 5` : 'N/D'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerLogos}>
          <Image src={logoUrls.logo1} style={styles.logo} />
          <Image src={logoUrls.logo2} style={styles.logo} />
          <Image src={logoUrls.logo3} style={styles.logo} />
        </View>

        <Text style={styles.title}>
          Informe Ejecutivo y Balance Final de la Rueda de Negocios — Semana Orinoquía
          Sostenible y Competitiva 2026
        </Text>
        <Text style={styles.subtitle}>
          Generado desde Conecta360 Admin Portal · {formatPrintDate(snapshot.generatedAt)}
        </Text>

        <Text style={styles.sectionTitle}>1. Informe Ejecutivo de Impacto</Text>
        <Text style={styles.categoryHeading}>Métricas Clave de Negocio (KPIs de Sector)</Text>

        <View style={styles.kpiRow}>
          <KpiMetricBox
            label="Tasa de Eficiencia de Agendamiento (%)"
            value={`${kpis.executionEfficiencyRate}%`}
            meta={`${kpis.completedSuccess} ejecutadas · ${kpis.scheduledTotal} programadas`}
          />
          <KpiMetricBox
            label="Reuniones agendadas / capacidad logística"
            value={`${kpis.scheduledTotal} / ${kpis.capacityMax}`}
            meta={`Capacidad máxima N = ${kpis.capacityMax}`}
          />
          <KpiMetricBox
            label="Tasa de asistencia efectiva (%)"
            value={`${kpis.attendanceRate}%`}
            meta="Reuniones concretadas vs. confirmadas finalizadas"
          />
          <KpiMetricBox
            label="Ocupación de bloques horarios (%)"
            value={`${kpis.schedulingEfficiency}%`}
            meta="Bloques con al menos una cita activa"
          />
        </View>

        <Text style={{ fontSize: 9, fontWeight: 'bold', marginTop: 8, marginBottom: 4 }}>
          Concentración Sectorial (%)
        </Text>
        <Text style={{ fontSize: 8, color: '#5a6b62', marginBottom: 4 }}>
          Distribución del volumen de reuniones confirmadas por sector comercial de las
          contrapartes.
        </Text>
        <SectorConcentrationTable rows={kpis.sectorMeetingConcentration} />

        <Text style={{ fontSize: 9, marginTop: 10, marginBottom: 3, fontWeight: 'bold' }}>
          Demanda registrada · Qué Ofrece / Qué Busca (top 5)
        </Text>
        {topOffers.map((item) => (
          <Text key={`offer-${item.label}`} style={styles.tagLine}>
            · Ofrece · {item.label}: {item.count}
          </Text>
        ))}
        {topSeeks.map((item) => (
          <Text key={`seek-${item.label}`} style={styles.tagLine}>
            · Busca · {item.label}: {item.count}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Anexo operativo · Último proceso registrado</Text>
        {lastProcessImage ? (
          <Image src={lastProcessImage} style={styles.processImage} />
        ) : latestProcess ? (
          <View style={styles.processFallback}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>
              {latestProcess.title}
            </Text>
            <Text style={{ fontSize: 9, marginBottom: 2 }}>{latestProcess.line1}</Text>
            <Text style={{ fontSize: 9, marginBottom: 4, color: '#5a6b62' }}>
              {latestProcess.line2}
            </Text>
            <Text style={{ fontSize: 8, color: '#5a6b62' }}>
              {latestProcess.statusLabel} · {formatProcessTimestamp(latestProcess.timestamp)}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 9, color: '#5a6b62' }}>
            No hay procesos registrados para los filtros aplicados.
          </Text>
        )}

        <Text style={styles.footer}>
          Documento Confidencial y Oficial generado desde Conecta360 Admin Portal —{' '}
          {formatPrintDate(snapshot.generatedAt)}
        </Text>
      </Page>

      <Page size="A4" style={styles.page} orientation="landscape">
        <Text style={styles.sectionTitle}>2. Matriz de Asistencia y Trazabilidad</Text>
        <Text style={styles.categoryHeading}>Métricas Operativas y Cobertura</Text>

        <View style={styles.kpiRow}>
          <KpiMetricBox
            label={`Total de Reuniones B2B (N = ${kpis.capacityMax})`}
            value={String(kpis.completedSuccess)}
            meta={`${kpis.completedSuccess} sesiones completadas · ${kpis.scheduledTotal} confirmadas`}
          />
          <KpiMetricBox
            label="Volumen de Participación (N)"
            value={`${kpis.participationOrganizations} emp · ${kpis.participationDelegates} del.`}
            meta={`Registro: ${kpis.registeredOrgs}/${kpis.orgLimit} perfiles activos`}
          />
          <KpiMetricBox
            label="Ocupación de Mesas B2B (%)"
            value={`${kpis.tableOccupancyRate}%`}
            meta="Uso de celdas día × bloque × mesa (estado actual)"
          />
          <KpiMetricBox
            label="Reuniones canceladas / pendientes"
            value={`${kpis.cancelledTotal} / ${kpis.pendingTotal}`}
            meta="Bitácora operativa del periodo filtrado"
          />
        </View>

        <DayOccupancyTable rows={kpis.tableOccupancyByDay} />

        <Text style={{ fontSize: 9, fontWeight: 'bold', marginTop: 10, marginBottom: 6 }}>
          Bitácora consolidada
        </Text>
        <Text style={{ fontSize: 8, marginBottom: 6, color: '#5a6b62' }}>
          {meetingLedger.length} reuniones registradas
          {meetingLedger.length > ledgerPreview.length
            ? ` · mostrando ${ledgerPreview.length} primeras`
            : ''}
        </Text>
        <View style={styles.tableHeader}>
          <Text style={styles.cellOrg}>Organización A</Text>
          <Text style={styles.cellOrgB}>Organización B</Text>
          <Text style={styles.cellDay}>Fecha</Text>
          <Text style={styles.cellTime}>Hora</Text>
          <Text style={styles.cellTable}>Mesa</Text>
          <Text style={styles.cellStatus}>Estado</Text>
        </View>
        {ledgerPreview.map((row) => (
          <View key={row.id} style={styles.tableRow}>
            <Text style={styles.cellOrg}>{row.orgA}</Text>
            <Text style={styles.cellOrgB}>{row.orgB}</Text>
            <Text style={styles.cellDay}>{row.day}</Text>
            <Text style={styles.cellTime}>{row.time}</Text>
            <Text style={styles.cellTable}>{row.table}</Text>
            <Text style={styles.cellStatus}>{row.status}</Text>
          </View>
        ))}
        <Text style={styles.footer}>
          Documento Confidencial y Oficial — Conecta360 Admin Portal
        </Text>
      </Page>

      <Page size="A4" style={styles.page} orientation="landscape">
        <Text style={styles.sectionTitle}>2.1 Mapeo de Mesas B2B · Estado actual e historial</Text>
        <Text style={{ fontSize: 8, marginBottom: 8, color: '#5a6b62' }}>
          Cada fila muestra la interacción más reciente por día, bloque y mesa. Las filas
          indentadas listan interacciones anteriores en el mismo espacio, de más reciente a más
          antigua.
        </Text>
        <SlotGridPdfRows cells={slotGrid} />
        <Text style={styles.footer}>
          Documento Confidencial y Oficial — Conecta360 Admin Portal
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>3. Reporte de Satisfacción y Percepción</Text>
        <Text style={styles.categoryHeading}>
          Métricas de Percepción y Calidad (NPS / CSAT)
        </Text>

        <View style={styles.kpiRow}>
          <KpiMetricBox
            label="Índice de Calidad del Contacto (Escala 1–5)"
            value={contactQuality}
            meta={`${kpis.satisfactionResponses} evaluaciones válidas · check-in Mi Agenda`}
          />
          <KpiMetricBox
            label="CSAT del Agendamiento (%)"
            value={`${kpis.schedulingCsat}%`}
            meta="Empresarios con expectativa alta o media de vinculación"
          />
          <KpiMetricBox
            label="Tasa de respuesta al check-in (%)"
            value={`${kpis.checkInResponseRate}%`}
            meta={`${kpis.checkInSubmitted}/${kpis.checkInEligible} reuniones finalizadas`}
          />
          <KpiMetricBox
            label="Índice de intenciones de vinculación (%)"
            value={`${kpis.allianceIndex}%`}
            meta="Alineado con CSAT · expectativas comerciales positivas"
          />
        </View>

        <View style={{ marginTop: 12, gap: 4 }}>
          <Text style={{ fontSize: 8, color: '#5a6b62' }}>
            · Índice de Calidad del Contacto: promedio 1–5 derivado de expectativa de alianza
            post-reunión (alta=5, media=4, baja=2, sin interés=1).
          </Text>
          <Text style={{ fontSize: 8, color: '#5a6b62' }}>
            · CSAT del Agendamiento: % de check-ins con percepción favorable del encuentro
            comercial asignado.
          </Text>
          <Text style={{ fontSize: 8, color: '#5a6b62' }}>
            · Promedio citas por empresa: {kpis.avgMeetingsPerOrg} (máx.{' '}
            {MAX_MEETINGS_PER_ORGANIZATION}).
          </Text>
        </View>

        <Text style={styles.footer}>
          Documento Confidencial y Oficial generado desde Conecta360 Admin Portal —{' '}
          {formatPrintDate(snapshot.generatedAt)}
        </Text>
      </Page>
    </Document>
  )
}
