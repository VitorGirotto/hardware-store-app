import type { ReportPeriod, SalesReportFilters } from '../../../../shared/types/reports.types'

export const reportsApi = {
  sales: (filters: SalesReportFilters) => window.hardwareStore.reports.sales(filters),
  topProducts: (filters: ReportPeriod) => window.hardwareStore.reports.topProducts(filters),
  lowStock: () => window.hardwareStore.reports.lowStock(),
  cashRegisters: (filters: ReportPeriod) => window.hardwareStore.reports.cashRegisters(filters)
}
