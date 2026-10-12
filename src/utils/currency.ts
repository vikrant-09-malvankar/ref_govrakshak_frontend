/**
 * Canonical Indian currency formatters — single source of truth.
 * Replaces 3 independent implementations found in:
 *  - BuyerDashboard.tsx (formatIndianCurrency)
 *  - DashboardOverview.tsx (formatIndianCurrency)
 *  - ReportsDashboard.tsx (Intl.NumberFormat en-IN)
 */

/**
 * Formats a number in Indian short notation (Cr / L / K).
 * @example 12400000 → "₹1.24 Cr"
 * @example 150000   → "₹1.50 L"
 * @example 3500     → "₹3.50 K"
 */
export function formatIndianShort(amount: number | unknown): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return '₹0';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)} L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(2)} K`;
  return `₹${n.toFixed(2)}`;
}

/**
 * Formats using the en-IN locale with full precision.
 * @example 1250000 → "₹12,50,000.00"
 */
export function formatIndianFull(amount: number | unknown): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style:                 'currency',
    currency:              'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Returns a numeric value safely, defaulting to 0 for null/undefined/NaN.
 */
export function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
