import { z } from 'zod'
import { reportPeriodSchema, salesReportSchema } from '../../shared/schemas/reports.schema'
import type { CashRegisterReportRow, LowStockReportRow, ReportPeriod, TopProductReportRow, ReportResponse, SalesReport } from '../../shared/types/reports.types'
import * as repository from '../repositories/reports.repository'

const run = <I, O>(schema: z.ZodType<I>, input: unknown, query: (filters: I) => O): ReportResponse<O> => {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Filtros do relatório inválidos.', issues: parsed.error.issues.map((issue) => issue.message) }
  try { return { success: true, data: query(parsed.data) } }
  catch { return { success: false, error: 'Não foi possível gerar o relatório. Tente novamente.' } }
}
export const sales = (input: unknown): ReportResponse<SalesReport> => run(salesReportSchema, input, repository.salesReport)

export const topProducts = (input: unknown): ReportResponse<TopProductReportRow[]> => run<ReportPeriod, TopProductReportRow[]>(reportPeriodSchema, input, repository.topProductsReport)

export const lowStock = (): ReportResponse<LowStockReportRow[]> => run(z.undefined(), undefined, repository.lowStockReport)
export const cashRegisters = (input: unknown): ReportResponse<CashRegisterReportRow[]> => run(reportPeriodSchema, input, repository.cashRegistersReport)
