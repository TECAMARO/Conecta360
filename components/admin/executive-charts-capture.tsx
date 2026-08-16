'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export function TagBarChart({
  title,
  data,
}: {
  title: string
  data: { label: string; count: number }[]
}) {
  const chartData = data.slice(0, 8).map((item) => ({
    name: item.label.length > 28 ? `${item.label.slice(0, 28)}…` : item.label,
    count: item.count,
  }))

  return (
    <div className="rounded-2xl border border-[#dde8d8] bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[#1a3c34]">{title}</h3>
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin datos para este filtro.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8ac441" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function ExecutiveChartsPdfCapture({
  sectorData,
  offerData,
  seekData,
}: {
  sectorData: { label: string; count: number }[]
  offerData: { label: string; count: number }[]
  seekData: { label: string; count: number }[]
}) {
  return (
    <div
      style={{
        width: 960,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 16,
        padding: 16,
        background: '#ffffff',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <TagBarChart title="Sector económico" data={sectorData} />
      <TagBarChart title="Qué Ofrece" data={offerData} />
      <TagBarChart title="Qué Busca" data={seekData} />
    </div>
  )
}
