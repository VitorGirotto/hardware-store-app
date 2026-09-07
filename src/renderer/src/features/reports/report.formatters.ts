import type { ReportPeriod } from '../../../../shared/types/reports.types'

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const initialReportPeriod = (): ReportPeriod => {
  const today = new Date()
  return { startDate: localDate(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: localDate(today) }
}
export const formatReportDate = (date: string) => date.split('-').reverse().join('/')
export const formatReportTimestamp = (timestamp: string | null): string => {
  if (!timestamp) return '—'
  // SQLite CURRENT_TIMESTAMP is UTC despite having no explicit zone suffix.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(timestamp) ? timestamp.replace(' ', 'T') + 'Z' : timestamp
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(normalized))
}
export const formatReportQuantity = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 10 }).format(value)
