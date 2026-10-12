/**
 * Uniform order workflow — shared UI helpers.
 * After superadmin approval the DB stores status "Pending" with approvedBy / approved_at;
 * most dashboards show this as "Approved".
 */

export const ORDER_WORKFLOW_STATUSES = [
  'Pending Approval',
  'Pending',
  'In Progress',
  'Delivered',
  'Completed',
  'Rejected',
  'Cancelled',
] as const;

export type OrderWorkflowStatus = (typeof ORDER_WORKFLOW_STATUSES)[number];

export function isOrderApprovedByAdmin(order: {
  status?: string;
  approvedBy?: string | null;
  approved_by?: string | null;
}): boolean {
  const by = order.approvedBy ?? order.approved_by;
  return Boolean(by && String(by).trim() !== '');
}

/** Buyer, superadmin, seller orders list — human-readable status. */
export function getPublicOrderStatus(order: {
  status?: string;
  approvedBy?: string | null;
  approved_by?: string | null;
}): string {
  const s = String(order.status || '');
  if (s === 'Pending' && isOrderApprovedByAdmin(order)) return 'Approved';
  return s;
}

/** Delivery management table — shows "Pending" once admin approved, before / during batch setup. */
export function getDeliveryManagementOrderStatus(order: {
  status?: string;
  approvedBy?: string | null;
  approved_by?: string | null;
}): string {
  const s = String(order.status || '');
  if (s === 'Pending' && isOrderApprovedByAdmin(order)) return 'Pending';
  if (s === 'Approved') return 'Pending'; // legacy DB
  return getPublicOrderStatus(order);
}

export function isActiveWorkflowStatus(status: string): boolean {
  return !['Completed', 'Rejected', 'Cancelled'].includes(status);
}

export const WORKFLOW_STATUS_ORDER: string[] = [
  'Pending Approval',
  'Approved',
  'Pending',
  'In Progress',
  'Delivered',
  'Completed',
];

export function getStatusColorClass(status: string): string {
  switch (status) {
    case 'Pending Approval':
      return 'bg-yellow-100 text-yellow-800';
    case 'Approved':
      return 'bg-blue-100 text-blue-800';
    case 'Pending':
      return 'bg-slate-100 text-slate-800';
    case 'In Progress':
      return 'bg-orange-100 text-orange-800';
    case 'Delivered':
      return 'bg-green-100 text-green-800';
    case 'Completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'Rejected':
    case 'Cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
