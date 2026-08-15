import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import type { ExecutiveSnapshot } from '@/lib/admin/analytics'
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
})

function formatPrintDate(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(iso))
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
  const { kpis, sectorDistribution, offerDistribution, seekDistribution, meetingLedger, latestProcess } =
    snapshot

  const topOffers = offerDistribution.slice(0, 6)
  const topSeeks = seekDistribution.slice(0, 6)
  const topSectors = sectorDistribution.slice(0, 8)
  const ledgerPreview = meetingLedger.slice(0, 80)

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
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Reuniones agendadas / capacidad</Text>
            <Text style={styles.kpiValue}>
              {kpis.scheduledTotal} / {kpis.capacityMax}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Efectividad global (asistencia)</Text>
            <Text style={styles.kpiValue}>{kpis.attendanceRate}%</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Índice intenciones de vinculación</Text>
            <Text style={styles.kpiValue}>{kpis.allianceIndex}%</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Eficiencia de agendamiento (bloques)</Text>
            <Text style={styles.kpiValue}>{kpis.schedulingEfficiency}%</Text>
          </View>
        </View>

        <Text style={{ fontSize: 9, marginBottom: 4, fontWeight: 'bold' }}>Sector Económico</Text>
        {topSectors.map((item) => (
          <Text key={item.label} style={styles.tagLine}>
            · {item.label}: {item.count} organizaciones
          </Text>
        ))}

        <Text style={{ fontSize: 9, marginTop: 8, marginBottom: 4, fontWeight: 'bold' }}>
          Qué Ofrece (top demanda)
        </Text>
        {topOffers.map((item) => (
          <Text key={item.label} style={styles.tagLine}>
            · {item.label}: {item.count}
          </Text>
        ))}

        <Text style={{ fontSize: 9, marginTop: 8, marginBottom: 4, fontWeight: 'bold' }}>
          Qué Busca (top demanda)
        </Text>
        {topSeeks.map((item) => (
          <Text key={item.label} style={styles.tagLine}>
            · {item.label}: {item.count}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>4. Visor rápido · Último proceso operativo</Text>
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
        <Text style={{ fontSize: 8, marginBottom: 8, color: '#5a6b62' }}>
          Bitácora consolidada ({meetingLedger.length} reuniones registradas
          {meetingLedger.length > ledgerPreview.length
            ? ` · mostrando ${ledgerPreview.length} primeras`
            : ''}
          )
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

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>3. Reporte de Satisfacción y Percepción</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Nivel promedio de satisfacción (Check-in Mi Agenda)</Text>
            <Text style={styles.kpiValue}>
              {kpis.satisfactionScore != null ? `${kpis.satisfactionScore} ⭐` : 'N/D'}
            </Text>
            <Text style={{ fontSize: 7, color: '#5a6b62', marginTop: 2 }}>
              {kpis.checkInSubmitted}/{kpis.checkInEligible} check-ins ({kpis.checkInResponseRate}%
              respuesta) · {kpis.satisfactionResponses} con expectativa · escala 1–5
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Organizaciones registradas</Text>
            <Text style={styles.kpiValue}>
              {kpis.registeredOrgs} / {kpis.orgLimit}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Promedio citas por empresa</Text>
            <Text style={styles.kpiValue}>
              {kpis.avgMeetingsPerOrg} (máx. {MAX_MEETINGS_PER_ORGANIZATION})
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Completadas con éxito</Text>
            <Text style={styles.kpiValue}>{kpis.completedSuccess}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 9, marginTop: 12, lineHeight: 1.5 }}>
          La satisfacción promedio proviene del módulo &quot;Registrar resultado / Check-in&quot; en
          Mi Agenda. Solo cuentan evaluaciones con reunión concretada y expectativa de alianza
          registrada ({kpis.satisfactionResponses} respuestas válidas). Tasa de respuesta al
          cuestionario: {kpis.checkInSubmitted} de {kpis.checkInEligible} reuniones finalizadas (
          {kpis.checkInResponseRate}%). El índice de intenciones de vinculación (
          {kpis.allianceIndex}%) refleja evaluaciones con expectativa alta o media. La tasa de
          asistencia efectiva ({kpis.attendanceRate}%) se calcula sobre reuniones confirmadas ya
          finalizadas.
        </Text>

        <Text style={styles.footer}>
          Documento Confidencial y Oficial generado desde Conecta360 Admin Portal —{' '}
          {formatPrintDate(snapshot.generatedAt)}
        </Text>
      </Page>
    </Document>
  )
}
