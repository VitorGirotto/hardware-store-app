import { z } from 'zod'
import { PAYMENT_METHODS } from '../constants/sales.constants'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.').refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, 'Informe uma data válida.')
const fields = { startDate: date, endDate: date }
const ordered = (value: { startDate: string; endDate: string }) => value.startDate <= value.endDate
const orderError = { message: 'A data final deve ser igual ou posterior à inicial.', path: ['endDate'] }
export const reportPeriodSchema = z.object(fields).strict().refine(ordered, orderError)
export const salesReportSchema = z.object({ ...fields, paymentMethod: z.enum(PAYMENT_METHODS).optional() }).strict().refine(ordered, orderError)

// Construct local midnights separately so DST days need not contain 24 hours.
export const reportBounds = (period: { startDate: string; endDate: string }) => {
  const start = new Date(`${period.startDate}T00:00:00`)
  const end = new Date(`${period.endDate}T00:00:00`)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}
